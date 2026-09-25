import { formatDayNumber, formatMonthLabel, formatWeekdayShort, toTradingDay } from "@repo/core"
import type { SupportedLocale, TradingDay } from "@repo/core"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { ResponsiveSheet } from "@/components/ui/sheet-responsive"
import { cn } from "@/lib/utils"

import type { DateRangeShortcut, TradingDayRange } from "./date-range-shortcuts"
import {
  buildDateRangeGrid,
  resolveDateRangeGridCellIntent,
  resolveDateRangeShortcut,
  resolveRangeSelection,
} from "./date-range-shortcuts"

export type { DateRangeShortcut, TradingDayRange } from "./date-range-shortcuts"

const SHORTCUTS: readonly Exclude<DateRangeShortcut, "custom">[] = [
  "today",
  "last7Days",
  "currentMonth",
  "previousMonth",
]

export interface DateRangePickerLabels {
  readonly today: string
  readonly last7Days: string
  readonly currentMonth: string
  readonly previousMonth: string
  readonly custom: string
  readonly apply: string
  readonly cancel: string
  readonly close: string
  readonly previousMonthNav: string
  readonly nextMonthNav: string
}

export interface DateRangePickerProps {
  readonly testId?: string
  readonly value: TradingDayRange
  /** Raccourci actif (`'custom'` si `value` vient d'une plage personnalisée). */
  readonly shortcut: DateRangeShortcut
  /** Jour de référence pour les raccourcis (« aujourd'hui ») — fourni par l'appelant. */
  readonly today: TradingDay
  readonly locale: SupportedLocale
  /** `0` = dimanche, `1` = lundi. Défaut `1`. */
  readonly weekStartsOn?: 0 | 1
  readonly onChange: (range: TradingDayRange, shortcut: DateRangeShortcut) => void
  /** Libellé déjà formaté du déclencheur (ex. « 1 – 15 sept. 2026 », `@repo/core/format`). */
  readonly triggerLabel: string
  /** Libellé du groupe — titre du panneau. */
  readonly label: string
  readonly triggerAriaLabel?: string
  readonly labels: DateRangePickerLabels
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = (month - 1 + delta + 1200) % 12
  const yearDelta = Math.floor((month - 1 + delta) / 12)
  return { year: year + yearDelta, month: zeroBased + 1 }
}

function monthOf(day: TradingDay): { year: number; month: number } {
  const [yearText = "1970", monthText = "01"] = day.split("-")
  return { year: Number(yearText), month: Number(monthText) }
}

/**
 * Choix de période (W-4, ARCHITECTURE §6.1) : raccourcis (Aujourd'hui / 7
 * derniers jours / Mois en cours / Mois précédent), plus une grille de
 * calendrier simple pour une plage personnalisée (sélection en 2 clics) —
 * même rôle que `packages/ui/src/components/DateRangePicker` (gelé).
 */
export function DateRangePicker({
  testId,
  value,
  shortcut,
  today,
  locale,
  weekStartsOn = 1,
  onChange,
  triggerLabel,
  label,
  triggerAriaLabel,
  labels,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draftShortcut, setDraftShortcut] = useState<DateRangeShortcut>(shortcut)
  const [draftRange, setDraftRange] = useState<{
    readonly start: TradingDay
    readonly end: TradingDay | null
  }>({ start: value.start, end: value.end })
  const [displayedMonth, setDisplayedMonth] = useState(() => monthOf(value.start))

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setDraftShortcut(shortcut)
      setDraftRange({ start: value.start, end: value.end })
      setDisplayedMonth(monthOf(value.start))
    }
  }

  const applyShortcut = (nextShortcut: Exclude<DateRangeShortcut, "custom">) => {
    onChange(resolveDateRangeShortcut(nextShortcut, today), nextShortcut)
    setOpen(false)
  }

  const handleCustomPress = () => setDraftShortcut("custom")

  const handleDayPress = (day: TradingDay) => {
    setDraftRange((current) => resolveRangeSelection(current, day))
  }

  const handleApply = () => {
    if (draftRange.end === null) return
    onChange({ start: draftRange.start, end: draftRange.end }, "custom")
    setOpen(false)
  }

  const handleCancel = () => setOpen(false)

  const weeks = buildDateRangeGrid(displayedMonth.year, displayedMonth.month, weekStartsOn)
  const monthLabel = formatMonthLabel(
    toTradingDay(
      `${String(displayedMonth.year).padStart(4, "0")}-${String(displayedMonth.month).padStart(2, "0")}-01`,
    ),
    { locale },
  )
  const weekdayLabels = weeks[0]?.map((cell) => formatWeekdayShort(cell.tradingDay, { locale })) ?? []

  return (
    <div data-testid={testId}>
      <Button
        type="button"
        data-testid={testId ? `${testId}-trigger` : undefined}
        variant="secondary"
        size="sm"
        aria-label={triggerAriaLabel ?? label}
        onClick={() => handleOpenChange(true)}
      >
        {triggerLabel}
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <ResponsiveSheet
        testId={testId ? `${testId}-sheet` : undefined}
        open={open}
        onOpenChange={handleOpenChange}
        title={label}
        closeLabel={labels.close}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {SHORTCUTS.map((key) => (
              <Button
                key={key}
                type="button"
                data-testid={testId ? `${testId}-shortcut-${key}` : undefined}
                variant={draftShortcut === key ? "default" : "secondary"}
                size="sm"
                onClick={() => applyShortcut(key)}
              >
                {labels[key]}
              </Button>
            ))}
            <Button
              type="button"
              data-testid={testId ? `${testId}-shortcut-custom` : undefined}
              variant={draftShortcut === "custom" ? "default" : "secondary"}
              size="sm"
              onClick={handleCustomPress}
            >
              {labels.custom}
            </Button>
          </div>

          {draftShortcut === "custom" ? (
            <div data-testid={testId ? `${testId}-grid` : undefined} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <IconButton
                  icon={ChevronLeft}
                  aria-label={labels.previousMonthNav}
                  onClick={() => setDisplayedMonth((current) => addMonths(current.year, current.month, -1))}
                />
                <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
                <IconButton
                  icon={ChevronRight}
                  aria-label={labels.nextMonthNav}
                  onClick={() => setDisplayedMonth((current) => addMonths(current.year, current.month, 1))}
                />
              </div>

              <div className="flex gap-1">
                {weekdayLabels.map((weekdayLabel, index) => (
                  <span
                    key={`weekday-${index}`}
                    className="flex-1 text-center text-xs text-muted-foreground"
                  >
                    {weekdayLabel}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="flex gap-1">
                    {week.map((cell) => {
                      const intent = resolveDateRangeGridCellIntent(cell.tradingDay, draftRange)
                      return (
                        <button
                          key={cell.tradingDay}
                          type="button"
                          data-testid={testId ? `${testId}-day-${cell.tradingDay}` : undefined}
                          aria-pressed={intent !== "none"}
                          aria-label={formatDayNumber(cell.tradingDay, { locale })}
                          onClick={() => handleDayPress(cell.tradingDay)}
                          className={cn(
                            "min-h-11 flex-1 rounded-md text-center text-sm tabular-nums transition-colors",
                            intent === "edge"
                              ? "bg-primary text-primary-foreground"
                              : intent === "inRange"
                                ? "bg-brand-muted text-foreground"
                                : "bg-transparent text-foreground",
                            cell.inCurrentMonth ? "" : "opacity-40",
                          )}
                        >
                          {formatDayNumber(cell.tradingDay, { locale })}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                  {labels.cancel}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={draftRange.end === null}
                  onClick={handleApply}
                >
                  {labels.apply}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </ResponsiveSheet>
    </div>
  )
}
