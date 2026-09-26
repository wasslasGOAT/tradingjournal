/**
 * Lecture et validation des variables `VITE_SUPABASE_*` (W-2, ADR-016/020/023).
 *
 * Copié depuis `apps/app/lib/supabase/env.ts` (apps/app est gelé, ADR-023 —
 * jamais importé depuis `apps/web`) et adapté au préfixe `VITE_*` (Vite
 * remplace statiquement `import.meta.env.VITE_*` au moment du build, voir doc
 * Vite « Env Variables »).
 *
 * Ne lève jamais d'exception : l'app ne doit pas planter en écran blanc quand
 * `apps/web/.env` est absent (CLAUDE.md, ADR-017). Le résultat `missing-env`
 * (variable(s) absente(s) ou laissée(s) à sa valeur d'exemple) ou
 * `invalid-env` (variable(s) présente(s) mais mal formée(s)) permet à l'UI
 * d'afficher un état d'erreur explicite et localisé dans chaque cas.
 */

export type SupabaseEnvField = 'url' | 'anonKey';

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export type SupabaseEnvInvalidIssue =
  { field: 'url'; code: 'invalid-url' } | { field: 'anonKey'; code: 'secret-key' };

export type SupabaseEnvResult =
  | { ok: true; env: SupabaseEnv }
  | { ok: false; missing: SupabaseEnvField[] }
  | { ok: false; invalid: SupabaseEnvInvalidIssue[] };

/**
 * Détecte les valeurs d'exemple laissées telles quelles depuis
 * `apps/web/.env.example` (`https://xxxxxxxxxxxx.supabase.co`,
 * `sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx`) : une suite de 6 `x`/`X` ou plus
 * n'a aucune raison d'apparaître dans une vraie URL ou clé Supabase.
 */
const PLACEHOLDER_PATTERN = /x{6,}/i;

/** Préfixe du nouveau format de clé secrète Supabase, jamais embarquée côté client. */
const SECRET_KEY_PREFIX = 'sb_secret_';

function isUsableValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && !PLACEHOLDER_PATTERN.test(value);
}

/**
 * `new URL()` valide déjà le format général ; on exige en plus `https:`, sauf
 * pour `localhost`/`127.0.0.1` (Supabase local, servi en `http:`).
 */
function isValidSupabaseUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (isLocalHost) return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  return parsed.protocol === 'https:';
}

export function parseSupabaseEnv(
  rawUrl: string | undefined,
  rawAnonKey: string | undefined,
): SupabaseEnvResult {
  const trimmedUrl = rawUrl?.trim();
  const trimmedAnonKey = rawAnonKey?.trim();

  if (!isUsableValue(trimmedUrl) || !isUsableValue(trimmedAnonKey)) {
    const missing: SupabaseEnvField[] = [];
    if (!isUsableValue(trimmedUrl)) missing.push('url');
    if (!isUsableValue(trimmedAnonKey)) missing.push('anonKey');
    return { ok: false, missing };
  }

  const invalid: SupabaseEnvInvalidIssue[] = [];
  if (!isValidSupabaseUrl(trimmedUrl)) invalid.push({ field: 'url', code: 'invalid-url' });
  if (trimmedAnonKey.startsWith(SECRET_KEY_PREFIX)) {
    invalid.push({ field: 'anonKey', code: 'secret-key' });
  }
  if (invalid.length > 0) return { ok: false, invalid };

  return { ok: true, env: { url: trimmedUrl, anonKey: trimmedAnonKey } };
}
