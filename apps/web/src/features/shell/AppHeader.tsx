import type { DateRangeShortcut, TradingDayRange } from "@/components/ui/date-range-shortcuts"

import { AccountSelector } from "./AccountSelector"
import { HideAmountsToggle } from "./HideAmountsToggle"
import { PeriodSelector } from "./PeriodSelector"
import { QuickAddButton } from "./QuickAddButton"

export interface AppHeaderProps {
  readonly accountId: string
  readonly onAccountChange: (accountId: string) => void
  readonly dateRange: TradingDayRange
  readonly dateRangeShortcut: DateRangeShortcut
  readonly onPeriodChange: (range: TradingDayRange, shortcut: DateRangeShortcut) => void
}

/**
 * En-tête global (W-5, ARCHITECTURE §6.1) : sélecteur de compte + période à
 * gauche, masquage des montants + ajout rapide à droite. Commun aux deux
 * dispositions (tab bar flottante < 1024 px, sidebar web >= 1024 px) — monté
 * une seule fois par `AppShell`, au-dessus de la navigation.
 */
export function AppHeader({
  accountId,
  onAccountChange,
  dateRange,
  dateRangeShortcut,
  onPeriodChange,
}: AppHeaderProps) {
  return (
    <header
      data-testid="app-header"
      className="z-10 border-b border-border bg-background"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <AccountSelector accountId={accountId} onChange={onAccountChange} />
          <PeriodSelector
            dateRange={dateRange}
            dateRangeShortcut={dateRangeShortcut}
            onChange={onPeriodChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <HideAmountsToggle />
          <QuickAddButton />
        </div>
      </div>
    </header>
  )
}
