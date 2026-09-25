import type { LucideIcon } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import type { EmptyStateAction } from "@/components/ui/empty-state"

export interface ScreenPlaceholderProps {
  readonly testId: string
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
  readonly action?: EmptyStateAction
}

/**
 * Contenu d'écran non encore implémenté (W-5) : `EmptyState` centré dans la
 * zone de contenu de `AppShell` — Dashboard/Calendrier reçoivent leur vrai
 * contenu en W-6, Trades/Journal/Analytics/Règles aux phases M4/M6/M7/M8.
 */
export function ScreenPlaceholder({ testId, icon, title, description, action }: ScreenPlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <EmptyState testId={testId} icon={icon} title={title} description={description} action={action} />
    </div>
  )
}
