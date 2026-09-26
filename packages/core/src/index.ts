/**
 * `@repo/core` — logique métier pure d'Edgebook (ARCHITECTURE §4, §5).
 *
 * Fonctions pures uniquement : pas d'I/O, pas de réseau, pas de dépendance à
 * React/Supabase/Hono (CLAUDE.md). Dépendances autorisées : `decimal.js`,
 * `date-fns`, `date-fns-tz`, `@repo/schemas`.
 */

export * from './aggregates/index';
export * from './format/index';
export * from './money/index';
export * from './stats/index';
export * from './time/index';
export * from './trading/index';
