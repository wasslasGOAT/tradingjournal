import type { Decimal } from '../money';
import { sortTradesChronologically } from '../stats';
import type { TradeRecord } from '../stats';
import type { DayAggregate } from './day';

/** Point de la courbe d'equity par trade. `tradeId`/`at` sont `null` pour le point initial (avant tout trade, solde initial). */
export interface EquityByTradePoint {
  readonly tradeId: string | null;
  readonly at: Date | null;
  readonly balance: Decimal;
}

/**
 * Courbe d'equity par trade (ARCHITECTURE §5.4 : « série d'equity »).
 *
 * Formule : point initial `{ tradeId: null, at: null, balance: startingBalance }`,
 * puis un point par trade dans l'ordre chronologique (`closedAt`, repli
 * `openedAt`, voir {@link sortTradesChronologically}), `balance` cumulant
 * `+= netPnl` à chaque point.
 *
 * @param startingBalance solde initial du compte
 * @param trades trades à inclure, dans un ordre quelconque (retriés en interne)
 */
export function equityCurveByTrade(
  startingBalance: Decimal,
  trades: readonly TradeRecord[],
): EquityByTradePoint[] {
  const ordered = sortTradesChronologically(trades);
  const points: EquityByTradePoint[] = [{ tradeId: null, at: null, balance: startingBalance }];
  let balance = startingBalance;
  for (const trade of ordered) {
    balance = balance.plus(trade.netPnl);
    points.push({ tradeId: trade.id, at: trade.closedAt ?? trade.openedAt, balance });
  }
  return points;
}

/** Point de la courbe d'equity par jour. `tradingDay` est `null` pour le point initial (avant tout jour de trading, solde initial). */
export interface EquityByDayPoint {
  readonly tradingDay: string | null;
  readonly balance: Decimal;
}

/**
 * Courbe d'equity par jour de trading, à partir des {@link DayAggregate}
 * (dont `endBalance` est déjà cumulatif, voir {@link aggregateByTradingDay}).
 *
 * @param startingBalance solde initial du compte (point de départ de la courbe)
 * @param days agrégats journaliers, déjà triés par `tradingDay` (voir {@link aggregateByTradingDay})
 */
export function equityCurveByDay(
  startingBalance: Decimal,
  days: readonly DayAggregate[],
): EquityByDayPoint[] {
  return [
    { tradingDay: null, balance: startingBalance },
    ...days.map((day) => ({ tradingDay: day.tradingDay, balance: day.endBalance })),
  ];
}
