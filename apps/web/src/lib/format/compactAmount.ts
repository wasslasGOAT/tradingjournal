import { Decimal, HIDDEN_VALUE_PLACEHOLDER, formatNumber } from '@repo/core';
import type { SupportedLocale } from '@repo/core';

/**
 * Formatage compact de P&L (W-4, copie de
 * `packages/ui/src/format/compactAmount.ts`, gelé) : pour les cellules trop
 * étroites pour `formatSignedAmount` (`DayCell` dans la grille du calendrier),
 * ex. `+312`, `+1,3k` (fr) / `+1.3k` (en), `−2,4M`. **Sans symbole de
 * devise** — utiliser `formatSignedAmount` (`@repo/core`) dès qu'il y a la
 * place. Ne réimplémente ni le groupement de chiffres ni les séparateurs de
 * locale — délégués à `formatNumber` (`@repo/core`), seule source de vérité.
 */

const MINUS_SIGN = '−';

const THOUSAND = new Decimal(1_000);
const MILLION = new Decimal(1_000_000);
const BILLION = new Decimal(1_000_000_000);

const BILLION_TIER_MIN = new Decimal(999_500_000);
const MILLION_TIER_MIN = new Decimal(999_500);
const THOUSAND_TIER_MIN = new Decimal(1_000);

export interface FormatCompactSignedAmountOptions {
  readonly locale: SupportedLocale;
  readonly hideAmounts?: boolean;
}

interface CompactTier {
  readonly divisor: Decimal;
  readonly suffix: '' | 'k' | 'M' | 'B';
}

function resolveTier(absValue: Decimal): CompactTier {
  if (absValue.gte(BILLION_TIER_MIN)) return { divisor: BILLION, suffix: 'B' };
  if (absValue.gte(MILLION_TIER_MIN)) return { divisor: MILLION, suffix: 'M' };
  if (absValue.gte(THOUSAND_TIER_MIN)) return { divisor: THOUSAND, suffix: 'k' };
  return { divisor: new Decimal(1), suffix: '' };
}

/**
 * Formate un P&L signé en notation compacte, sans devise (ex. `+312`,
 * `+1,3k`, `−2,4M`). Convention de signe identique à `formatSignedAmount` :
 * `+` pour `amount >= 0` (zéro inclus), `−` sinon.
 */
export function formatCompactSignedAmount(
  amount: Decimal,
  options: FormatCompactSignedAmountOptions,
): string {
  const { locale, hideAmounts } = options;
  if (hideAmounts) return HIDDEN_VALUE_PLACEHOLDER;

  const isNegative = !amount.isZero() && amount.isNegative();
  const absValue = amount.abs();
  const { divisor, suffix } = resolveTier(absValue);
  const scaled = absValue.div(divisor);
  const decimals = suffix !== '' && scaled.lt(10) ? 1 : 0;
  const numberText = formatNumber(scaled, { locale, decimals });

  return `${isNegative ? MINUS_SIGN : '+'}${numberText}${suffix}`;
}
