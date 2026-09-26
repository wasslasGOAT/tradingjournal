import { Decimal } from '../money';
import { filterClosedTrades } from '../stats';
import type { TradeRecord } from '../stats';

/**
 * Mouvement de trésorerie déjà résolu sur un jour de trading — signature
 * volontairement minimale (juste ce dont {@link aggregateByTradingDay} a
 * besoin) pour ne pas dépendre du fuseau du compte ici : c'est à l'appelant
 * de résoudre `tradingDay` (voir `packages/core/time` `tradingDayOf`) et le
 * signe (voir `packages/core/trading` `signedCashMovementAmount`) avant
 * d'appeler cette fonction.
 */
export interface ResolvedCashMovement {
  readonly tradingDay: string;
  /** Montant déjà signé (positif = augmente le solde), voir `signedCashMovementAmount`. */
  readonly signedAmount: Decimal;
}

/**
 * Agrégat d'un jour de trading — cellule de calendrier (ARCHITECTURE §5.5),
 * proche de DATA_MODEL `daily_stats` (non matérialisée pendant le MVP,
 * ADR-016 : calculée ici à la volée).
 */
export interface DayAggregate {
  readonly tradingDay: string;
  readonly tradesCount: number;
  readonly wins: number;
  readonly losses: number;
  /** Trades à P&L net = 0 (voir convention `packages/core/stats` `computeWinLossCounts`), comptés dans `tradesCount` mais ni `wins` ni `losses`. */
  readonly breakeven: number;
  readonly grossPnl: Decimal;
  readonly netPnl: Decimal;
  /** Somme de `commission + fees` de tous les trades du jour (DATA_MODEL `daily_stats.fees` regroupe les deux). */
  readonly fees: Decimal;
  /** Somme des `rMultiple` connus du jour ; `null` si aucun trade du jour n'a de R multiple renseigné. */
  readonly rTotal: Decimal | null;
  /** Somme des `quantity` du jour (DATA_MODEL `daily_stats.volume`). */
  readonly volume: Decimal;
  /** `netPnl` du meilleur trade du jour, `null` si aucun trade. */
  readonly bestTrade: Decimal | null;
  /** `netPnl` du pire trade du jour, `null` si aucun trade. */
  readonly worstTrade: Decimal | null;
  /** Solde du compte à la clôture de ce jour (solde initial + P&L net cumulé + mouvements de trésorerie cumulés, jusqu'à ce jour inclus). */
  readonly endBalance: Decimal;
}

/**
 * Agrège des {@link TradeRecord} par jour de trading (`tradingDay`), triés
 * chronologiquement — une ligne par jour **où au moins un trade a eu lieu**
 * (pas de jour vide inséré : à la charge de l'appelant/UI pour le rendu du
 * calendrier). `endBalance` est cumulatif : chaque jour part du solde de
 * clôture du jour précédent.
 *
 * @param startingBalance solde initial du compte (`accounts.starting_balance`)
 * @param trades trades à agréger (trades `open` ignorés, voir {@link filterClosedTrades} ; tous comptes confondus si l'appelant le souhaite, mais `endBalance` n'a de sens que pour un seul compte)
 * @param cashMovements mouvements de trésorerie déjà résolus par jour (voir {@link ResolvedCashMovement}), défaut `[]`
 * @returns un {@link DayAggregate} par jour présent dans `trades` (ou dans `cashMovements`), trié par `tradingDay` croissant
 */
export function aggregateByTradingDay(
  startingBalance: Decimal,
  trades: readonly TradeRecord[],
  cashMovements: readonly ResolvedCashMovement[] = [],
): DayAggregate[] {
  const closedTrades = filterClosedTrades(trades);
  const days = new Set<string>();
  for (const t of closedTrades) days.add(t.tradingDay);
  for (const m of cashMovements) days.add(m.tradingDay);
  const sortedDays = [...days].sort();

  const tradesByDay = new Map<string, TradeRecord[]>();
  for (const t of closedTrades) {
    const list = tradesByDay.get(t.tradingDay);
    if (list) list.push(t);
    else tradesByDay.set(t.tradingDay, [t]);
  }
  const cashByDay = new Map<string, Decimal>();
  for (const m of cashMovements) {
    cashByDay.set(
      m.tradingDay,
      (cashByDay.get(m.tradingDay) ?? new Decimal(0)).plus(m.signedAmount),
    );
  }

  const result: DayAggregate[] = [];
  let runningBalance = startingBalance;

  for (const day of sortedDays) {
    const dayTrades = tradesByDay.get(day) ?? [];
    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let grossPnl = new Decimal(0);
    let netPnl = new Decimal(0);
    let fees = new Decimal(0);
    let rTotal: Decimal | null = null;
    let volume = new Decimal(0);
    let bestTrade: Decimal | null = null;
    let worstTrade: Decimal | null = null;

    for (const t of dayTrades) {
      if (t.netPnl.greaterThan(0)) wins += 1;
      else if (t.netPnl.lessThan(0)) losses += 1;
      else breakeven += 1;

      grossPnl = grossPnl.plus(t.grossPnl);
      netPnl = netPnl.plus(t.netPnl);
      fees = fees.plus(t.commission).plus(t.fees);
      volume = volume.plus(t.quantity);
      if (t.rMultiple !== null) rTotal = (rTotal ?? new Decimal(0)).plus(t.rMultiple);
      bestTrade = bestTrade === null || t.netPnl.greaterThan(bestTrade) ? t.netPnl : bestTrade;
      worstTrade = worstTrade === null || t.netPnl.lessThan(worstTrade) ? t.netPnl : worstTrade;
    }

    const cashTotal = cashByDay.get(day) ?? new Decimal(0);
    runningBalance = runningBalance.plus(netPnl).plus(cashTotal);

    result.push({
      tradingDay: day,
      tradesCount: dayTrades.length,
      wins,
      losses,
      breakeven,
      grossPnl,
      netPnl,
      fees,
      rTotal,
      volume,
      bestTrade,
      worstTrade,
      endBalance: runningBalance,
    });
  }

  return result;
}
