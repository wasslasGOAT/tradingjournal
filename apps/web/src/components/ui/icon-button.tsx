import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface IconButtonProps {
  readonly icon: LucideIcon
  /** Toujours requis : un bouton icône seul n'a pas de texte visible pour les lecteurs d'écran. */
  readonly "aria-label": string
  readonly onClick: () => void
  readonly variant?: "default" | "ghost" | "outline"
  readonly disabled?: boolean
  /** Taille de l'icône en px (le conteneur reste >= 44px quelle que soit cette valeur). Défaut `20`. */
  readonly iconSize?: number
  readonly className?: string
  readonly testId?: string
}

/**
 * Bouton icône (W-4, ADR-017) : cible tactile 44x44px garantie indépendamment
 * de `iconSize` — même rôle que `packages/ui/src/components/IconButton`
 * (gelé).
 */
export function IconButton({
  icon: Icon,
  "aria-label": ariaLabel,
  onClick,
  variant = "ghost",
  disabled = false,
  iconSize = 20,
  className,
  testId,
}: IconButtonProps) {
  return (
    <Button
      type="button"
      data-testid={testId}
      variant={variant === "default" ? "default" : variant === "outline" ? "outline" : "ghost"}
      size="icon"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn("rounded-full", className)}
    >
      <Icon size={iconSize} aria-hidden="true" />
    </Button>
  )
}
