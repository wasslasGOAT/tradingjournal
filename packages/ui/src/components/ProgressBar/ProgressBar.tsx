import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { resolveTimingConfig, useMotionPreference } from '../../motion';
import { clampProgress, toProgressPercent } from './progressValue';

export interface ProgressBarProps {
  readonly testID?: string;
  /** Progression, fraction `[0, 1]` (ex. `0.65` pour 65 %). */
  readonly value: number;
  /** Libellé accessible (ex. `t('rules.checklistProgress')`) — requis, une barre de progression seule n'est pas explicite pour un lecteur d'écran. */
  readonly accessibilityLabel: string;
  readonly className?: string;
}

/**
 * Barre de progression déterminée (M1-3, ADR-017) : remplissage animé
 * (`withTiming`, respecte « réduire les animations »), `accessibilityRole="progressbar"`.
 */
export function ProgressBar({ testID, value, accessibilityLabel, className }: ProgressBarProps) {
  const { reduceMotion } = useMotionPreference();
  const clamped = clampProgress(value);
  const progress = useSharedValue(clamped);

  useEffect(() => {
    const config = resolveTimingConfig('base', 'standard', reduceMotion);
    progress.value = reduceMotion ? clamped : withTiming(clamped, config);
  }, [clamped, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      testID={testID}
      className={`h-2 overflow-hidden rounded-full bg-surfaceAlt ${className ?? ''}`}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: toProgressPercent(value) }}
    >
      <Animated.View className="h-full rounded-full bg-accent" style={animatedStyle} />
    </View>
  );
}
