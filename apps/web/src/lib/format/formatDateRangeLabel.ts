import { formatDayNumber, formatMonthLabel } from '@repo/core';
import type { SupportedLocale, TradingDay } from '@repo/core';

export interface TradingDayRangeLike {
  readonly start: TradingDay;
  readonly end: TradingDay;
}

/**
 * Libellé compact d'une plage de dates pour le déclencheur de
 * `DateRangePicker` (ex. « 1 – 15 sept. 2026 » quand `start`/`end` sont dans
 * le même mois, « 3 sept. – 2 oct. 2026 » sinon). Composé à partir des
 * formateurs `@repo/core/format` (jour/mois) — aucun calcul de date ici.
 */
export function formatDateRangeLabel(
  range: TradingDayRangeLike,
  locale: SupportedLocale,
): string {
  if (range.start === range.end) {
    return `${formatDayNumber(range.start, { locale })} ${formatMonthLabel(range.start, { locale })}`;
  }

  const startMonth = range.start.slice(0, 7);
  const endMonth = range.end.slice(0, 7);
  const endLabel = `${formatDayNumber(range.end, { locale })} ${formatMonthLabel(range.end, { locale })}`;

  if (startMonth === endMonth) {
    return `${formatDayNumber(range.start, { locale })} – ${endLabel}`;
  }

  const startLabel = `${formatDayNumber(range.start, { locale })} ${formatMonthLabel(range.start, { locale })}`;
  return `${startLabel} – ${endLabel}`;
}
