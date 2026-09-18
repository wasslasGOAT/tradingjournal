import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { resolveTimingConfig, useMotionPreference } from '../../motion';

export interface ShimmerBarProps {
  readonly testID?: string;
  /** Hauteur de la barre en px. Défaut `8`. */
  readonly height?: number;
  readonly className?: string;
}

/**
 * Barre de chargement à reflet mobile (M1-3, ADR-017), pour une piste de
 * progression indéterminée (ex. import en cours) plutôt qu'un bloc de
 * contenu (voir `Skeleton`). Le reflet balaie la piste en boucle ; figé
 * (centré, sans balayage) si « réduire les animations » est actif.
 */
export function ShimmerBar({ testID, height = 8, className }: ShimmerBarProps) {
  const { reduceMotion } = useMotionPreference();
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (reduceMotion || trackWidth === 0) {
      cancelAnimation(translateX);
      translateX.value = trackWidth / 3;
      return;
    }
    const config = resolveTimingConfig('slow', 'standard', reduceMotion);
    translateX.value = withRepeat(withTiming(trackWidth, config), -1, false);
    return () => cancelAnimation(translateX);
  }, [reduceMotion, trackWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`overflow-hidden rounded-full bg-surfaceAlt ${className ?? ''}`}
      style={{ height }}
    >
      <Animated.View className="h-full w-1/3 rounded-full bg-border" style={animatedStyle} />
    </View>
  );
}
