import { compareOrdinal } from '../stats';
import type { TradeRecord } from '../stats';
import type { TradingDay } from '../time';
import type { Decimal } from '../money';
import type { DayAggregate } from './day';

/**
 * Regroupe des {@link TradeRecord} par `tradingDay`, sans filtrer par
 * `status` (contrairement à {@link aggregateByTradingDay}/`filterClosedTrades`) :
 * sert à retrouver les trades d'un jour pour l'affichage (ex. liste de
 * trades d'une cellule de calendrier), pas à calculer un P&L — un trade
 * `open` doit rester visible dans la cellule de son jour même s'il ne compte
 * dans aucune statistique. O(n) sur `trades`, une seule passe (remplace un
 * `trades.filter(...)` par jour, en O(jours × trades), revue W-10).
 *
 * @param trades trades à regrouper, dans un ordre quelconque (ordre préservé au sein d'un même jour)
 * @returns une entrée par `tradingDay` présent dans `trades`
 */
export function groupTradesByTradingDay(
  trades: readonly TradeRecord[],
): Map<TradingDay, TradeRecord[]> {
  const byDay = new Map<TradingDay, TradeRecord[]>();
  for (const trade of trades) {
    const tradingDay = trade.tradingDay as TradingDay;
    const list = byDay.get(tradingDay);
    if (list) list.push(trade);
    else byDay.set(tradingDay, [trade]);
  }
  return byDay;
}

/**
 * Entrée de l'index « jours du mois » (Calendrier, ARCHITECTURE §5.5), une
 * par jour présent dans l'union {@link DayAggregate des jours tradés} ∪
 * `journalTradingDays` — voir {@link buildMonthDayIndex}.
 */
export interface MonthDayIndexEntry {
  readonly tradingDay: TradingDay;
  /** `netPnl` du jour, `null` si aucun trade ce jour (jour journal seul, ou jour cash-only, voir `DayAggregate.tradesCount`). */
  readonly netPnl: Decimal | null;
  readonly hasJournalEntry: boolean;
}

/**
 * Construit l'index « jours du mois » du Calendrier : **union** des jours
 * portant au moins un trade (`days`, voir {@link aggregateByTradingDay} — à
 * appeler **une seule fois** sur la concaténation des trades de tous les
 * comptes, pas une fois par compte suivi d'une fusion manuelle, revue W-10)
 * et des jours de journal (`journalTradingDays`, déjà l'union de tous les
 * comptes concernés — un `Set`/tableau dédupliqué à la charge de l'appelant,
 * simple réunion sans calcul métier).
 *
 * `netPnl` est déjà la somme correcte tous comptes confondus pour ce jour
 * (puisque `days` provient d'un unique appel à `aggregateByTradingDay` sur
 * l'union des trades) : pas de ré-addition à faire ici. Précision (revue
 * post-M1) : l'ancienne implémentation web (`day.netPnl.plus(existing.pnl)`,
 * un `aggregateByTradingDay` **par compte** suivi d'une fusion manuelle) ne
 * sommait *pas* deux fois — ce `reduce` accumulait correctement le `netPnl`
 * de chaque compte pour un jour partagé. Le gain du regroupement ici n'est
 * donc pas la correction d'un double comptage, mais de ne faire **qu'un seul**
 * appel à `aggregateByTradingDay` (sur l'union des trades) au lieu d'un par
 * compte, et de placer cette logique dans `packages/core` plutôt que dans la
 * couche web (moins de code dupliqué, une seule fonction testée).
 *
 * @param days agrégats journaliers (un seul appel, tous comptes confondus), voir {@link aggregateByTradingDay}
 * @param journalTradingDays jours portant une entrée de journal (union de tous les comptes concernés)
 * @returns une entrée par jour de l'union, triée par `tradingDay` croissant
 */
export function buildMonthDayIndex(
  days: readonly DayAggregate[],
  journalTradingDays: readonly TradingDay[],
): MonthDayIndexEntry[] {
  const journalSet = new Set<TradingDay>(journalTradingDays);
  const entries = new Map<TradingDay, MonthDayIndexEntry>();

  for (const day of days) {
    const tradingDay = day.tradingDay as TradingDay;
    entries.set(tradingDay, {
      tradingDay,
      netPnl: day.tradesCount > 0 ? day.netPnl : null,
      hasJournalEntry: journalSet.has(tradingDay),
    });
  }
  for (const tradingDay of journalSet) {
    if (entries.has(tradingDay)) continue;
    entries.set(tradingDay, { tradingDay, netPnl: null, hasJournalEntry: true });
  }

  return [...entries.values()].sort((a, b) => compareOrdinal(a.tradingDay, b.tradingDay));
}
