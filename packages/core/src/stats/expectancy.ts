import { Decimal } from '../money';
import type { TradeRecord } from './types';

/**
 * Espérance mathématique (gain net moyen par trade).
 *
 * Formule : `Σ netPnl / count(trades)` — **tous** les trades comptent
 * (gagnants, perdants et `breakeven`), contrairement au win rate et au
 * profit factor : l'espérance mesure le résultat moyen réel par trade, un
 * `0` y a donc sa place à part entière (il tire la moyenne, comme n'importe
 * quel montant).
 *
 * @returns `null` si `trades` est vide (moyenne indéfinie)
 */
export function computeExpectancy(trades: readonly TradeRecord[]): Decimal | null {
  if (trades.length === 0) return null;
  const total = trades.reduce((acc, t) => acc.plus(t.netPnl), new Decimal(0));
  return total.dividedBy(trades.length);
}

export interface AverageWinLoss {
  /** Moyenne des `netPnl` strictement positifs, `null` si aucun gagnant. */
  readonly averageWin: Decimal | null;
  /** Moyenne des `netPnl` strictement négatifs (valeur **négative**), `null` si aucun perdant. */
  readonly averageLoss: Decimal | null;
}

/**
 * Gain moyen et perte moyenne (trades `breakeven` exclus des deux moyennes,
 * même convention que {@link computeWinLossCounts}).
 *
 * `averageLoss` est renvoyé **négatif** (moyenne de valeurs négatives) : pour
 * le ratio moyen (`computeAverageRatio`), c'est sa valeur absolue qui compte.
 */
export function computeAverageWinLoss(trades: readonly TradeRecord[]): AverageWinLoss {
  let winSum = new Decimal(0);
  let winCount = 0;
  let lossSum = new Decimal(0);
  let lossCount = 0;
  for (const trade of trades) {
    if (trade.netPnl.greaterThan(0)) {
      winSum = winSum.plus(trade.netPnl);
      winCount += 1;
    } else if (trade.netPnl.lessThan(0)) {
      lossSum = lossSum.plus(trade.netPnl);
      lossCount += 1;
    }
  }
  return {
    averageWin: winCount === 0 ? null : winSum.dividedBy(winCount),
    averageLoss: lossCount === 0 ? null : lossSum.dividedBy(lossCount),
  };
}

/**
 * Ratio moyen : gain moyen / |perte moyenne|.
 *
 * Formule : `averageWin / abs(averageLoss)` (voir {@link computeAverageWinLoss}).
 * Équivalent à `profitFactor * (losses / wins)` quand aucun trade n'est
 * `breakeven` (mêmes sommes divisées différemment) — voir `computeProfitFactor`.
 *
 * @returns `null` si aucun gagnant ou aucun perdant (ratio indéfini, même logique que le profit factor)
 */
export function computeAverageRatio(trades: readonly TradeRecord[]): Decimal | null {
  const { averageWin, averageLoss } = computeAverageWinLoss(trades);
  if (averageWin === null || averageLoss === null) return null;
  return averageWin.dividedBy(averageLoss.abs());
}
