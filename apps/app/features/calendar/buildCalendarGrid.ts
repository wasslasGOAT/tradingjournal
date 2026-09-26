import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

/**
 * Disposition en grille du calendrier (M1-8) : mise en page pure (quelle
 * colonne/semaine pour quel jour), pas un calcul métier — les stats
 * elles-mêmes viennent de `@repo/core/aggregates` (ROADMAP M3). Aucune
 * dépendance à `date-fns` ici (non listée dans `apps/app/package.json`,
 * CLAUDE.md « n'installe aucune dépendance ») : arithmétique `Date` UTC pure.
 */
export interface CalendarGridCell {
  readonly tradingDay: TradingDay;
  /** `false` pour les jours de bourrage (mois précédent/suivant), affichés en plus discret. */
  readonly inCurrentMonth: boolean;
}

function formatTradingDay(year: number, month: number, day: number): TradingDay {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return toTradingDay(`${y}-${m}-${d}`);
}

/**
 * Construit les semaines (7 jours chacune) couvrant `month` (1-12) de `year`,
 * avec bourrage avant/après pour compléter la première/dernière semaine.
 * @param weekStartsOn `0` = dimanche, `1` = lundi (convention `date-fns`, ARCHITECTURE §5.5)
 */
export function buildCalendarGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1,
): readonly (readonly CalendarGridCell[])[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;

  const cells: CalendarGridCell[] = [];
  for (let i = leading; i > 0; i -= 1) {
    const date = new Date(Date.UTC(year, month - 1, 1 - i));
    cells.push({
      tradingDay: formatTradingDay(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      ),
      inCurrentMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ tradingDay: formatTradingDay(year, month, day), inCurrentMonth: true });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(Date.UTC(year, month, trailing));
    cells.push({
      tradingDay: formatTradingDay(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      ),
      inCurrentMonth: false,
    });
    trailing += 1;
  }

  const weeks: CalendarGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
