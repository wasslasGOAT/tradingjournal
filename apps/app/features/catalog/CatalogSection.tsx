import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export interface CatalogSectionProps {
  readonly testID: string;
  readonly title: string;
  readonly children: ReactNode;
}

/** Regroupe une famille de primitives sous un titre, dans le catalogue (M1-3). */
export function CatalogSection({ testID, title, children }: CatalogSectionProps) {
  return (
    <View testID={testID} className="gap-sm">
      <Text className="font-sans-semibold text-md text-textPrimary">{title}</Text>
      <View className="gap-sm">{children}</View>
    </View>
  );
}
