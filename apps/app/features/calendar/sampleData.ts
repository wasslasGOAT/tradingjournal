import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

/**
 * Données factices du calendrier (M1-8) : chaînes décimales (comme les
 * colonnes `numeric` Postgres lues en `::text`, ADR-016) — jamais de `number`
 * flottant pour un montant (CLAUDE.md). Le vrai calendrier (`@repo/core/aggregates`,
 * agrégats sur les trades du mois filtré) arrive en M3.
 */
export const SAMPLE_CALENDAR_CURRENCY = 'USD';

export const SAMPLE_CALENDAR_MONTH = { year: 2026, month: 9 } as const;

/** « Aujourd'hui » du jeu de données factice (aligné sur la date de démonstration). */
export const SAMPLE_TODAY: TradingDay = toTradingDay('2026-09-19');

/** Jour arbitraire du mois affiché, pour libeller l'en-tête (`formatMonthLabel`) sans dépendre d'une cellule de bourrage. */
export const SAMPLE_MONTH_LABEL_DAY: TradingDay = toTradingDay('2026-09-15');

export interface SampleCalendarDay {
  readonly tradingDay: TradingDay;
  /** `null` = aucun trade ce jour-là. */
  readonly pnl: string | null;
  readonly hasJournalEntry: boolean;
}

export const SAMPLE_CALENDAR_DAYS: readonly SampleCalendarDay[] = [
  { tradingDay: toTradingDay('2026-09-01'), pnl: '312.40', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-02'), pnl: '-145.10', hasJournalEntry: false },
  { tradingDay: toTradingDay('2026-09-03'), pnl: null, hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-04'), pnl: '208.90', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-07'), pnl: '412.00', hasJournalEntry: false },
  { tradingDay: toTradingDay('2026-09-08'), pnl: '-88.25', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-09'), pnl: '0', hasJournalEntry: false },
  { tradingDay: toTradingDay('2026-09-10'), pnl: '156.60', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-11'), pnl: '-322.75', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-14'), pnl: '94.10', hasJournalEntry: false },
  { tradingDay: toTradingDay('2026-09-15'), pnl: '267.30', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-16'), pnl: null, hasJournalEntry: false },
  { tradingDay: toTradingDay('2026-09-17'), pnl: '-59.40', hasJournalEntry: true },
  { tradingDay: toTradingDay('2026-09-18'), pnl: '331.20', hasJournalEntry: true },
  { tradingDay: SAMPLE_TODAY, pnl: '0', hasJournalEntry: true },
];

export const SAMPLE_MONTH_STATS = {
  netPnl: '1284.50',
  winningDays: '9',
  losingDays: '5',
  tradesCount: '37',
} as const;
