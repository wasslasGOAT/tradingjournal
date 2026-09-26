import { formatAmount, formatNumber, formatPercent, formatSignedAmount } from '@repo/core';
import type { Decimal, SupportedLocale } from '@repo/core';

import type { PnlIntent } from '../../tokens';

/**
 * Logique pure de `StatTile` (M1-3) : quel formateur `@repo/core/format`
 * appeler selon `kind`, et quelle intention P&L (donc quelle classe de
 * couleur) en déduire du signe. Aucun calcul métier ici — uniquement un
 * aiguillage vers les formateurs déjà arrondis/localisés de `packages/core`.
 */
export type StatTileKind = 'amount' | 'signedAmount' | 'percent' | 'number';

export interface FormatStatTileValueOptions {
  readonly kind: StatTileKind;
  readonly value: Decimal;
  readonly locale: SupportedLocale;
  /** Requis pour `kind` `'amount'`/`'signedAmount'`, ignoré sinon. */
  readonly currency?: string;
  readonly hideAmounts?: boolean;
  readonly decimals?: number;
}

/** Formate la valeur d'un `StatTile` selon son `kind` (masquage déjà géré par les formateurs `@repo/core`). */
export function formatStatTileValue(options: FormatStatTileValueOptions): string {
  const { kind, value, locale, currency, hideAmounts, decimals } = options;
  switch (kind) {
    case 'amount':
      return formatAmount(value, currency ?? '', { locale, hideAmounts, decimals });
    case 'signedAmount':
      return formatSignedAmount(value, currency ?? '', { locale, hideAmounts, decimals });
    case 'percent':
      return formatPercent(value, { locale, hideAmounts, decimals });
    case 'number':
      return formatNumber(value, { locale, hideAmounts, decimals });
  }
}

/** Intention P&L déduite du signe (zéro -> `flat`, jamais `-0`) — tokens `pnl*` (ADR-012). */
export function resolvePnlIntent(value: Decimal): PnlIntent {
  if (value.isZero()) return 'flat';
  return value.isNegative() ? 'loss' : 'profit';
}

const PNL_TEXT_CLASS_NAME: Record<PnlIntent, string> = {
  profit: 'text-pnlProfit',
  loss: 'text-pnlLoss',
  flat: 'text-pnlFlat',
};

/** Classe NativeWind de couleur du `StatTile` : intention P&L pour montant/pourcentage, neutre pour un simple nombre. */
export function resolveStatTileClassName(kind: StatTileKind, value: Decimal): string {
  return kind === 'number' ? 'text-textPrimary' : PNL_TEXT_CLASS_NAME[resolvePnlIntent(value)];
}
