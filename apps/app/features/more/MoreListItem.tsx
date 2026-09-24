import { haptics, themes, useThemeMode, usePressScale } from '@repo/ui';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface MoreListItemProps {
  readonly testID?: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly description: string;
  readonly onPress: () => void;
}

/** Ligne de la liste « Plus » (M1-8) : icône, libellé, description, chevron — cible tactile ≥ 44 pt. */
export function MoreListItem({
  testID,
  icon: Icon,
  label,
  description,
  onPress,
}: MoreListItemProps) {
  const mode = useThemeMode();
  const { style, onPressIn, onPressOut } = usePressScale({ pressedScale: 0.99 });

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => {
        haptics.selection();
        onPressIn();
      }}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${description}`}
      className="min-h-11 flex-row items-center gap-md rounded-lg border border-border bg-surface p-md"
      style={style}
    >
      <Icon size={20} color={themes[mode].accent} />
      <View className="flex-1 gap-xs">
        <Text className="font-sans-medium text-base text-textPrimary">{label}</Text>
        <Text className="font-sans text-sm text-textSecondary">{description}</Text>
      </View>
      <ChevronRight size={18} color={themes[mode].textMuted} />
    </AnimatedPressable>
  );
}
