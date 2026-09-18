import { Decimal } from '../money';
import type { DayAggregate } from './day';

export interface BestWorstDay {
  readonly tradingDay: string;
  readonly netPnl: Decimal;
}

/** Stats du mois (ARCHITECTURE §5.5 : « stats du mois »), calculées sur un mois déjà filtré. */
export interface MonthStats {
  readonly tradesCount: number;
  /** Jours où le P&L net du jour est strictement positif. */
  readonly winningDays: number;
  /** Jours où le P&L net du jour est strictement négatif. */
  readonly losingDays: number;
  /** Jours où le P&L net du jour est exactement 0 (au moins un trade, mais net nul). */
  readonly breakevenDays: number;
  readonly grossPnl: Decimal;
  readonly netPnl: Decimal;
  readonly fees: Decimal;
  /** Jour avec le plus haut P&L net, `null` si `days` est vide. */
  readonly bestDay: BestWorstDay | null;
  /** Jour avec le plus bas P&L net, `null` si `days` est vide. */
  readonly worstDay: BestWorstDay | null;
}

/**
 * Calcule les {@link MonthStats} d'un mois **déjà filtré** par l'appelant :
 * `days` ne doit contenir que les {@link DayAggregate} du mois voulu (clé de
 * requête par mois, ARCHITECTURE §5.5 — cette fonction ne filtre pas par
 * date, elle agrège ce qu'on lui donne).
 *
 * @param days agrégats journaliers du mois (voir {@link aggregateByTradingDay})
 */
export function computeMonthStats(days: readonly DayAggregate[]): MonthStats {
  let winningDays = 0;
  let losingDays = 0;
  let breakevenDays = 0;
  let tradesCount = 0;
  let grossPnl = new Decimal(0);
  let netPnl = new Decimal(0);
  let fees = new Decimal(0);
  let bestDay: BestWorstDay | null = null;
  let worstDay: BestWorstDay | null = null;

  for (const day of days) {
    if (day.netPnl.greaterThan(0)) winningDays += 1;
    else if (day.netPnl.lessThan(0)) losingDays += 1;
    else breakevenDays += 1;

    tradesCount += day.tradesCount;
    grossPnl = grossPnl.plus(day.grossPnl);
    netPnl = netPnl.plus(day.netPnl);
    fees = fees.plus(day.fees);

    if (bestDay === null || day.netPnl.greaterThan(bestDay.netPnl)) {
      bestDay = { tradingDay: day.tradingDay, netPnl: day.netPnl };
    }
    if (worstDay === null || day.netPnl.lessThan(worstDay.netPnl)) {
      worstDay = { tradingDay: day.tradingDay, netPnl: day.netPnl };
    }
  }

  return { tradesCount, winningDays, losingDays, breakevenDays, grossPnl, netPnl, fees, bestDay, worstDay };
}
