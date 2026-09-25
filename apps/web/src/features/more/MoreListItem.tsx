import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { validateShellSearch } from "@/features/shell/filters"

export interface MoreListItemProps {
  readonly testId: string
  readonly to: "/analytics" | "/rules" | "/settings"
  readonly icon: LucideIcon
  readonly label: string
  readonly description: string
}

/** Ligne de la liste « Plus » (W-5) : icône, libellé, description, chevron — cible tactile >= 44px. */
export function MoreListItem({ testId, to, icon: Icon, label, description }: MoreListItemProps) {
  return (
    <Link
      data-testid={testId}
      to={to}
      search={(prev) => validateShellSearch(prev)}
      aria-label={`${label}. ${description}`}
      className="flex min-h-11 items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon size={20} className="text-primary" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight size={18} className="text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}
