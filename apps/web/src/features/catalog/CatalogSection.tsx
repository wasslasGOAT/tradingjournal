import type { ReactNode } from "react"

export interface CatalogSectionProps {
  readonly testId: string
  readonly title: string
  readonly children: ReactNode
}

/** Regroupe une famille de primitives sous un titre, dans le catalogue (W-4). */
export function CatalogSection({ testId, title, children }: CatalogSectionProps) {
  return (
    <section data-testid={testId} className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
