import { haptics, themes, useThemeMode, usePressScale } from '@repo/ui';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SidebarItemProps {
  readonly testID?: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly active: boolean;
  readonly onPress: () => void;
}

/**
 * Lien de la sidebar web ≥ 1024 px (M1-8, ADR-011). Même retour d'appui que
 * `Button`/`IconButton` (`usePressScale`, haptique no-op sur web).
 */
export function SidebarItem({ testID, label, icon: Icon, active, onPress }: SidebarItemProps) {
  const mode = useThemeMode();
  const { style, onPressIn, onPressOut } = usePressScale({ pressedScale: 0.98 });
  const color = active ? themes[mode].accent : themes[mode].textSecondary;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => {
        haptics.selection();
        onPressIn();
      }}
      onPressOut={onPressOut}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className={`min-h-11 flex-row items-center gap-sm rounded-md px-md py-sm ${active ? 'bg-accentMuted' : 'bg-transparent'}`}
      style={style}
    >
      <Icon size={20} color={color} />
      <Text className={`font-sans-medium text-sm ${active ? 'text-accent' : 'text-textSecondary'}`}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
