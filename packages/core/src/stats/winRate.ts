import { Decimal } from '../money';
import type { TradeRecord } from './types';

/**
 * Répartition gagnants/perdants/nuls d'une collection de {@link TradeRecord}.
 *
 * **Convention P&L = 0 (à valider par l'utilisateur, ROADMAP M3)** : un trade
 * dont `netPnl` vaut exactement `0` est classé `breakeven` — il n'est **ni**
 * gagnant **ni** perdant. Il est compté dans `total` (et doit être compté
 * par l'appelant dans le nombre de trades affiché), mais **exclu** du
 * dénominateur de {@link computeWinRate} et du numérateur/dénominateur de
 * `computeProfitFactor` (aucune des deux sommes, gains ou pertes, n'inclut
 * un montant nul). Raisonnement : un trade à 0 n'apporte aucune preuve pour
 * ou contre l'edge, mais il a bien eu lieu (frais/temps engagés) donc
 * compte dans le volume de trades.
 */
export interface WinLossCounts {
  readonly wins: number;
  readonly losses: number;
  readonly breakeven: number;
  readonly total: number;
}

/** Calcule {@link WinLossCounts} à partir de `netPnl` (voir convention P&L = 0 ci-dessus). */
export function computeWinLossCounts(trades: readonly TradeRecord[]): WinLossCounts {
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  for (const trade of trades) {
    if (trade.netPnl.greaterThan(0)) wins += 1;
    else if (trade.netPnl.lessThan(0)) losses += 1;
    else breakeven += 1;
  }
  return { wins, losses, breakeven, total: trades.length };
}

/**
 * Taux de réussite (win rate).
 *
 * Formule : `wins / (wins + losses)` — les trades `breakeven` (P&L = 0, voir
 * {@link computeWinLossCounts}) sont exclus du dénominateur : un trade nul ne
 * compte ni comme une victoire ni comme une défaite.
 *
 * @returns le win rate en fraction (ex. `0.16` pour 16 %, voir `formatPercent`), ou `null` si `wins + losses === 0` (aucun trade décisif)
 */
export function computeWinRate(trades: readonly TradeRecord[]): Decimal | null {
  const { wins, losses } = computeWinLossCounts(trades);
  const decisive = wins + losses;
  if (decisive === 0) return null;
  return new Decimal(wins).dividedBy(decisive);
}
