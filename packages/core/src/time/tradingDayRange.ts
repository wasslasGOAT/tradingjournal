import { toTradingDay } from './tradingDay';
import type { TradingDay } from './tradingDay';

/** Construit un {@link TradingDay} à partir de composants de calendrier civil déjà résolus (report de mois/année via `Date` UTC). */
function formatTradingDay(year: number, month: number, day: number): TradingDay {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return toTradingDay(`${y}-${m}-${d}`);
}

/**
 * Énumère les {@link TradingDay} civils de `[from, to]` (bornes incluses),
 * un jour par jour civil calendaire (pas de notion de fuseau ici : `from`/`to`
 * sont déjà des `TradingDay` résolus par l'appelant, voir `tradingDayOf`).
 *
 * Pure arithmétique `Date` UTC (comme {@link buildCalendarGrid}) : chaque
 * `TradingDay` est une chaîne `YYYY-MM-DD`, jamais un horodatage — aucun
 * fuseau à réappliquer pour avancer d'un jour civil.
 *
 * @param from premier jour (inclus)
 * @param to dernier jour (inclus)
 * @returns les jours de `from` à `to`, triés chronologiquement ; tableau vide si `from > to`
 */
export function enumerateTradingDays(from: TradingDay, to: TradingDay): TradingDay[] {
  if (from > to) return [];

  const [fromYear = 0, fromMonth = 1, fromDay = 1] = from.split('-').map(Number);
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const days: TradingDay[] = [];

  while (true) {
    const tradingDay = formatTradingDay(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1,
      cursor.getUTCDate(),
    );
    days.push(tradingDay);
    if (tradingDay >= to) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}
