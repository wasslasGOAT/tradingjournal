import { formatInTimeZone } from 'date-fns-tz';

import { Decimal } from '../money';
import { computeWinLossCounts, computeWinRate, filterClosedTrades } from '../stats';
import type { TradeRecord } from '../stats';
import { localWeekdayOf } from './week';

/** Cellule de la heatmap heure × jour de semaine (ARCHITECTURE §0/§5.4). */
export interface HeatmapCell {
  /** `0` dimanche .. `6` samedi (voir {@link localWeekdayOf}). */
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
 * semaine »). `weekday` et `hour` sont résolus depuis le **même instant**
 * (`openedAt`, UTC) dans `timezone` (revue M3 #9 : jamais `weekday` dérivé du
 * `tradingDay` déjà résolu — qui dépend de `day_rollover_time` et peut donc
 * retomber sur un jour civil différent de celui de `hour` — sinon une même
 * exécution pourrait apparaître sur un couple `(weekday, hour)` incohérent),
 * même technique que `packages/core/time` `tradingDayOf`
 * (`formatInTimeZone` directement sur l'instant UTC, correct pendant les
 * changements d'heure). Trades `open` exclus (voir {@link filterClosedTrades}).
 *
 * @param trades trades à répartir (trades `open` ignorés)
 * @param timezone fuseau IANA utilisé pour résoudre le jour/l'heure locale d'ouverture (typiquement `accounts.timezone`)
 * @returns une {@link HeatmapCell} par couple `(weekday, hour)` non vide, triées par `weekday` puis `hour` croissants (pas de cellule à 0 insérée pour les couples sans trade)
 */
export function computeHeatmap(trades: readonly TradeRecord[], timezone: string): HeatmapCell[] {
  const cells = new Map<string, { weekday: number; hour: number; trades: TradeRecord[] }>();

  for (const trade of filterClosedTrades(trades)) {
    const weekday = localWeekdayOf(trade.openedAt, timezone);
    // `Number(...)` porte une heure `0`..`23` (pas un montant) : conversion sûre, voir CLAUDE.md sur l'argent.
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
      return {
        weekday,
        hour,
        tradesCount: group.length,
        wins,
        losses,
        netPnl,
        winRate: computeWinRate(group),
      };
    });
}
