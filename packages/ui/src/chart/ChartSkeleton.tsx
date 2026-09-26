import { View } from 'react-native';

import { Skeleton } from '../components/Skeleton';

export interface ChartSkeletonProps {
  readonly testID?: string;
  readonly height: number;
}

/**
 * État de chargement de `Chart` (M1-6, ADR-017 : squelette, jamais de spinner
 * plein écran). Silhouette générique (barres irrégulières) valable pour les
 * quatre types de graphique — partagée par `Chart.native.tsx`/`Chart.web.tsx`.
 */
export function ChartSkeleton({ testID, height }: ChartSkeletonProps) {
  const barHeights = [0.4, 0.65, 0.5, 0.85, 0.6, 0.95, 0.7];

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="w-full flex-row items-end gap-xs"
      style={{ height }}
    >
      {barHeights.map((ratio, index) => (
        <Skeleton
          // Silhouette statique de démonstration (tableau fixe, jamais réordonné/filtré).
          key={index}
          radius="sm"
          height={Math.round(height * ratio)}
          className="flex-1"
        />
      ))}
    </View>
  );
}
