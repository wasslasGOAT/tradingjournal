import { useEffect } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '../../haptics';
import { resolveSpringConfig, useMotionPreference } from '../../motion';
import { resolveSegmentedIndex } from './segmentedIndex';
import type { SegmentedOption } from './segmentedIndex';

export type { SegmentedOption } from './segmentedIndex';

export interface SegmentedProps<T extends string = string> {
  readonly testID?: string;
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Libellé accessible du groupe (ex. `t('trades.viewMode.label')`) — requis,
   * un groupe de segments seul n'est pas explicite pour un lecteur d'écran. */
  readonly accessibilityLabel: string;
  readonly className?: string;
}

/**
 * Sélecteur à segments (M1-4, ARCHITECTURE §6.2/§5 : ex. `$ / % / R`,
 * `Jour/Semaine/Mois/Année`) : indicateur animé (`withSpring`, respecte
 * « réduire les animations »), haptique au changement, `radiogroup`/`radio`
 * (ADR-017 : accessibilité). Segments de largeur égale (mesurés une fois via
 * `onLayout`) — adapté aux libellés courts de ce composant.
 */
export function Segmented<T extends string = string>({
  testID,
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: SegmentedProps<T>) {
  const { reduceMotion } = useMotionPreference();
  const containerWidth = useSharedValue(0);
  const selectedIndex = resolveSegmentedIndex(options, value);
  const indicatorIndex = useSharedValue(selectedIndex);
  const optionsCount = options.length;

  useEffect(() => {
    const config = resolveSpringConfig('snappy', reduceMotion);
    indicatorIndex.value = config ? withSpring(selectedIndex, config) : selectedIndex;
  }, [selectedIndex, reduceMotion, indicatorIndex]);

  const handleLayout = (event: LayoutChangeEvent) => {
    containerWidth.value = event.nativeEvent.layout.width;
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = optionsCount > 0 ? containerWidth.value / optionsCount : 0;
    return {
      width: segmentWidth,
      transform: [{ translateX: indicatorIndex.value * segmentWidth }],
    };
  });

  return (
    <View testID={testID} className={`rounded-md bg-surfaceAlt p-xs ${className ?? ''}`}>
      <View
        onLayout={handleLayout}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        className="relative flex-row"
      >
        <Animated.View
          pointerEvents="none"
          className="absolute bottom-0 left-0 top-0 rounded-sm bg-accent"
          style={indicatorStyle}
        />
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={option.value}
              testID={testID ? `${testID}-option-${option.value}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: false }}
              accessibilityLabel={option.label}
              onPress={() => {
                if (selected) return;
                haptics.selection();
                onChange(option.value);
              }}
              className="min-h-11 flex-1 items-center justify-center px-sm py-xs"
            >
              <Text
                className={`font-sans-medium text-sm ${selected ? 'text-onAccent' : 'text-textSecondary'}`}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
