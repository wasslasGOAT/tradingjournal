import type { Decimal } from '@repo/core';

import type { PnlIntent } from '../../tokens';

/**
 * Logique pure d'état de `DayCell` (M1-3, ARCHITECTURE §6.2 : « cellule de
 * calendrier : états profit / perte / journal seul / aujourd'hui / vide »).
 *
 * `today` est un **modificateur** (bordure) indépendant du contenu — un jour
 * peut être « aujourd'hui » et avoir des trades, un journal seul, ou être
 * vide. Le contenu (`DayCellContentState`) et la couleur P&L (`PnlIntent`,
 * quand des trades existent) sont en revanche mutuellement exclusifs.
 */
export type DayCellContentState = 'trades' | 'journalOnly' | 'empty';

/** `pnl === null` -> pas de trade ce jour-là (journal seul ou vide selon `hasJournalEntry`). */
export function resolveDayCellContentState(
  pnl: Decimal | null,
  hasJournalEntry: boolean,
): DayCellContentState {
  if (pnl !== null) return 'trades';
  return hasJournalEntry ? 'journalOnly' : 'empty';
}

/** Intention P&L du jour (pour la couleur du montant), `null` si aucun trade. */
export function resolveDayCellPnlIntent(pnl: Decimal | null): PnlIntent | null {
  if (pnl === null) return null;
  if (pnl.isZero()) return 'flat';
  return pnl.isNegative() ? 'loss' : 'profit';
}
