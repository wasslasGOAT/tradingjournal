import { Decimal } from '../money';
import { computeWinLossCounts, computeWinRate, filterClosedTrades } from '../stats';
import type { TradeRecord } from '../stats';
import { getLocalTimeParts } from '../time/localTimeCache';

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
 * même technique que `packages/core/time` `tradingDayOf` (décomposition
 * directe de l'instant UTC via {@link getLocalTimeParts}, mémoïsée par
 * fuseau — correct pendant les changements d'heure). Trades `open` exclus
 * (voir {@link filterClosedTrades}).
 *
 * @param trades trades à répartir (trades `open` ignorés)
 * @param timezone fuseau IANA utilisé pour résoudre le jour/l'heure locale d'ouverture (typiquement `accounts.timezone`)
 * @returns une {@link HeatmapCell} par couple `(weekday, hour)` non vide, triées par `weekday` puis `hour` croissants (pas de cellule à 0 insérée pour les couples sans trade)
 */
export function computeHeatmap(trades: readonly TradeRecord[], timezone: string): HeatmapCell[] {
  const cells = new Map<string, { weekday: number; hour: number; trades: TradeRecord[] }>();

  for (const trade of filterClosedTrades(trades)) {
    // Un seul appel pour `weekday` et `hour` : les deux doivent dériver du
    // même instant/fuseau (revue M3 #9, voir la JSDoc ci-dessus) — dériver
    // `weekday` via `new Date(Date.UTC(...)).getUTCDay()` sur les composants
    // déjà résolus évite un second appel équivalent à `localWeekdayOf`.
    const { year, month, day, hour } = getLocalTimeParts(trade.openedAt, timezone);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
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
