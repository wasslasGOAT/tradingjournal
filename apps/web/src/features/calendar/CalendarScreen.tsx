import {
  Decimal,
  formatDayNumber,
  formatMonthLabel,
  formatWeekdayShort,
  sumAmountStrings,
  toAmountString,
} from '@repo/core';
import type { TradingDay } from '@repo/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DayCell } from '@/components/ui/day-cell';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { ResponsiveSheet } from '@/components/ui/sheet-responsive';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { TradeListRow } from '@/components/ui/trade-list-row';
import { useToast } from '@/components/ui/use-toast';
import { WeekTotalCell } from '@/components/ui/week-total-cell';
import { calendarMonthQueryOptions } from '@/data/calendar';
import { useVisibilityStore } from '@/features/preferences/visibility-store';
import { resolveApproximateToday } from '@/features/shell/filters';
import { resolveLocale } from '@/lib/i18n';
import { useWindowWidth } from '@/lib/use-media-query';

import { dayNumberFromTradingDay, isNarrowCalendarLayout } from './calendarLayout';
import type { CalendarDayStateKey } from './resolveCalendarDayStateKey';
import { resolveCalendarDayStateKey } from './resolveCalendarDayStateKey';

/** Toutes les valeurs possibles de {@link CalendarDayStateKey} (voir ce type). */
const DAY_STATE_KEYS: readonly CalendarDayStateKey[] = [
  'profit',
  'loss',
  'flat',
  'journalOnly',
  'today',
  'empty',
];

/** Premier jour de la semaine par locale (`packages/core` n'expose pas encore ce réglage par préférence utilisateur, M2+). */
const WEEK_STARTS_ON: Record<'fr' | 'en', 0 | 1> = { fr: 1, en: 0 };

interface MonthCursor {
  readonly year: number;
  readonly month: number;
}

/** Décale un curseur année/mois de `delta` mois (`-1`/`+1` : navigation calendrier). */
function shiftCursor(cursor: MonthCursor, delta: -1 | 1): MonthCursor {
  if (delta === -1) {
    return cursor.month === 1
      ? { year: cursor.year - 1, month: 12 }
      : { year: cursor.year, month: cursor.month - 1 };
  }
  return cursor.month === 12
    ? { year: cursor.year + 1, month: 1 }
    : { year: cursor.year, month: cursor.month + 1 };
}

/**
 * Semaine de référence (2023-01-01 = dimanche) réordonnée `dimanche->samedi`
 * en `lundi->dimanche` — utilisée uniquement pour lire le libellé de
 * jour de semaine abrégé (`formatWeekdayShort`) de chaque colonne d'en-tête.
 * Aucun rapport avec le mois affiché : la séquence des jours de semaine par
 * colonne ne dépend que de `weekStartsOn`, jamais du mois (W-9 boucle 2,
 * ADR-017) — recalculer ces 7 libellés à chaque changement de mois (comme
 * avant, via `data.weeks[0]`) refaisait un travail identique à chaque clic
 * pour un résultat qui ne change jamais tant que la locale ne change pas.
 */
const SUNDAY_START_REFERENCE_WEEK = [
  '2023-01-01',
  '2023-01-02',
  '2023-01-03',
  '2023-01-04',
  '2023-01-05',
  '2023-01-06',
  '2023-01-07',
] as const;
const REFERENCE_WEEK_BY_WEEK_STARTS_ON: Record<0 | 1, readonly string[]> = {
  0: SUNDAY_START_REFERENCE_WEEK,
  1: [...SUNDAY_START_REFERENCE_WEEK.slice(1), SUNDAY_START_REFERENCE_WEEK[0]],
};

/**
 * Écran Calendrier (W-6, ARCHITECTURE §5.5) : grille du mois (`DayCell` par
 * jour, `WeekTotalCell` par semaine) + stats du mois, navigation mois
 * précédent/suivant (état local, clé de requête par compte + année + mois),
 * repli mobile < 360 px, détail du jour en `Sheet`. 4 états gérés :
 * squelette, vide, erreur, rempli.
 */
export function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const search = useSearch({ from: '/_shell' });
  const locale = resolveLocale(i18n.language);
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts);
  const { show } = useToast();
  const width = useWindowWidth();
  const narrow = width > 0 && isNarrowCalendarLayout(width);

  const [cursor, setCursor] = useState(() => {
    const [year = 2026, month = 1] = search.to.split('-').map(Number);
    return { year, month };
  });
  const [selectedDay, setSelectedDay] = useState<TradingDay | null>(null);
  const today = useMemo(() => resolveApproximateToday(), []);

  const weekStartsOn = WEEK_STARTS_ON[locale];
  const filters = {
    accountId: search.account,
    year: cursor.year,
    month: cursor.month,
    weekStartsOn,
  };
  const query = useQuery(calendarMonthQueryOptions(filters));

  const monthLabelDay = useMemo(
    () =>
      `${String(cursor.year).padStart(4, '0')}-${String(cursor.month).padStart(2, '0')}-15` as TradingDay,
    [cursor.year, cursor.month],
  );
  const monthLabel = formatMonthLabel(monthLabelDay, { locale });

  // `startTransition` (W-9 boucle 2, ADR-017) : la mise à jour du curseur déclenche le
  // recalcul de ~42 `DayCell` + en-tête + stats — un rendu synchrone unique dans le même
  // tick que le clic. Marquer ce `setState` en transition permet à React 18+ de découper
  // ce rendu en tranches interruptibles (concurrent rendering) plutôt qu'un unique
  // rendu bloquant, laissant le fil principal rendre une image intermédiaire — mesuré au
  // profil CPU comme réduisant la pire image (celle qui dépasse 50 ms).
  const goToPreviousMonth = () => startTransition(() => setCursor((prev) => shiftCursor(prev, -1)));
  const goToNextMonth = () => startTransition(() => setCursor((prev) => shiftCursor(prev, 1)));

  const queryClient = useQueryClient();
  // Préchargement des mois voisins (W-9 boucle 2, ADR-017) : le tout premier aller vers
  // un mois jamais visité reste un vrai fetch (cache froid) — mesuré au profil comme la
  // pire image du test de fluidité (~66-83 ms), la seule à dépasser franchement les
  // autres une fois le mois déjà visité mis en cache par `staleTime`
  // (`src/data/calendar.ts`). Précharger silencieusement le mois précédent et le mois
  // suivant dès que le curseur ou le compte change réchauffe ce cache avant le clic,
  // sans jamais afficher de donnée périmée (clé de requête identique à celle lue par
  // `useQuery` ci-dessus, `getCalendarMonthSummary` reste pur/sans DOM).
  useEffect(() => {
    for (const delta of [-1, 1] as const) {
      const neighbor = shiftCursor(cursor, delta);
      void queryClient.prefetchQuery(
        calendarMonthQueryOptions({
          accountId: search.account,
          year: neighbor.year,
          month: neighbor.month,
          weekStartsOn,
        }),
      );
    }
  }, [cursor, search.account, weekStartsOn, queryClient]);

  const hasData = query.data ? query.data.dayByTradingDay.size > 0 : false;
  const selectedDayData = selectedDay
    ? (query.data?.dayByTradingDay.get(selectedDay) ?? null)
    : null;

  // Grille + stats du mois mémoïsées (W-9, ADR-017) : ne dépend PAS de `selectedDay`
  // — l'ouverture/fermeture de la `Sheet` de détail du jour ne doit jamais
  // recalculer/re-rendre les ~35 `DayCell` de la grille (cause mesurée de
  // saccades sous CPU ralenti). `DayCell`/`WeekTotalCell`/`StatTile` sont eux-mêmes
  // mémoïsés (`React.memo`), en complément.
  // Libellés d'état (W-9 boucle 2, ADR-017) : `CalendarDayStateKey` n'a que 6 valeurs
  // possibles — un seul appel `t()` par valeur (6 au total) plutôt qu'un appel `t()`
  // imbriqué par cellule (jusqu'à ~42 par changement de mois, mesuré au profil CPU
  // comme une part notable du coût sous CPU ralenti, aux côtés du formatage de date).
  const dayStateLabels = useMemo(
    () =>
      Object.fromEntries(
        DAY_STATE_KEYS.map((key) => [key, t(`calendar.dayState.${key}`)]),
      ) as Record<CalendarDayStateKey, string>,
    [t],
  );

  // Libellés d'en-tête (jours de semaine) : dépendent seulement de `weekStartsOn`/`locale`,
  // jamais du mois affiché — voir le commentaire de `REFERENCE_WEEK_BY_WEEK_STARTS_ON`.
  const weekdayHeaderLabels = useMemo(
    () =>
      REFERENCE_WEEK_BY_WEEK_STARTS_ON[weekStartsOn].map((day) =>
        formatWeekdayShort(day as TradingDay, { locale }),
      ),
    [weekStartsOn, locale],
  );

  const data = query.data;
  const monthGridAndStats = useMemo(() => {
    if (!data) return null;
    return (
      <>
        <div data-testid="calendar-grid" className="-mx-4 flex flex-col gap-2 px-1 sm:mx-0 sm:px-0">
          <div className="flex gap-1">
            {/* Clé positionnelle (index de colonne, W-9/ADR-017) — voir le commentaire
                équivalent sur la cellule du jour ci-dessous. */}
            {weekdayHeaderLabels.map((label, columnIndex) => (
              <span
                key={columnIndex}
                className="flex-1 truncate text-center text-xs text-muted-foreground"
              >
                {label}
              </span>
            ))}
            {narrow ? null : (
              <span className="w-12 shrink-0 truncate text-center text-xs text-muted-foreground sm:w-16">
                {t('calendar.weekTotal')}
              </span>
            )}
          </div>

          {data.weeks.map((week, weekIndex) => {
            const weekTotal = sumAmountStrings(
              week
                .filter((cell) => cell.inCurrentMonth)
                .map((cell) => {
                  const pnl = data.dayByTradingDay.get(cell.tradingDay)?.pnl;
                  return pnl ? toAmountString(pnl) : null;
                }),
            );

            return (
              <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {week.map((cell, columnIndex) => {
                    const day = data.dayByTradingDay.get(cell.tradingDay);
                    const isToday = cell.tradingDay === today;
                    const stateKey = resolveCalendarDayStateKey(
                      day?.pnl ?? null,
                      day?.hasJournalEntry ?? false,
                      isToday,
                    );
                    const dayNumberLabel = dayNumberFromTradingDay(cell.tradingDay);

                    const cellNode = (
                      <DayCell
                        testId={`calendar-day-${cell.tradingDay}`}
                        dayLabel={dayNumberLabel}
                        pnl={day?.pnl ?? null}
                        hasJournalEntry={day?.hasJournalEntry ?? false}
                        isToday={isToday}
                        currency={data.currency}
                        locale={locale}
                        hideAmounts={hideAmounts}
                        amountVariant="compact"
                        onClick={
                          cell.inCurrentMonth ? () => setSelectedDay(cell.tradingDay) : undefined
                        }
                        aria-label={t('calendar.dayAccessibility', {
                          day: dayNumberLabel,
                          state: dayStateLabels[stateKey],
                        })}
                      />
                    );

                    return (
                      // Clé positionnelle (`weekIndex`-`columnIndex`, W-9, ADR-017) — **pas**
                      // `cell.tradingDay` : la date change à chaque mois pour la même position
                      // de grille, donc une clé par date force React à démonter/remonter les
                      // ~42 cellules à chaque navigation au lieu de réutiliser les nœuds DOM
                      // existants et de ne mettre à jour que leur contenu (bien moins coûteux,
                      // cause mesurée de saccades sous CPU ralenti). `DayCell` reste identifié
                      // dans le DOM par `data-testid` (basé sur la date, inchangé) pour les tests.
                      <div
                        key={`${weekIndex}-${columnIndex}`}
                        className={cell.inCurrentMonth ? 'flex flex-1' : 'flex flex-1 opacity-40'}
                        style={{ aspectRatio: 1 }}
                      >
                        {cellNode}
                      </div>
                    );
                  })}
                  {narrow ? null : (
                    <WeekTotalCell
                      testId={`calendar-week-total-${weekIndex}`}
                      total={weekTotal}
                      currency={data.currency}
                      locale={locale}
                      hideAmounts={hideAmounts}
                      label={t('calendar.weekTotal')}
                    />
                  )}
                </div>
                {narrow ? (
                  <WeekTotalCell
                    testId={`calendar-week-total-${weekIndex}`}
                    total={weekTotal}
                    currency={data.currency}
                    locale={locale}
                    hideAmounts={hideAmounts}
                    label={t('calendar.weekTotal')}
                    variant="row"
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <StatTile
            testId="calendar-stat-net-pnl"
            label={t('calendar.monthStats.netPnl')}
            kind="signedAmount"
            value={data.monthStats.netPnl}
            currency={data.currency}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testId="calendar-stat-winning-days"
            label={t('calendar.monthStats.winningDays')}
            kind="number"
            value={new Decimal(data.monthStats.winningDays)}
            locale={locale}
          />
          <StatTile
            testId="calendar-stat-losing-days"
            label={t('calendar.monthStats.losingDays')}
            kind="number"
            value={new Decimal(data.monthStats.losingDays)}
            locale={locale}
          />
          <StatTile
            testId="calendar-stat-trades-count"
            label={t('calendar.monthStats.tradesCount')}
            kind="number"
            value={new Decimal(data.monthStats.tradesCount)}
            locale={locale}
          />
        </div>
      </>
    );
    // `selectedDay` exclu volontairement des dépendances (voir commentaire ci-dessus) ;
    // `setSelectedDay` (useState) est stable.
  }, [data, locale, hideAmounts, narrow, today, t, dayStateLabels, weekdayHeaderLabels]);

  return (
    <div data-testid="screen-calendar" className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold text-foreground">{t('calendar.title')}</h1>
          <p data-testid="calendar-month-label" className="text-sm text-muted-foreground">
            {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            testId="calendar-prev-month"
            icon={ChevronLeft}
            aria-label={t('calendar.monthNav.previous')}
            onClick={goToPreviousMonth}
          />
          <IconButton
            testId="calendar-next-month"
            icon={ChevronRight}
            aria-label={t('calendar.monthNav.next')}
            onClick={goToNextMonth}
          />
        </div>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">{t('calendar.error.title')}</p>
          <p className="text-sm text-muted-foreground">{t('calendar.error.description')}</p>
          <Button onClick={() => void query.refetch()}>{t('calendar.error.retry')}</Button>
        </div>
      ) : !hasData ? (
        <EmptyState
          testId="calendar-empty"
          icon={CalendarDays}
          title={t('calendar.empty.title')}
          description={t('calendar.empty.description')}
          action={{
            label: t('calendar.empty.action'),
            onClick: () => show(t('header.quickAdd.comingSoon')),
          }}
        />
      ) : (
        monthGridAndStats
      )}

      <ResponsiveSheet
        testId="calendar-day-sheet"
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
        title={
          selectedDay
            ? `${formatWeekdayShort(selectedDay, { locale })} ${formatDayNumber(selectedDay, { locale })} ${formatMonthLabel(selectedDay, { locale })}`
            : ''
        }
        closeLabel={t('close')}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">
            {t('calendar.detail.tradesTitle')}
          </p>
          {selectedDayData && selectedDayData.trades.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {selectedDayData.trades.map((trade) => (
                <TradeListRow
                  key={trade.id}
                  testId={`calendar-detail-trade-${trade.id}`}
                  symbol={trade.symbol}
                  direction={trade.direction}
                  directionLabel={t(`calendar.detail.direction.${trade.direction}`)}
                  dateLabel={formatDayNumber(selectedDay as TradingDay, { locale })}
                  pnl={trade.netPnl}
                  currency={query.data?.currency ?? 'USD'}
                  locale={locale}
                  hideAmounts={hideAmounts}
                  aria-label={`${trade.symbol} ${trade.netPnl.toString()}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('calendar.detail.noTrades')}</p>
          )}
          {selectedDayData?.hasJournalEntry ? (
            <p className="mt-2 text-sm text-muted-foreground">{t('calendar.detail.journalNote')}</p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </div>
  );
}
