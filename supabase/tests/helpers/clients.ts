// Fabrique de clients Supabase pour les tests RLS (`pnpm test:rls`).
//
// Toujours la clé **anon** — jamais `service_role` (CLAUDE.md, ARCHITECTURE §9,
// ADR-020) : ces tests prouvent ce qu'un utilisateur final peut faire via l'API
// publique, pas ce qu'un rôle d'administration peut faire.
//
// Import relatif (et non `@repo/db`) : `supabase/tests` n'est pas un package du
// workspace pnpm (`pnpm-workspace.yaml` ne liste que `apps/*` et `packages/*`),
// donc `@repo/db` n'y est pas résolvable via node_modules sans dépendance
// supplémentaire. On réutilise directement le type généré.
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../packages/db/src/database.types';

/**
 * Lit une variable d'environnement requise, avec un message d'erreur explicite
 * (et non une exception générique) si elle est absente — voir
 * `supabase/tests/.env.example` / `supabase/tests/README.md`.
 */
export function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        'Copier supabase/tests/.env.example vers supabase/tests/.env et la renseigner ' +
        '(voir supabase/tests/README.md).',
    );
  }
  return value;
}

/**
 * Client Supabase non authentifié, clé anon uniquement.
 */
export function createAnonClient(): SupabaseClient<Database> {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');

  return createClient<Database>(url, anonKey, {
    auth: {
      // Environnement Node sans stockage persistant, et chaque test crée ses
      // propres utilisateurs : pas besoin de persister ni de rafraîchir en tâche
      // de fond (évite aussi de garder le process Vitest en vie inutilement).
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function randomPassword(): string {
  // Mot de passe fort aléatoire : au-delà de `minimum_password_length` (config.toml,
  // 6 caractères en local) et suffisant pour la politique par défaut d'un projet
  // cloud. Préfixe garantissant lettres majuscule/minuscule/chiffre/symbole même
  // si l'UUID généré n'en contenait pas par hasard.
  return `Ab1!${crypto.randomUUID().replace(/-/g, '')}`;
}

function randomTestEmail(label: string): string {
  // Unique par exécution : deux lancements successifs de `pnpm test:rls` ne se
  // percutent jamais, même sur le même projet Supabase.
  return `edgebook-rls-test-${label}-${crypto.randomUUID()}@example.com`;
}

export interface TestUser {
  /** Client authentifié comme cet utilisateur (clé anon + session utilisateur). */
  client: SupabaseClient<Database>;
  email: string;
  userId: string;
}

/**
 * Crée un nouvel utilisateur de test via `auth.signUp` (clé anon) et retourne un
 * client authentifié comme lui. Nécessite la confirmation d'e-mail désactivée
 * sur le projet cible (voir supabase/tests/README.md) pour obtenir une session
 * immédiatement ; à défaut, retente une connexion explicite.
 */
async function signUpTestUser(label: string): Promise<TestUser> {
  const client = createAnonClient();
  const email = randomTestEmail(label);
  const password = randomPassword();

  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.user) {
    throw new Error(
      `Échec de l'inscription de l'utilisateur de test RLS "${label}" (${email}) : ` +
        `${error?.message ?? 'aucun utilisateur retourné'}. Vérifier que la confirmation ` +
        "d'e-mail est désactivée sur le projet cible (supabase/tests/README.md).",
    );
  }

  if (!data.session) {
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(
        `Inscription réussie mais connexion impossible pour l'utilisateur de test RLS "${label}" ` +
          `(${email}) : ${signInError.message}. Vérifier que la confirmation d'e-mail est ` +
          'désactivée sur le projet cible (supabase/tests/README.md).',
      );
    }
  }

  return { client, email, userId: data.user.id };
}

/**
 * Crée deux utilisateurs de test distincts (A et B) et retourne un client
 * authentifié pour chacun — le duo standard des tests RLS (« B ne peut ni lire
 * ni modifier les lignes de A »).
 */
export async function createTestUserPair(): Promise<{ userA: TestUser; userB: TestUser }> {
  const [userA, userB] = await Promise.all([signUpTestUser('a'), signUpTestUser('b')]);
  return { userA, userB };
}
