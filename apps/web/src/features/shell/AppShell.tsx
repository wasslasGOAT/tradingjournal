import type { ReactNode } from "react"

import type { DateRangeShortcut, TradingDayRange } from "@/components/ui/date-range-shortcuts"

import { AppHeader } from "./AppHeader"
import { BottomTabBar } from "./BottomTabBar"
import { Sidebar } from "./Sidebar"

export interface AppShellProps {
  readonly accountId: string
  readonly onAccountChange: (accountId: string) => void
  readonly dateRange: TradingDayRange
  readonly dateRangeShortcut: DateRangeShortcut
  readonly onPeriodChange: (range: TradingDayRange, shortcut: DateRangeShortcut) => void
  readonly children: ReactNode
}

/**
 * Coquille de navigation (W-5, ADR-011) : sidebar fixe sur le web >= 1024 px,
 * tab bar flottante sinon (même jeu de routes, `navItems.ts`) ; header commun
 * (compte, période, masquage, ajout rapide) monté une seule fois au-dessus de
 * la navigation. Le contenu défilant reçoit une marge basse (< 1024 px)
 * réservée pour ne jamais passer sous la tab bar flottante.
 */
export function AppShell({
  accountId,
  onAccountChange,
  dateRange,
  dateRangeShortcut,
  onPeriodChange,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          accountId={accountId}
          onAccountChange={onAccountChange}
          dateRange={dateRange}
          dateRangeShortcut={dateRangeShortcut}
          onPeriodChange={onPeriodChange}
        />
        <main
          data-testid="app-content"
          className="min-w-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+96px)] lg:pb-6"
        >
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
