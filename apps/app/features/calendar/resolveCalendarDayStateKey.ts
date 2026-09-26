import { parseAmount } from '@repo/core';
import type { Decimal } from '@repo/core';

/** Clé i18n (`calendar.dayState.<key>`) décrivant une cellule pour les lecteurs d'écran. */
export type CalendarDayStateKey = 'profit' | 'loss' | 'flat' | 'journalOnly' | 'today' | 'empty';

/**
 * Résout la clé d'état d'un jour de calendrier (M1-8) : « aujourd'hui » prime
 * sur le contenu (modificateur indépendant, même convention que
 * `@repo/ui`/`DayCell#dayCellState.ts`), sinon trades (profit/perte/neutre) >
 * journal seul > vide.
 *
 * Logique volontairement réimplémentée ici plutôt qu'importée depuis
 * `@repo/ui` (qui n'expose que son barrel `.` — pas de sous-chemin `exports`
 * pour `dayCellState.ts` seul) : ce fichier reste importable sous Vitest/Node
 * sans dépendance transitive à `react-native` (voir `vitest.config.mts`,
 * « pas de rendu React Native dans Vitest »). Les deux implémentations sont
 * tenues synchronisées par construction (règle triviale, testée aux deux
 * endroits : `packages/ui/.../dayCellState.test.ts` et ce fichier).
 */
export function resolveCalendarDayStateKey(
  pnl: string | null,
  hasJournalEntry: boolean,
  isToday: boolean,
): CalendarDayStateKey {
  if (isToday) return 'today';
  if (pnl === null) return hasJournalEntry ? 'journalOnly' : 'empty';

  const decimal: Decimal = parseAmount(pnl);
  if (decimal.isZero()) return 'flat';
  return decimal.isNegative() ? 'loss' : 'profit';
}
