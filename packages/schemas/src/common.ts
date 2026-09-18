import { z } from 'zod';

/**
 * Motif d'un montant décimal sérialisé, tel que renvoyé par PostgREST pour
 * une colonne `numeric` lue en `::text` (DATA_MODEL, conventions ; ADR-005)
 * — ex. `"-17527.71000000"`, `"200000"`. Signe optionnel, chiffres, point
 * décimal optionnel — jamais de notation scientifique, de séparateur de
 * milliers ni d'espace.
 *
 * Source unique de vérité pour ce motif : réutilisé tel quel par
 * `@repo/core` (`parseAmount`) pour éviter toute divergence entre la
 * validation des schémas et le parsing des calculs.
 */
export const AMOUNT_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Chaîne décimale telle que renvoyée par PostgREST pour une colonne
 * `numeric` lue en `::text` (DATA_MODEL, conventions ; ADR-005) —
 * ex. `"-17527.71000000"`, `"200000"`. Signe optionnel, un point décimal
 * optionnel, jamais de notation scientifique ni de séparateur de milliers.
 * À convertir en `Decimal` via `@repo/core` `parseAmount`, jamais en
 * `number`.
 */
export const amountString = z
  .string()
  .regex(
    AMOUNT_STRING_PATTERN,
    'Montant invalide : attendu une chaîne décimale (ex. "-17527.71").',
  );

/**
 * Code devise ISO 4217 (3 lettres majuscules), `USDT` toléré en plus
 * (DATA_MODEL, conventions : « devises : `char(3)` (ISO 4217, `USDT`
 * toléré via `text` si besoin) »).
 */
export const currencyCode = z.union([
  z.string().regex(/^[A-Z]{3}$/, 'Code devise ISO 4217 invalide (3 lettres majuscules attendues).'),
  z.literal('USDT'),
]);

/** Identifiant UUID (clés primaires, DATA_MODEL conventions). */
export const uuid = z.uuid();

/**
 * Jour de trading `YYYY-MM-DD` (calendrier local du compte), tel que
 * produit par `@repo/core` `tradingDayOf` et stocké dans
 * `trades.trading_day` / `daily_stats.trading_day`.
 */
export const tradingDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Jour de trading invalide : attendu "YYYY-MM-DD".');
