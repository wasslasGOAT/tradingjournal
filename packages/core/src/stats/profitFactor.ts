import { Decimal } from '../money';
import { filterClosedTrades } from './types';
import type { TradeRecord } from './types';

/**
 * Raison pour laquelle {@link computeProfitFactor} renvoie `value: null` :
 * - `no_losing_trades` : aucune perte (`grossLosses === 0`) mais au moins un
 *   gain -> le profit factor est mathématiquement infini (division par 0).
 * - `no_trades` : aucun trade gagnant ni perdant (`breakeven` uniquement ou
 *   collection vide) -> ratio indéfini (0 / 0).
 */
export type ProfitFactorReason = 'no_losing_trades' | 'no_trades';

export interface ProfitFactorResult {
  /** `null` si indéfini — voir {@link ProfitFactorReason}. */
  readonly value: Decimal | null;
  readonly reason: ProfitFactorReason | null;
  /** Somme des `netPnl` strictement positifs (trades `breakeven` exclus, voir `computeWinLossCounts`). */
  readonly grossWins: Decimal;
  /** Somme des `|netPnl|` strictement négatifs (trades `breakeven` exclus). */
  readonly grossLosses: Decimal;
}

/**
 * Profit factor : rapport entre les gains bruts et les pertes brutes.
 *
 * Formule : `grossWins / grossLosses` où `grossWins = Σ netPnl (netPnl > 0)`
 * et `grossLosses = Σ |netPnl| (netPnl < 0)` — les trades `breakeven`
 * (P&L = 0) n'entrent dans aucune des deux sommes (même convention que
 * {@link computeWinRate}, voir `winRate.ts`).
 *
 * @returns `{ value: null, reason }` si aucune perte (profit factor infini) ou aucun trade décisif — jamais de `Infinity`/`NaN` (CLAUDE.md : pas de `number` flottant pour l'argent, et un `null` explicite est plus sûr côté UI qu'un infini silencieux)
 */
export function computeProfitFactor(trades: readonly TradeRecord[]): ProfitFactorResult {
  let grossWins = new Decimal(0);
  let grossLosses = new Decimal(0);
  for (const trade of filterClosedTrades(trades)) {
    if (trade.netPnl.greaterThan(0)) grossWins = grossWins.plus(trade.netPnl);
    else if (trade.netPnl.lessThan(0)) grossLosses = grossLosses.plus(trade.netPnl.abs());
  }

  if (grossLosses.isZero()) {
    const reason: ProfitFactorReason = grossWins.isZero() ? 'no_trades' : 'no_losing_trades';
    return { value: null, reason, grossWins, grossLosses };
  }
  return { value: grossWins.dividedBy(grossLosses), reason: null, grossWins, grossLosses };
}
