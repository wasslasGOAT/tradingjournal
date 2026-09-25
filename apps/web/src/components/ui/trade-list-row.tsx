import { formatSignedAmount, parseAmount } from "@repo/core"
import type { Decimal, SupportedLocale } from "@repo/core"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { resolvePnlIntent } from "@/components/ui/stat-tile-value"
import { cn } from "@/lib/utils"
import type { PnlIntent } from "@/lib/theme/tokens"

export type TradeListRowDirection = "long" | "short"

export interface TradeListRowProps {
  readonly testId?: string
  readonly symbol: string
  readonly direction: TradeListRowDirection
  /** Libellé de la direction déjà traduit (ex. `t('catalog.list.direction.long')`) — jamais de texte en dur ici (i18n). */
  readonly directionLabel: string
  /** Date/heure déjà formatée (`@repo/core/format`). */
  readonly dateLabel: string
  readonly pnl: Decimal | string
  /** Requis (ADR-005 : pas de montant sans devise). */
  readonly currency: string
  readonly locale: SupportedLocale
  readonly hideAmounts?: boolean
  readonly onClick?: () => void
  readonly "aria-label": string
}

const PNL_TEXT_CLASS_NAME: Record<PnlIntent, string> = {
  profit: "text-pnl-profit",
  loss: "text-pnl-loss",
  flat: "text-pnl-flat",
}

function toDecimal(value: Decimal | string): Decimal {
  return typeof value === "string" ? parseAmount(value) : value
}

/**
 * Ligne de trade (W-4, prête pour le trade log M4) : symbole + sens, date,
 * P&L coloré. Cible tactile >= 44px, chiffres tabulaires — même rôle que
 * `packages/ui/src/list/TradeListRow.tsx` (gelé).
 */
export function TradeListRow({
  testId,
  symbol,
  direction,
  directionLabel,
  dateLabel,
  pnl,
  currency,
  locale,
  hideAmounts,
  onClick,
  "aria-label": ariaLabel,
}: TradeListRowProps) {
  const pnlDecimal = toDecimal(pnl)
  const intent = resolvePnlIntent(pnlDecimal)
  const DirectionIcon = direction === "long" ? ArrowUpRight : ArrowDownRight
  const Comp = onClick ? "button" : "div"

  return (
    <Comp
      type={onClick ? "button" : undefined}
      data-testid={testId}
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
      >
        <DirectionIcon size={18} className="text-muted-foreground" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-sm font-semibold text-foreground">{symbol}</span>
        <span className="truncate text-xs text-muted-foreground">
          {directionLabel} · {dateLabel}
        </span>
      </span>
      <span
        data-testid={testId ? `${testId}-pnl` : undefined}
        className={cn("shrink-0 truncate text-sm font-semibold tabular-nums", PNL_TEXT_CLASS_NAME[intent])}
      >
        {formatSignedAmount(pnlDecimal, currency, { locale, hideAmounts })}
      </span>
    </Comp>
  )
}
