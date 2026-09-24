import { formatDayNumber, formatMonthLabel } from '@repo/core';
import type { SupportedLocale } from '@repo/core';
import type { TradingDayRange } from '@repo/ui';

/** Clé « année-mois » (`YYYY-MM`) d'un `TradingDay`, pour savoir si deux jours partagent le même mois. */
function monthKey(day: TradingDayRange['start']): string {
  return day.slice(0, 7);
}

/**
 * Libellé du déclencheur `DateRangePicker` du header (M1-4) : formatage pur à
 * partir de `@repo/core/format` (pas de calcul métier ici, seulement de
 * l'assemblage de chaînes déjà localisées) — ex. `"19 sept. 2026"` (jour
 * unique), `"1–15 sept. 2026"` (même mois), `"28 août – 3 sept. 2026"` (mois
 * différents).
 */
export function formatDateRangeLabel(range: TradingDayRange, locale: SupportedLocale): string {
  if (range.start === range.end) {
    return `${formatDayNumber(range.start, { locale })} ${formatMonthLabel(range.start, { locale })}`;
  }
  if (monthKey(range.start) === monthKey(range.end)) {
    return `${formatDayNumber(range.start, { locale })}–${formatDayNumber(range.end, { locale })} ${formatMonthLabel(range.end, { locale })}`;
  }
  return `${formatDayNumber(range.start, { locale })} ${formatMonthLabel(range.start, { locale })} – ${formatDayNumber(range.end, { locale })} ${formatMonthLabel(range.end, { locale })}`;
}
