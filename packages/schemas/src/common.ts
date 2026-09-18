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
 * Motif d'un code devise ISO 4217 (3 lettres majuscules) ou `USDT`
 * (DATA_MODEL, conventions : « devises : `char(3)` (ISO 4217, `USDT`
 * toléré via `text` si besoin) »).
 *
 * Source unique de vérité pour ce motif : réutilisé tel quel par
 * `@repo/core` (type `Money`) pour éviter toute divergence entre la
 * validation des schémas et les calculs.
 */
export const CURRENCY_CODE_PATTERN = /^([A-Z]{3}|USDT)$/;

/**
 * Code devise ISO 4217 (3 lettres majuscules), `USDT` toléré en plus
 * (DATA_MODEL, conventions : « devises : `char(3)` (ISO 4217, `USDT`
 * toléré via `text` si besoin) »).
 */
export const currencyCode = z
  .string()
  .regex(CURRENCY_CODE_PATTERN, 'Code devise ISO 4217 invalide (3 lettres majuscules attendues).');

/**
 * Teste le signe d'une {@link amountString} **sans conversion en `number`**
 * (ADR-005/CLAUDE.md : jamais de flottant pour l'argent, y compris dans une
 * simple validation de formulaire) — comparaison purement textuelle sur le
 * motif déjà garanti par {@link AMOUNT_STRING_PATTERN} (signe optionnel,
 * chiffres, point décimal optionnel).
 *
 * @param value chaîne déjà conforme à {@link AMOUNT_STRING_PATTERN} (sinon le résultat n'est pas garanti)
 */
function isZeroAmountString(value: string): boolean {
  return /^-?0+(\.0+)?$/.test(value);
}

/** `true` si `value` représente un montant strictement positif (> 0), sans conversion en `number`. */
export function isPositiveAmountString(value: string): boolean {
  return !value.startsWith('-') && !isZeroAmountString(value);
}

/** `true` si `value` représente un montant positif ou nul (>= 0), sans conversion en `number`. */
export function isNonNegativeAmountString(value: string): boolean {
  return !value.startsWith('-') || isZeroAmountString(value);
}

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
