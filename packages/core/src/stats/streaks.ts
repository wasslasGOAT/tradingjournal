import { sortTradesChronologically } from './types';
import type { TradeRecord } from './types';

/** Type de série en cours : `'win'`/`'loss'` si le dernier trade n'est pas `breakeven`, `'none'` sinon (aucun trade, ou dernier trade à P&L = 0). */
export type StreakType = 'win' | 'loss' | 'none';

export interface StreaksResult {
  /** Plus longue série de trades gagnants consécutifs (`netPnl > 0`). */
  readonly longestWinStreak: number;
  /** Plus longue série de trades perdants consécutifs (`netPnl < 0`). */
  readonly longestLossStreak: number;
  /** Série en cours, à la fin de la période (le trade le plus récent par `closedAt`/`openedAt`). */
  readonly current: { readonly type: StreakType; readonly count: number };
}

/**
 * Plus longues séries de trades gagnants/perdants consécutifs, et série en
 * cours à la fin de la période.
 *
 * **Convention (P&L = 0)** : un trade `breakeven` (`netPnl === 0`) **casse**
 * toute série en cours (ni gagnante ni perdante) sans démarrer de nouvelle
 * série — il agit comme un trade neutre entre deux séries. Ordre
 * chronologique par `closedAt` (repli `openedAt`), voir
 * {@link sortTradesChronologically}.
 */
export function computeStreaks(trades: readonly TradeRecord[]): StreaksResult {
  const ordered = sortTradesChronologically(trades);

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentType: StreakType = 'none';
  let currentCount = 0;

  for (const trade of ordered) {
    if (trade.netPnl.greaterThan(0)) {
      currentCount = currentType === 'win' ? currentCount + 1 : 1;
      currentType = 'win';
      longestWinStreak = Math.max(longestWinStreak, currentCount);
    } else if (trade.netPnl.lessThan(0)) {
      currentCount = currentType === 'loss' ? currentCount + 1 : 1;
      currentType = 'loss';
      longestLossStreak = Math.max(longestLossStreak, currentCount);
    } else {
      currentType = 'none';
      currentCount = 0;
    }
  }

  return {
    longestWinStreak,
    longestLossStreak,
    current: { type: currentType, count: currentCount },
  };
}
