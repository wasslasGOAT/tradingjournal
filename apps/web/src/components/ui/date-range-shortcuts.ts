import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

/**
 * Logique pure de `DateRangePicker` (W-4, copie de
 * `packages/ui/src/components/DateRangePicker/dateRangeShortcuts.ts`, gelé) :
 * raccourcis de période + grille du mois pour la plage personnalisée.
 * Arithmétique `Date` UTC pure, aucune dépendance.
 */

export type DateRangeShortcut = 'today' | 'last7Days' | 'currentMonth' | 'previousMonth' | 'custom';

export interface TradingDayRange {
  readonly start: TradingDay;
  readonly end: TradingDay;
}

function toUtcDate(day: TradingDay): Date {
  const [yearText = '1970', monthText = '01', dayText = '01'] = day.split('-');
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

function toTradingDayFromUtc(date: Date): TradingDay {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');
  return toTradingDay(`${year}-${month}-${dayOfMonth}`);
}

function addDays(day: TradingDay, delta: number): TradingDay {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + delta);
  return toTradingDayFromUtc(date);
}

function startOfMonth(day: TradingDay): TradingDay {
  const date = toUtcDate(day);
  return toTradingDayFromUtc(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

function endOfMonth(day: TradingDay): TradingDay {
  const date = toUtcDate(day);
  return toTradingDayFromUtc(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

/** Résout un raccourci (hors `'custom'`, qui n'a pas de plage déterministe) en plage de `TradingDay`, bornes incluses. */
export function resolveDateRangeShortcut(
  shortcut: Exclude<DateRangeShortcut, 'custom'>,
  today: TradingDay,
): TradingDayRange {
  switch (shortcut) {
    case 'today':
      return { start: today, end: today };
    case 'last7Days':
      return { start: addDays(today, -6), end: today };
    case 'currentMonth':
      return { start: startOfMonth(today), end: today };
    case 'previousMonth': {
      const lastDayOfPreviousMonth = addDays(startOfMonth(today), -1);
      return {
        start: startOfMonth(lastDayOfPreviousMonth),
        end: endOfMonth(lastDayOfPreviousMonth),
      };
    }
  }
}

export interface DateRangeGridCell {
  readonly tradingDay: TradingDay;
  /** `false` pour les jours de bourrage (mois précédent/suivant), affichés en plus discret. */
  readonly inCurrentMonth: boolean;
}

/** Construit les semaines (7 jours) couvrant `month` (1-12) de `year`, avec bourrage. */
export function buildDateRangeGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1,
): readonly (readonly DateRangeGridCell[])[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;

  const cells: DateRangeGridCell[] = [];
  for (let i = leading; i > 0; i -= 1) {
    const date = new Date(Date.UTC(year, month - 1, 1 - i));
    cells.push({ tradingDay: toTradingDayFromUtc(date), inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      tradingDay: toTradingDayFromUtc(new Date(Date.UTC(year, month - 1, day))),
      inCurrentMonth: true,
    });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(Date.UTC(year, month, trailing));
    cells.push({ tradingDay: toTradingDayFromUtc(date), inCurrentMonth: false });
    trailing += 1;
  }

  const weeks: DateRangeGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** `true` si `day` est dans `[range.start, range.end]` — comparaison lexicographique valide : `TradingDay` est `YYYY-MM-DD`. */
export function isWithinRange(day: TradingDay, range: TradingDayRange): boolean {
  return day >= range.start && day <= range.end;
}

/**
 * Sélection en 2 appuis pour la plage personnalisée : le 1ᵉʳ appui pose `start`
 * (`end` encore `null`) ; le 2ᵉ pose `end` si `day` est après `start` (sinon
 * `start` et `end` sont échangés). Un 3ᵉ appui (plage déjà complète) redémarre
 * une nouvelle sélection à partir de `day`.
 */
export function resolveRangeSelection(
  current: { readonly start: TradingDay; readonly end: TradingDay | null } | null,
  day: TradingDay,
): { readonly start: TradingDay; readonly end: TradingDay | null } {
  if (!current || current.end !== null) {
    return { start: day, end: null };
  }
  if (day >= current.start) {
    return { start: current.start, end: day };
  }
  return { start: day, end: current.start };
}

export type DateRangeGridCellIntent = 'edge' | 'inRange' | 'none';

/**
 * Intention visuelle d'une cellule de la grille de plage personnalisée :
 * `'edge'` (borne de départ ou de fin, remplissage plein), `'inRange'`
 * (entre les deux bornes, remplissage atténué), `'none'` (hors sélection).
 */
export function resolveDateRangeGridCellIntent(
  day: TradingDay,
  draft: { readonly start: TradingDay; readonly end: TradingDay | null },
): DateRangeGridCellIntent {
  if (day === draft.start || day === draft.end) return 'edge';
  if (draft.end !== null && isWithinRange(day, { start: draft.start, end: draft.end })) {
    return 'inRange';
  }
  return 'none';
}
