import { formatSignedAmount } from "@repo/core"
import type { Decimal, SupportedLocale } from "@repo/core"
import { clsx } from "clsx"
import { memo } from "react"

import { formatCompactSignedAmount } from "@/lib/format/compactAmount"
import { resolvePnlIntent } from "./stat-tile-value"
import type { PnlIntent } from "@/lib/theme/tokens"

export interface WeekTotalCellProps {
  readonly testId?: string
  readonly total: Decimal
  readonly currency: string
  readonly locale: SupportedLocale
  readonly hideAmounts?: boolean
  /** Libellé (ex. « Total »). Toujours utilisé pour l'accessibilité ; affiché
   * visuellement seulement en `variant="row"` (pas de répétition à côté d'une
   * colonne d'en-tête déjà libellée). */
  readonly label: string
  /**
   * `'column'` (défaut) : 8ᵉ colonne étroite à largeur fixe, à côté des 7
   * `DayCell` de la semaine. `'row'` : ligne pleine largeur sous la semaine
   * (< 360 px, `calendarLayout.ts`).
   */
  readonly variant?: "column" | "row"
}

const PNL_TEXT_CLASS_NAME: Record<PnlIntent, string> = {
  profit: "text-pnl-profit",
  loss: "text-pnl-loss",
  flat: "text-pnl-flat",
}

/**
 * Total hebdomadaire du calendrier (W-6, ARCHITECTURE §5.5 : « colonne total
 * hebdo »), en notation compacte (sans devise) comme `DayCell` en mode
 * `compact` — même rôle que `apps/app/features/calendar/WeekTotalCell.tsx`
 * (gelé, copié/adapté au web).
 */
function WeekTotalCellComponent({
  testId,
  total,
  currency,
  locale,
  hideAmounts,
  label,
  variant = "column",
}: WeekTotalCellProps) {
  const fullFormatted = formatSignedAmount(total, currency, { locale, hideAmounts })
  const compactFormatted = formatCompactSignedAmount(total, { locale, hideAmounts })
  const intent = resolvePnlIntent(total)
  // `clsx` (pas `cn`/`twMerge`, W-9 boucle 2, ADR-017) — voir le commentaire équivalent
  // dans `day-cell.tsx` : aucune classe en conflit réel ici.
  const valueClassName = clsx("font-semibold tabular-nums text-2xs sm:text-sm", PNL_TEXT_CLASS_NAME[intent])

  if (variant === "row") {
    return (
      <div
        data-testid={testId}
        aria-label={`${label} ${fullFormatted}`}
        className="flex min-h-11 items-center justify-between rounded-md bg-muted px-3 py-1"
      >
        <span className="truncate text-2xs text-muted-foreground">{label}</span>
        <span data-testid={testId ? `${testId}-value` : undefined} className={valueClassName}>
          {compactFormatted}
        </span>
      </div>
    )
  }

  return (
    <div
      data-testid={testId}
      aria-label={`${label} ${fullFormatted}`}
      className="flex min-h-11 w-12 shrink-0 items-center justify-center self-stretch rounded-md bg-muted p-1 sm:w-16 sm:p-2"
    >
      <span data-testid={testId ? `${testId}-value` : undefined} className={clsx(valueClassName, "truncate")}>
        {compactFormatted}
      </span>
    </div>
  )
}

/** Mémoïsé (W-9, ADR-017) — voir le commentaire équivalent sur `DayCell`. */
export const WeekTotalCell = memo(WeekTotalCellComponent)
