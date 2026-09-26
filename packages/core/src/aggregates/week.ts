import { Decimal } from '../money';
import { getLocalTimeParts } from '../time/localTimeCache';
import type { DayAggregate } from './day';
import type { WeekStartsOn } from './types';

/** Totaux hebdomadaires (ARCHITECTURE §5.5 : « colonne total hebdo »), regroupant des {@link DayAggregate}. */
export interface WeekAggregate {
  /** Jour de trading (`YYYY-MM-DD`) du premier jour de la semaine (voir `weekStartsOn`). */
  readonly weekStart: string;
  /** Jour de trading du dernier jour de la semaine (`weekStart` + 6 jours). */
  readonly weekEnd: string;
  readonly tradesCount: number;
  readonly wins: number;
  readonly losses: number;
  readonly grossPnl: Decimal;
  readonly netPnl: Decimal;
  readonly fees: Decimal;
  readonly volume: Decimal;
  /** Nombre de jours de la semaine où au moins un trade a eu lieu. */
  readonly activeDays: number;
}

/** Construit un `Date` UTC à minuit pour un jour de trading `YYYY-MM-DD` (calendrier civil pur, sans fuseau à réappliquer — même technique que `packages/core/format`). */
function toUtcMidnight(day: string): Date {
  const [year = 0, month = 1, dayOfMonth = 1] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, dayOfMonth));
}

function toDayString(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Jour de semaine d'un jour de trading (`YYYY-MM-DD`) : `0` dimanche .. `6`
 * samedi (convention `date-fns`/`Date#getUTCDay`), calculé sur le calendrier
 * civil du `TradingDay` (déjà résolu, sans fuseau à réappliquer — voir
 * {@link toUtcMidnight}).
 */
export function tradingDayWeekday(day: string): number {
  return toUtcMidnight(day).getUTCDay();
}

/**
 * Jour de semaine local (`0` dimanche .. `6` samedi) d'un instant UTC, résolu
 * dans `timezone` — **revue M3 #9** : la heatmap et les agrégats par jour de
 * semaine/heure doivent dériver `weekday` et `hour` du **même instant**
 * (`openedAt`) dans le **même** fuseau, plutôt que de mélanger `weekday`
 * (dérivé de `tradingDay`, qui dépend de `day_rollover_time`) et `hour`
 * (dérivé directement de `openedAt`) : les deux peuvent diverger d'un jour
 * civil dès que la bascule n'est pas minuit (ex. rollover 17:00 New York),
 * ce qui placerait une même exécution sur un couple (jour, heure)
 * incohérent. Même technique que {@link tradingDayWeekday}/`packages/core/time`
 * `tradingDayOf` (décomposition directe de l'instant UTC via
 * {@link getLocalTimeParts}, mémoïsée par fuseau — correct pendant les
 * changements d'heure).
 */
export function localWeekdayOf(instant: Date, timezone: string): number {
  const { year, month, day } = getLocalTimeParts(instant, timezone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Premier jour (`YYYY-MM-DD`) de la semaine calendaire contenant `day`, selon
 * `weekStartsOn` (`0` dimanche, `1` lundi — préférence `week_starts_on`,
 * DATA_MODEL `preferences`).
 */
export function weekStartOf(day: string, weekStartsOn: WeekStartsOn): string {
  const date = toUtcMidnight(day);
  const weekday = date.getUTCDay(); // 0 (dimanche) .. 6 (samedi)
  const diff = (weekday - weekStartsOn + 7) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return toDayString(date);
}

/**
 * Agrège des {@link DayAggregate} par semaine calendaire.
 *
 * @param days agrégats journaliers (voir {@link aggregateByTradingDay}), un jour peut être absent si aucun trade n'a eu lieu ce jour-là — `activeDays` ne compte que les jours présents dans `days`
 * @param weekStartsOn premier jour de semaine (`0` dimanche, `1` lundi)
 * @returns un {@link WeekAggregate} par semaine contenant au moins un jour de `days`, trié par `weekStart` croissant
 */
export function aggregateByWeek(
  days: readonly DayAggregate[],
  weekStartsOn: WeekStartsOn,
): WeekAggregate[] {
  const byWeek = new Map<string, DayAggregate[]>();
  for (const day of days) {
    const weekStart = weekStartOf(day.tradingDay, weekStartsOn);
    const list = byWeek.get(weekStart);
    if (list) list.push(day);
    else byWeek.set(weekStart, [day]);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([weekStart, weekDays]) => {
      const weekEndDate = toUtcMidnight(weekStart);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
      const totals = weekDays.reduce(
        (acc, d) => ({
          tradesCount: acc.tradesCount + d.tradesCount,
          wins: acc.wins + d.wins,
          losses: acc.losses + d.losses,
          grossPnl: acc.grossPnl.plus(d.grossPnl),
          netPnl: acc.netPnl.plus(d.netPnl),
          fees: acc.fees.plus(d.fees),
          volume: acc.volume.plus(d.volume),
        }),
        {
          tradesCount: 0,
          wins: 0,
          losses: 0,
          grossPnl: new Decimal(0),
          netPnl: new Decimal(0),
          fees: new Decimal(0),
          volume: new Decimal(0),
        },
      );
      return {
        weekStart,
        weekEnd: toDayString(weekEndDate),
        ...totals,
        // Un jour sans trade (mouvement de trésorerie seul) n'est pas un jour actif.
        activeDays: weekDays.filter((day) => day.tradesCount > 0).length,
      };
    });
}
