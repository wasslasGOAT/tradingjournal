import { formatSignedAmount, parseAmount } from "@repo/core"
import type { Decimal, SupportedLocale } from "@repo/core"
import { NotebookPen } from "lucide-react"
import { memo } from "react"

import { formatCompactSignedAmount } from "@/lib/format/compactAmount"
import { cn } from "@/lib/utils"

import { resolveDayCellContentState, resolveDayCellPnlIntent } from "./day-cell-state"
import type { PnlIntent } from "@/lib/theme/tokens"

export interface DayCellProps {
  readonly testId?: string
  /** Quantième déjà formaté (ex. `formatDayNumber` de `@repo/core`), ex. `"14"`. */
  readonly dayLabel: string
  /** P&L net du jour, `null` si aucun trade. `Decimal` déjà calculé ou chaîne décimale brute. */
  readonly pnl: Decimal | string | null
  readonly hasJournalEntry?: boolean
  readonly isToday?: boolean
  /** Requis dès qu'un P&L existe (ADR-005 : pas de montant sans devise). */
  readonly currency?: string
  readonly locale: SupportedLocale
  readonly hideAmounts?: boolean
  /**
   * `'compact'` : montant sans symbole de devise, notation compacte (ex.
   * `+1,3k`) — pour les grilles très étroites (calendrier). `'full'`
   * (défaut) : `formatSignedAmount`, montant complet avec devise.
   */
  readonly amountVariant?: "full" | "compact"
  readonly onClick?: () => void
  readonly "aria-label": string
}

const PNL_TEXT_CLASS_NAME: Record<PnlIntent, string> = {
  profit: "text-pnl-profit",
  loss: "text-pnl-loss",
  flat: "text-pnl-flat",
}

function toDecimalOrNull(value: Decimal | string | null): Decimal | null {
  if (value === null) return null
  return typeof value === "string" ? parseAmount(value) : value
}

/**
 * Cellule de calendrier (W-4, ARCHITECTURE §6.2) : profit/perte (montant
 * coloré selon le signe), journal seul (icône), vide, et « aujourd'hui »
 * (bordure accent) — même rôle que `packages/ui/src/components/DayCell`
 * (gelé). Cible tactile >= 44px.
 */
function DayCellComponent({
  testId,
  dayLabel,
  pnl,
  hasJournalEntry = false,
  isToday = false,
  currency,
  locale,
  hideAmounts,
  amountVariant = "full",
  onClick,
  "aria-label": ariaLabel,
}: DayCellProps) {
  const pnlDecimal = toDecimalOrNull(pnl)
  const contentState = resolveDayCellContentState(pnlDecimal, hasJournalEntry)
  const intent = resolveDayCellPnlIntent(pnlDecimal)

  const Comp = onClick ? "button" : "div"

  return (
    <Comp
      type={onClick ? "button" : undefined}
      data-testid={testId}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-11 min-w-11 flex-1 flex-col rounded-md border p-1.5 text-left transition-colors sm:p-2",
        contentState === "empty" ? "bg-card" : "bg-muted",
        isToday ? "border-2 border-primary" : "border-border",
      )}
    >
      <span className="text-xs text-muted-foreground">{dayLabel}</span>
      {/* Numéro du jour épinglé en haut à gauche ; P&L/journal centrés dans le reste de la
          cellule (retour visuel : niveau TradeX, jamais deux petits carrés collés en haut). */}
      <div className="flex flex-1 items-center justify-center">
        {contentState === "trades" && intent !== null && pnlDecimal !== null && currency ? (
          <span
            className={cn(
              "truncate text-center font-semibold tabular-nums",
              // `sm:` (bureau, colonnes larges) : remonte à `text-sm` (14px) — `2xs`/`xs` restent
              // réservés aux grilles denses (mobile, colonne « Total ») où la place manque.
              amountVariant === "compact" ? "text-2xs sm:text-sm" : "text-xs sm:text-sm",
              PNL_TEXT_CLASS_NAME[intent],
            )}
          >
            {amountVariant === "compact"
              ? formatCompactSignedAmount(pnlDecimal, { locale, hideAmounts })
              : formatSignedAmount(pnlDecimal, currency, { locale, hideAmounts })}
          </span>
        ) : null}
        {contentState === "journalOnly" ? (
          <NotebookPen size={14} className="text-muted-foreground" aria-hidden="true" />
        ) : null}
      </div>
    </Comp>
  )
}

/**
 * Mémoïsé (W-9, ADR-017) : évite de re-rendre chaque cellule de la grille
 * (jusqu'à ~42) quand un état sans rapport change ailleurs dans l'écran
 * (ex. ouverture/fermeture de la `Sheet` de détail du jour, Calendrier) —
 * cause mesurée de saccades sous CPU ralenti.
 */
export const DayCell = memo(DayCellComponent)
