import { toTradingDay } from '../time';
import type { TradingDay } from '../time';
import type { WeekStartsOn } from './types';

/**
 * Cellule de la grille du calendrier (M1-8/W-6b, ARCHITECTURE §5.5) : un
 * {@link TradingDay} et si ce jour appartient au mois affiché (`false` pour
 * le bourrage mois précédent/suivant, affiché en plus discret par l'UI).
 */
export interface CalendarGridCell {
  readonly tradingDay: TradingDay;
  /** `false` pour les jours de bourrage (mois précédent/suivant), affichés en plus discret. */
  readonly inCurrentMonth: boolean;
}

/** Construit un {@link TradingDay} à partir de composants de calendrier civil déjà résolus. */
function formatTradingDay(year: number, month: number, day: number): TradingDay {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return toTradingDay(`${y}-${m}-${d}`);
}

/**
 * Construit les semaines (7 jours chacune) couvrant `month` (1-12) de `year`,
 * avec bourrage avant/après pour compléter la première/dernière semaine.
 *
 * Pure arithmétique de calendrier civil (`Date` UTC, aucun fuseau à
 * réappliquer) : `year`/`month`/`day` sont déjà des composants civils, pas
 * des horodatages — voir `packages/core/time` `tradingDayOf` pour la
 * résolution du jour de trading à partir d'un instant UTC + fuseau/bascule.
 *
 * @param year année civile (ex. `2026`)
 * @param month mois civil, `1`-`12`
 * @param weekStartsOn premier jour de semaine (`0` dimanche, `1` lundi — préférence `week_starts_on`, DATA_MODEL `preferences`), défaut `1`
 * @returns les semaines du mois, chacune un tableau de 7 {@link CalendarGridCell}, triées chronologiquement
 */
export function buildCalendarGrid(
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn = 1,
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
