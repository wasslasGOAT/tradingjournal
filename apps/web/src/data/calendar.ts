import {
  aggregateByTradingDay,
  buildCalendarGrid,
  computeMonthStats,
  Decimal,
  parseAmount,
} from '@repo/core';
import type {
  CalendarGridCell,
  MonthStats,
  TradeRecord,
  TradingDay,
  WeekStartsOn,
} from '@repo/core';
import { keepPreviousData } from '@tanstack/react-query';

import { resolveAccountIds } from './accounts';
import { dataQueryKeys } from './queryKeys';
import { SAMPLE_ACCOUNTS_META } from './sample/accountsSampleData';
import {
  SAMPLE_JOURNAL_TRADING_DAYS,
  sampleTradeRecordsForAccount,
} from './sample/tradesSampleData';

/**
 * Couche données du Calendrier (W-6, ADR-016/ADR-023) : agrège les trades
 * factices du mois demandé via `@repo/core/aggregates` (`aggregateByTradingDay`,
 * `computeMonthStats`, `buildCalendarGrid`, W-6b) — jamais de calcul de date
 * ni de P&L ici au-delà de la lecture/composition. Filtré par compte et par
 * mois (année + mois civils) : clé de requête dédiée (`dataQueryKeys.calendarMonth`).
 */
export interface CalendarFilters {
  readonly accountId: string;
  readonly year: number;
  readonly month: number;
  readonly weekStartsOn: WeekStartsOn;
}

export interface CalendarDayData {
  readonly tradingDay: TradingDay;
  /** `null` si aucun trade ce jour (peut tout de même avoir `hasJournalEntry`). */
  readonly pnl: Decimal | null;
  readonly hasJournalEntry: boolean;
  readonly trades: readonly TradeRecord[];
}

export interface CalendarMonthSummary {
  readonly currency: string;
  readonly weeks: readonly (readonly CalendarGridCell[])[];
  readonly dayByTradingDay: ReadonlyMap<TradingDay, CalendarDayData>;
  readonly monthStats: MonthStats;
}

function isInMonth(tradingDay: string, year: number, month: number): boolean {
  const [y = 0, m = 0] = tradingDay.split('-').map(Number);
  return y === year && m === month;
}

/**
 * Résumé du calendrier pour un compte (ou `'all'`) et un mois civil.
 * Fonction pure synchrone enveloppée en `Promise` (même forme que le futur
 * appel Supabase).
 */
export async function getCalendarMonthSummary(
  filters: CalendarFilters,
): Promise<CalendarMonthSummary> {
  // Voir le commentaire équivalent dans `dashboard.ts#getDashboardSummary`.
  await Promise.resolve();
  const accountIds = resolveAccountIds(filters.accountId);
  const currencies = new Set(accountIds.map((id) => SAMPLE_ACCOUNTS_META[id].currency));
  if (currencies.size > 1) {
    throw new Error('Agrégation multi-devises non prise en charge pendant le MVP (ADR-019).');
  }
  const currency = [...currencies][0] ?? 'USD';

  const dayByTradingDay = new Map<TradingDay, CalendarDayData>();

  for (const accountId of accountIds) {
    const trades = sampleTradeRecordsForAccount(accountId).filter((trade) =>
      isInMonth(trade.tradingDay, filters.year, filters.month),
    );
    const journalDays = SAMPLE_JOURNAL_TRADING_DAYS[accountId].filter((day) =>
      isInMonth(day, filters.year, filters.month),
    );
    const days = aggregateByTradingDay(new Decimal(0), trades);

    for (const day of days) {
      const tradingDay = day.tradingDay as TradingDay;
      const existing = dayByTradingDay.get(tradingDay);
      const dayTrades = trades.filter((trade) => trade.tradingDay === tradingDay);
      const hasJournalEntry = existing?.hasJournalEntry || journalDays.includes(tradingDay);
      const pnl =
        day.tradesCount > 0
          ? day.netPnl.plus(existing?.pnl ?? new Decimal(0))
          : (existing?.pnl ?? null);
      dayByTradingDay.set(tradingDay, {
        tradingDay,
        pnl,
        hasJournalEntry,
        trades: [...(existing?.trades ?? []), ...dayTrades],
      });
    }
    for (const journalDay of journalDays) {
      const tradingDay = journalDay as TradingDay;
      if (dayByTradingDay.has(tradingDay)) continue;
      dayByTradingDay.set(tradingDay, { tradingDay, pnl: null, hasJournalEntry: true, trades: [] });
    }
  }

  const daysForStats = aggregateByTradingDay(
    parseAmount('0'),
    [...dayByTradingDay.values()].flatMap((day) => day.trades),
  );
  const monthStats = computeMonthStats(daysForStats);
  const weeks = buildCalendarGrid(filters.year, filters.month, filters.weekStartsOn);

  return { currency, weeks, dayByTradingDay, monthStats };
}

/**
 * Le `QueryClient` global (`src/main.tsx`) n'a pas de `staleTime` par défaut
 * (`0`) : sans réglage local, revenir sur un mois déjà visité (ex. mois
 * suivant puis mois précédent, W-9 boucle 2) redéclenche quand même un
 * fetch en arrière-plan — donc un recalcul complet (`aggregateByTradingDay`,
 * `computeMonthStats`, `buildCalendarGrid`) — à chaque clic, alors que les
 * données factices de ce mois n'ont pas changé. Mesuré au profil CPU comme
 * un doublement inutile du travail sur les allers-retours du test de
 * fluidité. `staleTime` garde le résultat en cache tel quel pour toute la
 * session (les données factices ne changent jamais pendant le MVP,
 * ADR-016) ; un vrai backend (M4/M5, Supabase) reviendra sur ce réglage
 * avec `database`/`backend` selon la fraîcheur réellement requise.
 */
const CALENDAR_MONTH_STALE_TIME_MS = 5 * 60 * 1000;

export function calendarMonthQueryOptions(filters: CalendarFilters) {
  return {
    queryKey: dataQueryKeys.calendarMonth(filters.accountId, filters.year, filters.month),
    queryFn: () => getCalendarMonthSummary(filters),
    // Changement de mois (W-9, ADR-017) : garde le mois précédent affiché pendant la
    // résolution du suivant plutôt que de démonter la grille vers le squelette — évite
    // le remontage complet de ~35 `DayCell` à chaque clic (cause de saccades sous CPU
    // ralenti). Ne redonne jamais de données périmées d'un *autre* compte/période :
    // la clé de requête reste filtrée par compte + année + mois (règle du projet).
    placeholderData: keepPreviousData,
    staleTime: CALENDAR_MONTH_STALE_TIME_MS,
  };
}
