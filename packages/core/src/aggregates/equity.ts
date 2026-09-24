import type { Decimal } from '../money';
import { filterClosedTrades, sortTradesChronologically } from '../stats';
import type { TradeRecord } from '../stats';
import type { DayAggregate } from './day';

/**
 * Point de la courbe d'**equity de trading** par trade (revue M3 #8 : cette
 * courbe et {@link computeMaxDrawdown} portent sur `startingBalance + Σ
 * netPnl` uniquement, **sans** les mouvements de trésorerie — un dépôt ne
 * doit pas apparaître comme un gain de trading, ni un retrait comme une
 * perte ; voir {@link EquityByDayPoint} pour la courbe par jour, qui expose
 * séparément la trésorerie réelle). `tradeId`/`at` sont `null` pour le point
 * initial (avant tout trade, solde initial).
 */
export interface EquityByTradePoint {
  readonly tradeId: string | null;
  readonly at: Date | null;
  /** Equity de trading cumulée (`startingBalance + Σ netPnl` jusqu'à ce point inclus), sans mouvement de trésorerie. */
  readonly balance: Decimal;
}

/**
 * Courbe d'equity de trading par trade (ARCHITECTURE §5.4 : « série
 * d'equity » ; voir {@link EquityByTradePoint} pour la limite volontaire aux
 * seuls trades, sans trésorerie).
 *
 * Formule : point initial `{ tradeId: null, at: null, balance: startingBalance }`,
 * puis un point par trade `closed` dans l'ordre chronologique (`closedAt`,
 * repli `openedAt`, voir {@link sortTradesChronologically}), `balance`
 * cumulant `+= netPnl` à chaque point. Trades `open` exclus (voir
 * {@link filterClosedTrades}).
 *
 * @param startingBalance solde initial du compte
 * @param trades trades à inclure, dans un ordre quelconque (retriés en interne) ; trades `open` ignorés
 */
export function equityCurveByTrade(
  startingBalance: Decimal,
  trades: readonly TradeRecord[],
): EquityByTradePoint[] {
  const ordered = sortTradesChronologically(filterClosedTrades(trades));
  const points: EquityByTradePoint[] = [{ tradeId: null, at: null, balance: startingBalance }];
  let balance = startingBalance;
  for (const trade of ordered) {
    balance = balance.plus(trade.netPnl);
    points.push({ tradeId: trade.id, at: trade.closedAt ?? trade.openedAt, balance });
  }
  return points;
}

/**
 * Point de la courbe d'equity par jour de trading — **deux séries
 * explicites** (revue M3 #8), pour ne jamais confondre performance de
 * trading et trésorerie :
 * - `tradingEquity` : `startingBalance + Σ netPnl` cumulé jusqu'à ce jour
 *   inclus, **sans** les mouvements de trésorerie (même base que
 *   {@link EquityByTradePoint}/`computeMaxDrawdown`) — un dépôt ne doit pas
 *   apparaître comme un gain de trading, ni un retrait comme une perte.
 * - `balance` : solde réel du compte à la clôture du jour, mouvements de
 *   trésorerie inclus (= `DayAggregate.endBalance`, voir
 *   {@link aggregateByTradingDay}).
 *
 * `tradingDay` est `null` pour le point initial (avant tout jour de trading, solde initial), où `tradingEquity === balance === startingBalance`.
 */
export interface EquityByDayPoint {
  readonly tradingDay: string | null;
  readonly tradingEquity: Decimal;
  readonly balance: Decimal;
}

/**
 * Courbe d'equity par jour de trading, à partir des {@link DayAggregate}
 * (dont `endBalance` est déjà cumulatif, voir {@link aggregateByTradingDay})
 * — voir {@link EquityByDayPoint} pour la distinction `tradingEquity`/`balance`.
 *
 * @param startingBalance solde initial du compte (point de départ de la courbe)
 * @param days agrégats journaliers, déjà triés par `tradingDay` (voir {@link aggregateByTradingDay})
 */
export function equityCurveByDay(
  startingBalance: Decimal,
  days: readonly DayAggregate[],
): EquityByDayPoint[] {
  let tradingEquity = startingBalance;
  return [
    { tradingDay: null, tradingEquity: startingBalance, balance: startingBalance },
    ...days.map((day) => {
      tradingEquity = tradingEquity.plus(day.netPnl);
      return { tradingDay: day.tradingDay, tradingEquity, balance: day.endBalance };
    }),
  ];
}
