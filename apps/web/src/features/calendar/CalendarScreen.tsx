import {
  Decimal,
  formatDayNumber,
  formatMonthLabel,
  formatWeekdayShort,
  sumAmountStrings,
  toAmountString,
} from "@repo/core"
import type { TradingDay } from "@repo/core"
import { useQuery } from "@tanstack/react-query"
import { useSearch } from "@tanstack/react-router"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { DayCell } from "@/components/ui/day-cell"
import { EmptyState } from "@/components/ui/empty-state"
import { IconButton } from "@/components/ui/icon-button"
import { ResponsiveSheet } from "@/components/ui/sheet-responsive"
import { Skeleton } from "@/components/ui/skeleton"
import { StatTile } from "@/components/ui/stat-tile"
import { TradeListRow } from "@/components/ui/trade-list-row"
import { useToast } from "@/components/ui/use-toast"
import { WeekTotalCell } from "@/components/ui/week-total-cell"
import { calendarMonthQueryOptions } from "@/data/calendar"
import { useVisibilityStore } from "@/features/preferences/visibility-store"
import { resolveApproximateToday } from "@/features/shell/filters"
import { resolveLocale } from "@/lib/i18n"
import { useWindowWidth } from "@/lib/use-media-query"

import { isNarrowCalendarLayout } from "./calendarLayout"
import { resolveCalendarDayStateKey } from "./resolveCalendarDayStateKey"

/** Premier jour de la semaine par locale (`packages/core` n'expose pas encore ce réglage par préférence utilisateur, M2+). */
const WEEK_STARTS_ON: Record<"fr" | "en", 0 | 1> = { fr: 1, en: 0 }

/**
 * Écran Calendrier (W-6, ARCHITECTURE §5.5) : grille du mois (`DayCell` par
 * jour, `WeekTotalCell` par semaine) + stats du mois, navigation mois
 * précédent/suivant (état local, clé de requête par compte + année + mois),
 * repli mobile < 360 px, détail du jour en `Sheet`. 4 états gérés :
 * squelette, vide, erreur, rempli.
 */
export function CalendarScreen() {
  const { t, i18n } = useTranslation()
  const search = useSearch({ from: "/_shell" })
  const locale = resolveLocale(i18n.language)
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts)
  const { show } = useToast()
  const width = useWindowWidth()
  const narrow = width > 0 && isNarrowCalendarLayout(width)

  const [cursor, setCursor] = useState(() => {
    const [year = 2026, month = 1] = search.to.split("-").map(Number)
    return { year, month }
  })
  const [selectedDay, setSelectedDay] = useState<TradingDay | null>(null)
  const today = useMemo(() => resolveApproximateToday(), [])

  const weekStartsOn = WEEK_STARTS_ON[locale]
  const filters = { accountId: search.account, year: cursor.year, month: cursor.month, weekStartsOn }
  const query = useQuery(calendarMonthQueryOptions(filters))

  const monthLabelDay = useMemo(
    () => `${String(cursor.year).padStart(4, "0")}-${String(cursor.month).padStart(2, "0")}-15` as TradingDay,
    [cursor.year, cursor.month],
  )
  const monthLabel = formatMonthLabel(monthLabelDay, { locale })

  const goToPreviousMonth = () =>
    setCursor((prev) => (prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 }))
  const goToNextMonth = () =>
    setCursor((prev) => (prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 }))

  const hasData = query.data ? query.data.dayByTradingDay.size > 0 : false
  const selectedDayData = selectedDay ? (query.data?.dayByTradingDay.get(selectedDay) ?? null) : null

  // Grille + stats du mois mémoïsées (W-9, ADR-017) : ne dépend PAS de `selectedDay`
  // — l'ouverture/fermeture de la `Sheet` de détail du jour ne doit jamais
  // recalculer/re-rendre les ~35 `DayCell` de la grille (cause mesurée de
  // saccades sous CPU ralenti). `DayCell`/`WeekTotalCell`/`StatTile` sont eux-mêmes
  // mémoïsés (`React.memo`), en complément.
  const data = query.data
  const monthGridAndStats = useMemo(() => {
    if (!data) return null
    return (
      <>
        <div data-testid="calendar-grid" className="-mx-4 flex flex-col gap-2 px-1 sm:mx-0 sm:px-0">
          <div className="flex gap-1">
            {/* Clé positionnelle (index de colonne, W-9/ADR-017) — voir le commentaire
                équivalent sur la cellule du jour ci-dessous. */}
            {data.weeks[0]?.map((cell, columnIndex) => (
              <span key={columnIndex} className="flex-1 truncate text-center text-xs text-muted-foreground">
                {formatWeekdayShort(cell.tradingDay, { locale })}
              </span>
            ))}
            {narrow ? null : (
              <span className="w-12 shrink-0 truncate text-center text-xs text-muted-foreground sm:w-16">
                {t("calendar.weekTotal")}
              </span>
            )}
          </div>

          {data.weeks.map((week, weekIndex) => {
            const weekTotal = sumAmountStrings(
              week
                .filter((cell) => cell.inCurrentMonth)
                .map((cell) => {
                  const pnl = data.dayByTradingDay.get(cell.tradingDay)?.pnl
                  return pnl ? toAmountString(pnl) : null
                }),
            )

            return (
              <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {week.map((cell, columnIndex) => {
                    const day = data.dayByTradingDay.get(cell.tradingDay)
                    const isToday = cell.tradingDay === today
                    const stateKey = resolveCalendarDayStateKey(
                      day?.pnl ?? null,
                      day?.hasJournalEntry ?? false,
                      isToday,
                    )
                    const dayNumberLabel = formatDayNumber(cell.tradingDay, { locale })

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
                        onClick={cell.inCurrentMonth ? () => setSelectedDay(cell.tradingDay) : undefined}
                        aria-label={t("calendar.dayAccessibility", {
                          day: dayNumberLabel,
                          state: t(`calendar.dayState.${stateKey}`),
                        })}
                      />
                    )

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
                        className={cell.inCurrentMonth ? "flex flex-1" : "flex flex-1 opacity-40"}
                        style={{ aspectRatio: 1 }}
                      >
                        {cellNode}
                      </div>
                    )
                  })}
                  {narrow ? null : (
                    <WeekTotalCell
                      testId={`calendar-week-total-${weekIndex}`}
                      total={weekTotal}
                      currency={data.currency}
                      locale={locale}
                      hideAmounts={hideAmounts}
                      label={t("calendar.weekTotal")}
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
                    label={t("calendar.weekTotal")}
                    variant="row"
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <StatTile
            testId="calendar-stat-net-pnl"
            label={t("calendar.monthStats.netPnl")}
            kind="signedAmount"
            value={data.monthStats.netPnl}
            currency={data.currency}
            locale={locale}
            hideAmounts={hideAmounts}
          />
          <StatTile
            testId="calendar-stat-winning-days"
            label={t("calendar.monthStats.winningDays")}
            kind="number"
            value={new Decimal(data.monthStats.winningDays)}
            locale={locale}
          />
          <StatTile
            testId="calendar-stat-losing-days"
            label={t("calendar.monthStats.losingDays")}
            kind="number"
            value={new Decimal(data.monthStats.losingDays)}
            locale={locale}
          />
          <StatTile
            testId="calendar-stat-trades-count"
            label={t("calendar.monthStats.tradesCount")}
            kind="number"
            value={new Decimal(data.monthStats.tradesCount)}
            locale={locale}
          />
        </div>
      </>
    )
    // `selectedDay` exclu volontairement des dépendances (voir commentaire ci-dessus) ;
    // `setSelectedDay` (useState) est stable.
  }, [data, locale, hideAmounts, narrow, today, t])

  return (
    <div data-testid="screen-calendar" className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold text-foreground">{t("calendar.title")}</h1>
          <p data-testid="calendar-month-label" className="text-sm text-muted-foreground">
            {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            testId="calendar-prev-month"
            icon={ChevronLeft}
            aria-label={t("calendar.monthNav.previous")}
            onClick={goToPreviousMonth}
          />
          <IconButton
            testId="calendar-next-month"
            icon={ChevronRight}
            aria-label={t("calendar.monthNav.next")}
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
          <p className="text-lg font-semibold text-foreground">{t("calendar.error.title")}</p>
          <p className="text-sm text-muted-foreground">{t("calendar.error.description")}</p>
          <Button onClick={() => void query.refetch()}>{t("calendar.error.retry")}</Button>
        </div>
      ) : !hasData ? (
        <EmptyState
          testId="calendar-empty"
          icon={CalendarDays}
          title={t("calendar.empty.title")}
          description={t("calendar.empty.description")}
          action={{ label: t("calendar.empty.action"), onClick: () => show(t("header.quickAdd.comingSoon")) }}
        />
      ) : (
        monthGridAndStats
      )}

      <ResponsiveSheet
        testId="calendar-day-sheet"
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
        title={
          selectedDay
            ? `${formatWeekdayShort(selectedDay, { locale })} ${formatDayNumber(selectedDay, { locale })} ${formatMonthLabel(selectedDay, { locale })}`
            : ""
        }
        closeLabel={t("close")}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">{t("calendar.detail.tradesTitle")}</p>
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
                  currency={query.data?.currency ?? "USD"}
                  locale={locale}
                  hideAmounts={hideAmounts}
                  aria-label={`${trade.symbol} ${trade.netPnl.toString()}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("calendar.detail.noTrades")}</p>
          )}
          {selectedDayData?.hasJournalEntry ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("calendar.detail.journalNote")}</p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </div>
  )
}
