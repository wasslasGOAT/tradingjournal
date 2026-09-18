import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { resolveTimingConfig, useMotionPreference } from '../../motion';

export type SkeletonRadius = 'sm' | 'md' | 'lg' | 'full';

export interface SkeletonProps {
  readonly testID?: string;
  /** Largeur en px, ou pourcentage (`'100%'`). Défaut `'100%'`. */
  readonly width?: number | `${number}%`;
  /** Hauteur en px. Défaut `16`. */
  readonly height?: number;
  readonly radius?: SkeletonRadius;
  readonly className?: string;
}

const RADIUS_CLASS_NAME: Record<SkeletonRadius, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Bloc de squelette (M1-3, ADR-017 : « squelettes de chargement sur tous les
 * écrans de données, jamais de spinner plein écran »). Pulsation d'opacité en
 * boucle ; figé (opacité constante) si « réduire les animations » est actif.
 * Masqué de l'arbre d'accessibilité : un squelette ne porte aucune
 * information, l'écran qui l'affiche doit décrire l'état de chargement
 * séparément (ex. `accessibilityLiveRegion`/texte sur le conteneur parent).
 */
export function Skeleton({ testID, width = '100%', height = 16, radius = 'md', className }: SkeletonProps) {
  const { reduceMotion } = useMotionPreference();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.5;
      return;
    }
    const config = resolveTimingConfig('slow', 'standard', reduceMotion);
    opacity.value = withRepeat(withSequence(withTiming(0.8, config), withTiming(0.35, config)), -1, true);
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`bg-surfaceAlt ${RADIUS_CLASS_NAME[radius]} ${className ?? ''}`}
      style={[{ width, height }, animatedStyle]}
    />
  );
}
