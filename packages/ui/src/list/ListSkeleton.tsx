import { View } from 'react-native';

import { Skeleton } from '../components/Skeleton';

export interface ListSkeletonProps {
  readonly testID?: string;
  readonly rowCount?: number;
}

/**
 * État de chargement de `VirtualizedList` (M1-5, ADR-017 : squelette, jamais
 * de spinner plein écran). Liste courte non virtualisée (`rowCount` lignes,
 * défaut 8) — un squelette n'a pas besoin de `FlashList`.
 */
export function ListSkeleton({ testID, rowCount = 8 }: ListSkeletonProps) {
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="gap-sm"
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <View key={index} className="flex-row items-center gap-sm">
          <Skeleton radius="full" width={36} height={36} />
          <View className="flex-1 gap-xs">
            <Skeleton height={14} width="50%" />
            <Skeleton height={12} width="30%" />
          </View>
          <Skeleton height={16} width={64} />
        </View>
      ))}
    </View>
  );
}
