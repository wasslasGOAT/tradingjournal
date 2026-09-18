import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Détermine, côté process Playwright, si `apps/app/.env` contient une
 * configuration Supabase utilisable — pour décider si le test « rempli »
 * (T10) peut s'exécuter ou doit être ignoré avec une raison explicite.
 *
 * Reflète la même heuristique que `apps/app/lib/supabase/env.ts`
 * (`parseSupabaseEnv`) : une valeur absente, vide, ou contenant une suite de
 * 6 `x`/`X` ou plus (motif laissé par `.env.example`) est considérée comme
 * « non configurée ». Le serveur de dev Expo (`playwright.config.ts`) charge
 * ce même `apps/app/.env` au démarrage : les deux lectures restent cohérentes.
 */

const ENV_FILE_PATH = path.resolve(__dirname, '../../.env');
const PLACEHOLDER_PATTERN = /x{6,}/i;

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    result[line.slice(0, eqIndex).trim()] = line.slice(eqIndex + 1).trim();
  }
  return result;
}

function isUsable(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && !PLACEHOLDER_PATTERN.test(value);
}

export interface SupabaseDevEnvStatus {
  configured: boolean;
  /** Raison lisible passée à `test.skip` quand `configured` est `false`. */
  reason: string;
}

export function getSupabaseDevEnvStatus(): SupabaseDevEnvStatus {
  const fileEnv = parseEnvFile(ENV_FILE_PATH);
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnv.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (isUsable(url) && isUsable(anonKey)) {
    return { configured: true, reason: '' };
  }

  return {
    configured: false,
    reason:
      "apps/app/.env est absent ou laissé aux valeurs d'exemple " +
      '(EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY) : voir apps/app/README.md ' +
      "pour lier un projet Supabase cloud de dev (ADR-020) avant que ce test puisse s'exécuter.",
  };
}
