import type { Database } from '@repo/db';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { parseSupabaseEnv } from './env';
import type { SupabaseEnvField, SupabaseEnvInvalidIssue } from './env';

export type SupabaseClientState =
  | { status: 'ready'; client: SupabaseClient<Database> }
  | { status: 'missing-env'; missing: SupabaseEnvField[] }
  | { status: 'invalid-env'; invalid: SupabaseEnvInvalidIssue[] };

let cachedState: SupabaseClientState | undefined;

/**
 * Client Supabase typé (`@repo/db`), mémoïsé, créé à partir des variables
 * `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (ADR-016/020/023).
 *
 * Session persistée dans `localStorage` (ARCHITECTURE §9 : le chiffrement
 * SecureStore/AES-GCM d'`apps/app` n'est pas porté sur le web, stockage
 * sécurisé natif choisi en P6 via un plugin Capacitor). PKCE + détection de
 * session dans l'URL : câblées en M2-9 (liste blanche des routes de retour) ;
 * `detectSessionInUrl: false` ici, aucun flux d'auth ne redirige encore vers
 * l'app pendant W-2.
 *
 * Ne lève jamais d'exception : si la configuration est absente ou laissée à
 * sa valeur d'exemple (`apps/web/.env.example`), renvoie `{ status:
 * 'missing-env' }` ; si elle est présente mais mal formée, renvoie `{ status:
 * 'invalid-env' }`. Dans les deux cas, l'UI affiche un état d'erreur explicite
 * et localisé plutôt qu'un écran blanc (CLAUDE.md, ADR-017).
 */
export function getSupabaseClientState(): SupabaseClientState {
  if (cachedState) return cachedState;

  const envResult = parseSupabaseEnv(
    import.meta.env.VITE_SUPABASE_URL as string | undefined,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
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
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    });
    cachedState = { status: 'ready', client };
  } catch {
    cachedState = { status: 'invalid-env', invalid: [{ field: 'url', code: 'invalid-url' }] };
  }

  return cachedState;
}
