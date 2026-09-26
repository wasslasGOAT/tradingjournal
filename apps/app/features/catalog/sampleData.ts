import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

/**
 * Données factices du catalogue de composants (M1-3, T… — `apps/app/app/(dev)/catalog.tsx`).
 * Chaînes décimales volontaires (comme les colonnes `numeric` Postgres lues en
 * `::text`, ADR-005) : converties par `@repo/core#parseAmount` dans les
 * composants, jamais de `number` flottant.
 */

export const SAMPLE_CURRENCY = 'USD';

/** Jour de référence pour la démo `DateRangePicker` (M1-4) — fixe, pour un aperçu stable indépendant de la date réelle. */
export const SAMPLE_TODAY: TradingDay = toTradingDay('2026-09-19');

export const SAMPLE_STAT_TILES = {
  netPnlPositive: '1284.50',
  netPnlNegative: '-642.10',
  winRate: '0.612',
  tradesCount: '37',
} as const;

/** Fraction `[0, 1]` pour `ProgressBar`. */
export const SAMPLE_PROGRESS = 0.68;

export interface SampleDayCell {
  readonly day: string;
  readonly pnl: string | null;
  readonly hasJournalEntry: boolean;
  readonly isToday: boolean;
}

/** Une cellule par état demandé (ARCHITECTURE §6.2) : profit, perte, journal seul, vide, aujourd'hui. */
export const SAMPLE_DAY_CELLS: readonly SampleDayCell[] = [
  { day: '3', pnl: '245.80', hasJournalEntry: false, isToday: false },
  { day: '4', pnl: '-128.40', hasJournalEntry: false, isToday: false },
  { day: '5', pnl: null, hasJournalEntry: true, isToday: false },
  { day: '6', pnl: null, hasJournalEntry: false, isToday: false },
  { day: '7', pnl: '0', hasJournalEntry: false, isToday: true },
];
