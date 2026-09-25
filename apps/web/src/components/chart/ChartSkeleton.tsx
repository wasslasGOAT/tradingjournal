import { Skeleton } from "@/components/ui/skeleton"

export interface ChartSkeletonProps {
  readonly height: number
  readonly testId?: string
}

/**
 * État de chargement de `Chart` (W-4, ADR-017 : squelette, jamais de spinner
 * plein écran). Silhouette générique (barres irrégulières) valable pour les
 * quatre types de graphique — même rôle que
 * `packages/ui/src/chart/ChartSkeleton.tsx` (gelé).
 */
export function ChartSkeleton({ height, testId }: ChartSkeletonProps) {
  const barHeights = [0.4, 0.65, 0.5, 0.85, 0.6, 0.95, 0.7]

  return (
    <div
      data-testid={testId}
      aria-hidden="true"
      className="flex w-full items-end gap-1"
      style={{ height }}
    >
      {barHeights.map((ratio, index) => (
        <Skeleton
          key={index}
          className="flex-1 rounded-sm"
          style={{ height: Math.round(height * ratio) }}
        />
      ))}
    </div>
  )
}
