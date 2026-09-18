import { formatInTimeZone } from 'date-fns-tz';

import { Decimal } from '../money';
import { computeWinLossCounts, computeWinRate } from '../stats';
import type { TradeRecord } from '../stats';
import { tradingDayWeekday } from './week';

/** Cellule de la heatmap heure × jour de semaine (ARCHITECTURE §0/§5.4). */
export interface HeatmapCell {
  /** `0` dimanche .. `6` samedi (voir {@link tradingDayWeekday}). */
  readonly weekday: number;
  /** Heure locale d'ouverture, `0`..`23` (voir `aggregateByHourOfDay`). */
  readonly hour: number;
  readonly tradesCount: number;
  readonly wins: number;
  readonly losses: number;
  readonly netPnl: Decimal;
  readonly winRate: Decimal | null;
}

/**
 * Heatmap heure × jour de semaine (ARCHITECTURE : « heatmap heure × jour de
 * semaine »). `weekday` vient du `tradingDay` déjà résolu de chaque trade
 * (indépendant du fuseau) ; `hour` est l'heure locale d'ouverture résolue
 * dans `timezone` à partir de `openedAt` (UTC), même technique que
 * {@link aggregateByHourOfDay}.
 *
 * @param trades trades à répartir
 * @param timezone fuseau IANA utilisé pour résoudre l'heure locale d'ouverture (typiquement `accounts.timezone`)
 * @returns une {@link HeatmapCell} par couple `(weekday, hour)` non vide, triées par `weekday` puis `hour` croissants (pas de cellule à 0 insérée pour les couples sans trade)
 */
export function computeHeatmap(trades: readonly TradeRecord[], timezone: string): HeatmapCell[] {
  const cells = new Map<string, { weekday: number; hour: number; trades: TradeRecord[] }>();

  for (const trade of trades) {
    const weekday = tradingDayWeekday(trade.tradingDay);
    const hour = Number(formatInTimeZone(trade.openedAt, timezone, 'H'));
    const key = `${weekday}-${hour}`;
    const existing = cells.get(key);
    if (existing) existing.trades.push(trade);
    else cells.set(key, { weekday, hour, trades: [trade] });
  }

  return [...cells.values()]
    .sort((a, b) => (a.weekday !== b.weekday ? a.weekday - b.weekday : a.hour - b.hour))
    .map(({ weekday, hour, trades: group }) => {
      const { wins, losses } = computeWinLossCounts(group);
      const netPnl = group.reduce((acc, t) => acc.plus(t.netPnl), new Decimal(0));
      return { weekday, hour, tradesCount: group.length, wins, losses, netPnl, winRate: computeWinRate(group) };
    });
}
