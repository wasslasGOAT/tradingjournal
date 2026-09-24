import { z } from 'zod';

/**
 * Clés i18n des messages de validation portés par `@repo/schemas` (revue M3
 * #2 : un schéma ne doit jamais écrire de texte d'interface en dur —
 * CLAUDE.md « Aucun texte UI en dur hors fichiers de traduction »). Chaque
 * schéma passe une de ces clés en `message`/second argument de `.refine`,
 * jamais une phrase française — c'est à `packages/i18n` (M2/M4) de fournir
 * la traduction FR/EN de chaque clé.
 *
 * Exportée en constante typée pour que l'UI puisse vérifier à la compilation
 * qu'elle traduit bien toutes les clés (ex. `Record<ValidationKey, string>`).
 */
export const VALIDATION_KEYS = {
  AMOUNT_INVALID: 'validation.amount.invalid',
  AMOUNT_SCALE_EXCEEDED: 'validation.amount.scaleExceeded',
  QUANTITY_SCALE_EXCEEDED: 'validation.quantity.scaleExceeded',
  CURRENCY_INVALID: 'validation.currency.invalid',
  TRADING_DAY_INVALID: 'validation.tradingDay.invalid',
  ACCOUNT_NAME_REQUIRED: 'validation.account.nameRequired',
  ACCOUNT_STARTING_BALANCE_POSITIVE: 'validation.account.startingBalancePositive',
  ACCOUNT_DAY_ROLLOVER_TIME_INVALID: 'validation.account.dayRolloverTimeInvalid',
  ACCOUNT_TIMEZONE_INVALID: 'validation.account.timezoneInvalid',
  EXECUTION_QUANTITY_POSITIVE: 'validation.execution.quantityPositive',
  EXECUTION_PRICE_POSITIVE: 'validation.execution.pricePositive',
  EXECUTION_COMMISSION_NON_NEGATIVE: 'validation.execution.commissionNonNegative',
  EXECUTION_FEES_NON_NEGATIVE: 'validation.execution.feesNonNegative',
  TRADE_EXECUTIONS_REQUIRED: 'validation.trade.executionsRequired',
  TRADE_INITIAL_RISK_POSITIVE: 'validation.trade.initialRiskPositive',
  TRADE_STOP_LOSS_POSITIVE: 'validation.trade.stopLossPositive',
  TRADE_TAKE_PROFIT_POSITIVE: 'validation.trade.takeProfitPositive',
  TRADE_DIRECTION_MISMATCH: 'validation.trade.directionMismatch',
  TRADE_INVERSION_NOT_ALLOWED: 'validation.trade.inversionNotAllowed',
  CASH_MOVEMENT_AMOUNT_SIGN: 'validation.cashMovement.amountSign',
} as const;

/** Union des clés i18n de {@link VALIDATION_KEYS} (valeurs, pas les noms de propriété). */
export type ValidationKey = (typeof VALIDATION_KEYS)[keyof typeof VALIDATION_KEYS];

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
 * Précision/échelle des colonnes `numeric` Postgres (DATA_MODEL conventions,
 * ADR-005) : montants et prix `numeric(20,8)`, quantités `numeric(24,8)`.
 * Utilisées par {@link fitsAmountScale}/{@link fitsQuantityScale} pour
 * rejeter côté formulaire une valeur que la colonne ne pourrait pas stocker,
 * plutôt que de laisser Postgres tronquer ou rejeter silencieusement plus
 * tard.
 */
export const AMOUNT_NUMERIC_PRECISION = 20;
export const AMOUNT_NUMERIC_SCALE = 8;
export const QUANTITY_NUMERIC_PRECISION = 24;
export const QUANTITY_NUMERIC_SCALE = 8;

/**
 * Vérifie qu'une chaîne déjà conforme à {@link AMOUNT_STRING_PATTERN} tient
 * dans une colonne `numeric(precision, scale)` : au plus `precision - scale`
 * chiffres avant la virgule (zéros de tête ignorés), au plus `scale` après.
 * Comparaison purement textuelle (comptage de chiffres), jamais de
 * conversion en `number` (ADR-005/CLAUDE.md).
 */
function fitsNumericColumn(value: string, precision: number, scale: number): boolean {
  const match = /^-?(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return false;
  const [, integerDigits, fractionDigits = ''] = match as unknown as [
    string,
    string,
    string | undefined,
  ];
  const significantIntegerDigits = integerDigits.replace(/^0+(?=\d)/, '');
  return significantIntegerDigits.length <= precision - scale && fractionDigits.length <= scale;
}

/** `true` si `value` (montant/prix) tient dans `numeric(20,8)` (voir {@link AMOUNT_NUMERIC_PRECISION}). */
export function fitsAmountScale(value: string): boolean {
  return fitsNumericColumn(value, AMOUNT_NUMERIC_PRECISION, AMOUNT_NUMERIC_SCALE);
}

/** `true` si `value` (quantité) tient dans `numeric(24,8)` (voir {@link QUANTITY_NUMERIC_PRECISION}). */
export function fitsQuantityScale(value: string): boolean {
  return fitsNumericColumn(value, QUANTITY_NUMERIC_PRECISION, QUANTITY_NUMERIC_SCALE);
}

/**
 * Chaîne décimale telle que renvoyée par PostgREST pour une colonne
 * `numeric` lue en `::text` (DATA_MODEL, conventions ; ADR-005) —
 * ex. `"-17527.71000000"`, `"200000"`. Signe optionnel, un point décimal
 * optionnel, jamais de notation scientifique ni de séparateur de milliers.
 * Bornée à l'échelle `numeric(20,8)` (montants/prix, voir
 * {@link fitsAmountScale}) — pour une quantité (`numeric(24,8)`), utiliser
 * {@link quantityString}. À convertir en `Decimal` via `@repo/core`
 * `parseAmount`, jamais en `number`.
 */
export const amountString = z
  .string()
  .regex(AMOUNT_STRING_PATTERN, VALIDATION_KEYS.AMOUNT_INVALID)
  .refine(fitsAmountScale, VALIDATION_KEYS.AMOUNT_SCALE_EXCEEDED);

/**
 * Chaîne décimale pour une quantité (DATA_MODEL `numeric(24,8)`, ex.
 * `executions.quantity`) — même motif que {@link amountString}, échelle plus
 * large (16 chiffres avant la virgule contre 12).
 */
export const quantityString = z
  .string()
  .regex(AMOUNT_STRING_PATTERN, VALIDATION_KEYS.AMOUNT_INVALID)
  .refine(fitsQuantityScale, VALIDATION_KEYS.QUANTITY_SCALE_EXCEEDED);

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
  .regex(CURRENCY_CODE_PATTERN, VALIDATION_KEYS.CURRENCY_INVALID);

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

/**
 * Ramène une {@link AMOUNT_STRING_PATTERN} à un entier mis à l'échelle
 * (`BigInt`), pour comparer/additionner deux montants **sans jamais passer
 * par `number`** (ADR-005/CLAUDE.md) — utilisé par {@link compareAmountStrings}
 * et par `tradeFormSchema` (revue M3, vérification d'inversion de position).
 * `scale` doit être `>=` au nombre de décimales de `value` (sinon perte de
 * précision, voir les appelants qui calculent `scale` au préalable).
 */
export function toScaledBigInt(value: string, scale: number): bigint {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integerPart, fractionPart = ''] = unsigned.split('.');
  const paddedFraction = (fractionPart + '0'.repeat(scale)).slice(0, scale);
  const magnitude = BigInt(`${integerPart}${paddedFraction}`);
  return negative ? -magnitude : magnitude;
}

/** Nombre de décimales d'une chaîne déjà conforme à {@link AMOUNT_STRING_PATTERN}. */
function decimalsOf(value: string): number {
  const dot = value.indexOf('.');
  return dot === -1 ? 0 : value.length - dot - 1;
}

/**
 * Compare deux montants sérialisés (déjà conformes à
 * {@link AMOUNT_STRING_PATTERN}) sans conversion en `number`/`parseFloat`
 * (ADR-005/CLAUDE.md), via une mise à l'échelle commune en `BigInt`.
 *
 * @returns `-1` si `a < b`, `1` si `a > b`, `0` si égaux
 */
export function compareAmountStrings(a: string, b: string): -1 | 0 | 1 {
  const scale = Math.max(decimalsOf(a), decimalsOf(b));
  const scaledA = toScaledBigInt(a, scale);
  const scaledB = toScaledBigInt(b, scale);
  if (scaledA < scaledB) return -1;
  if (scaledA > scaledB) return 1;
  return 0;
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
  .regex(/^\d{4}-\d{2}-\d{2}$/, VALIDATION_KEYS.TRADING_DAY_INVALID);
