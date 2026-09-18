import type { Database } from '@repo/db';
import { createClient, processLock } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { authStorage } from './authStorage';
import { parseSupabaseEnv } from './env';
import type { SupabaseEnvField, SupabaseEnvInvalidIssue } from './env';

export type SupabaseClientState =
  | { status: 'ready'; client: SupabaseClient<Database> }
  | { status: 'missing-env'; missing: SupabaseEnvField[] }
  | { status: 'invalid-env'; invalid: SupabaseEnvInvalidIssue[] };

let cachedState: SupabaseClientState | undefined;

/**
 * Client Supabase typé (`@repo/db`), mémoïsé, créé à partir des variables
 * `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ADR-016/020).
 *
 * Accès direct à `process.env.EXPO_PUBLIC_*` ici (et nulle part ailleurs) : Metro
 * remplace statiquement ce motif exact au moment du bundle (doc Expo
 * « Environment variables »), sur web comme en natif.
 *
 * Ne lève jamais d'exception : si la configuration est absente ou laissée à sa
 * valeur d'exemple (`apps/app/.env.example`), renvoie `{ status: 'missing-env' }`
 * ; si elle est présente mais mal formée (URL invalide, clé secrète — correctif
 * revue M0, Mineur 9), renvoie `{ status: 'invalid-env' }` — jamais confondu
 * avec `missing-env`, qui laisserait croire à tort qu'aucune valeur n'a été
 * saisie. Dans les deux cas, l'UI affiche un état d'erreur explicite et
 * localisé plutôt qu'un écran blanc (CLAUDE.md, ADR-017). `createClient`
 * elle-même ne devrait jamais lancer pour une URL/clé déjà validées par
 * `parseSupabaseEnv`, mais le `try/catch` couvre ce cas par défense en
 * profondeur (mappé sur `invalid-env`, plus fidèle que `missing-env` puisque la
 * configuration était bien présente et validée jusque-là).
 */
export function getSupabaseClientState(): SupabaseClientState {
  if (cachedState) return cachedState;

  const envResult = parseSupabaseEnv(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!envResult.ok) {
    cachedState =
      'missing' in envResult
        ? { status: 'missing-env', missing: envResult.missing }
        : { status: 'invalid-env', invalid: envResult.invalid };
    return cachedState;
  }

  try {
    const client = createClient<Database>(envResult.env.url, envResult.env.anonKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        // PKCE explicite (recommandation Supabase pour mobile/SSR ; correctif
        // audit sécurité M0-S3) : évite de dépendre du flow implicite par défaut,
        // qui expose access/refresh token dans l'URL de redirection.
        flowType: 'pkce',
        // M2: activer `true` sur web une fois l'auth (magic link / OAuth)
        // implémentée, pour laisser `supabase-js` consommer le `code` PKCE
        // présent dans l'URL de redirection au retour du provider. Laissé à
        // `false` en M0 : aucun flux d'auth ne redirige encore vers l'app, donc
        // aucune URL à analyser — l'activer plus tôt n'aurait aucun effet utile
        // et ajouterait une lecture d'URL non nécessaire.
        detectSessionInUrl: false,
        // Correctif revue M0 — Important 4 : React Native n'a pas
        // `navigator.locks`, donc sans `lock` explicite, `supabase-js` (depuis
        // la coordination "lockless" par défaut, `@supabase/auth-js` >=
        // 2.107) ne sérialise plus les opérations d'auth entre elles côté
        // client. `authStorage.native.ts` lit le texte chiffré puis la clé en
        // deux appels non atomiques (`AsyncStorage`/`SecureStore` séparés) :
        // sans sérialisation, un rafraîchissement de jeton concurrent peut
        // s'intercaler entre les deux lectures et faire échouer
        // l'authentification GCM sur un mélange ancien texte/nouvelle clé.
        // `processLock` restaure la sérialisation historique (mode `lock`
        // explicite, dépréciée mais toujours honorée en v2, voir
        // `@supabase/auth-js/migrations/lockless-coordination.md`) pour cette
        // app. `authStorage.native.ts` garde en complément une purge
        // conditionnelle (défense en profondeur) pour le résidu de fenêtre de
        // course que `lock` ne couvrirait pas.
        // TODO(supabase-js v3) : `lock` est `@deprecated` dans `@supabase/auth-js`
        // et disparaîtra en v3 — à la montée de version, revalider si la
        // coordination lockless (ou son remplaçant v3) couvre toujours la course
        // décrite ci-dessus avant de retirer cette option.
        lock: processLock,
      },
    });
    cachedState = { status: 'ready', client };
  } catch {
    cachedState = { status: 'invalid-env', invalid: [{ field: 'url', code: 'invalid-url' }] };
  }

  return cachedState;
}
