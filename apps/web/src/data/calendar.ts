import {
  aggregateByTradingDay,
  assertSingleCurrency,
  buildCalendarGrid,
  buildMonthDayIndex,
  computeMonthStats,
  Decimal,
  groupTradesByTradingDay,
  isTradingDayInMonth,
  toTradingDay,
} from '@repo/core';
import type {
  CalendarGridCell,
  MonthStats,
  TradeRecord,
  TradingDay,
  WeekStartsOn,
} from '@repo/core';

import { resolveAccountIds } from './accounts';
import { dataQueryKeys } from './queryKeys';
import { SAMPLE_ACCOUNTS_META } from './sample/accountsSampleData';
import {
  SAMPLE_JOURNAL_TRADING_DAYS,
  sampleTradeRecordsForAccount,
} from './sample/tradesSampleData';

/**
 * Couche données du Calendrier (W-6, revue W-10, ADR-016/ADR-023) : agrège
 * les trades factices du mois demandé via `@repo/core/aggregates`
 * (`aggregateByTradingDay` **une seule fois** sur l'union des trades de tous
 * les comptes sélectionnés, puis `buildMonthDayIndex`/`groupTradesByTradingDay`/
 * `computeMonthStats`/`buildCalendarGrid`) — jamais de calcul de date ni de
 * P&L ici au-delà de la lecture/composition (refactor revue W-10 : une seule
 * agrégation sur l'union des trades plutôt qu'une fusion manuelle par compte,
 * et filtrage par mois via `isTradingDayInMonth`, `packages/core`, plutôt
 * qu'un `isInMonth` local). Filtré par compte et par mois (année + mois
 * civils) : clé de requête dédiée (`dataQueryKeys.calendarMonth`).
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
  const accountsMeta = accountIds.map((id) => SAMPLE_ACCOUNTS_META[id]);
  // ADR-019 : pas de conversion pendant le MVP — ne devrait pas arriver avec les comptes factices actuels (tous `USD`).
  assertSingleCurrency(accountsMeta);
  const currency = accountsMeta[0]?.currency ?? 'USD';

  // Union des trades/jours de journal de tous les comptes sélectionnés, un
  // seul appel `aggregateByTradingDay` (voir le commentaire de tête de
  // fichier, et celui de `buildMonthDayIndex`, `@repo/core`).
  const trades = accountIds.flatMap((accountId) =>
    sampleTradeRecordsForAccount(accountId).filter((trade) =>
      isTradingDayInMonth(toTradingDay(trade.tradingDay), filters.year, filters.month),
    ),
  );
  const journalTradingDays = accountIds.flatMap((accountId) =>
    SAMPLE_JOURNAL_TRADING_DAYS[accountId]
      .map((day) => toTradingDay(day))
      .filter((day) => isTradingDayInMonth(day, filters.year, filters.month)),
  );

  const days = aggregateByTradingDay(new Decimal(0), trades);
  const monthDayIndex = buildMonthDayIndex(days, journalTradingDays);
  const tradesByDay = groupTradesByTradingDay(trades);

  const dayByTradingDay = new Map<TradingDay, CalendarDayData>(
    monthDayIndex.map((entry) => [
      entry.tradingDay,
      {
        tradingDay: entry.tradingDay,
        pnl: entry.netPnl,
        hasJournalEntry: entry.hasJournalEntry,
        trades: tradesByDay.get(entry.tradingDay) ?? [],
      },
    ]),
  );

  const monthStats = computeMonthStats(days);
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
 * fluidité. `staleTime` garde le résultat en cache tel quel pendant 5
 * minutes (pas « toute la session », corrigé revue W-10) ; un vrai backend
 * (M4/M5, Supabase) reviendra sur ce réglage avec `database`/`backend`
 * selon la fraîcheur réellement requise.
 */
const CALENDAR_MONTH_STALE_TIME_MS = 5 * 60 * 1000;

export function calendarMonthQueryOptions(filters: CalendarFilters) {
  return {
    queryKey: dataQueryKeys.calendarMonth(
      filters.accountId,
      filters.year,
      filters.month,
      filters.weekStartsOn,
    ),
    queryFn: () => getCalendarMonthSummary(filters),
    // Pas de `placeholderData: keepPreviousData` (corrigé revue W-10, ADR-017 :
    // « aucune donnée périmée visible ») : ça s'appliquait aussi au changement de
    // *compte*, pas seulement de mois, et le libellé du mois affiché ne
    // correspondait plus à la grille pendant la résolution de la nouvelle requête.
    // Le préchargement des mois voisins (`CalendarScreen`) et `staleTime`
    // ci-dessus suffisent à éviter le squelette sur un mois déjà visité ; un mois
    // jamais visité affiche le squelette le temps du premier fetch, comme voulu.
    staleTime: CALENDAR_MONTH_STALE_TIME_MS,
  };
}
