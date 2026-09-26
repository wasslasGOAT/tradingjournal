import type { Decimal } from '@repo/core';

/** Clé i18n (`calendar.dayState.<key>`) décrivant une cellule pour les lecteurs d'écran. */
export type CalendarDayStateKey = 'profit' | 'loss' | 'flat' | 'journalOnly' | 'today' | 'empty';

/**
 * Résout la clé d'état d'un jour de calendrier (W-6, copie de
 * `apps/app/features/calendar/resolveCalendarDayStateKey.ts`, gelé, ADR-023) :
 * « aujourd'hui » prime sur le contenu, sinon trades (profit/perte/neutre) >
 * journal seul > vide. `pnl` est ici un `Decimal` déjà calculé par
 * `src/data/calendar.ts` (pas une chaîne à reconvertir).
 */
export function resolveCalendarDayStateKey(
  pnl: Decimal | null,
  hasJournalEntry: boolean,
  isToday: boolean,
): CalendarDayStateKey {
  if (isToday) return 'today';
  if (pnl === null) return hasJournalEntry ? 'journalOnly' : 'empty';

  if (pnl.isZero()) return 'flat';
  return pnl.isNegative() ? 'loss' : 'profit';
}
