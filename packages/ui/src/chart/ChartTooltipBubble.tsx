import { Text, View } from 'react-native';

import { elevation } from '../tokens';
import { useThemeMode } from '../theme/ThemeProvider';

export interface ChartTooltipBubbleProps {
  readonly testID?: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Infobulle du point actif (M1-6, ARCHITECTURE §6 : « infobulle lisible » au
 * survol web / toucher natif) — même bulle visuelle des deux côtés (`Chart.
 * web.tsx` la pose dans le contenu personnalisé de `<Tooltip>` de recharts,
 * `Chart.native.tsx` la pose dans un `Animated.View` positionné par les
 * valeurs partagées de `useChartPressState`).
 */
export function ChartTooltipBubble({ testID, label, value }: ChartTooltipBubbleProps) {
  const mode = useThemeMode();

  return (
    <View
      testID={testID}
      className="rounded-sm border border-border bg-surfaceAlt px-sm py-xs"
      style={elevation.card[mode]}
    >
      <Text className="font-sans text-2xs text-textMuted">{label}</Text>
      <Text className="font-sans-semibold text-sm text-textPrimary">{value}</Text>
    </View>
  );
}
