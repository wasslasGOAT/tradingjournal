import { Link } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { validateShellSearch } from "./filters"
import type { NavItem } from "./navItems"

export interface SidebarItemProps {
  readonly testId?: string
  readonly to: NavItem["to"]
  readonly label: string
  readonly icon: LucideIcon
}

/**
 * Lien de la sidebar web >= 1024 px (W-5, ADR-011). Cible tactile >= 44px,
 * état actif porté par `Link` (`activeProps`, TanStack Router) — pas de
 * comparaison manuelle du chemin courant.
 */
export function SidebarItem({ testId, to, label, icon: Icon }: SidebarItemProps) {
  return (
    <Link
      data-testid={testId}
      to={to}
      search={(prev) => validateShellSearch(prev)}
      className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      activeProps={{
        className: cn("bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"),
      }}
      activeOptions={{ exact: to === "/" }}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )
}
