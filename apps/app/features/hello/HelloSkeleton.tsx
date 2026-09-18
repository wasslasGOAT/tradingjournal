import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Squelette de chargement (écran Hello, T6) : jamais de spinner plein écran sur
 * un écran principal (ADR-017). Pulsation Reanimated, désactivée si l'utilisateur
 * a réduit les animations au niveau système (`useReducedMotion`, ADR-017).
 * Ébauche M0 : le vrai composant `Skeleton` du design system arrive en M1.
 */

const PULSE_DURATION_MS = 900;
// Largeurs complètes (jamais interpolées) pour que le scanner NativeWind les détecte.
const BAR_WIDTH_CLASSES = ['w-2/3', 'w-1/2', 'w-5/6'] as const;

function SkeletonBar({ widthClassName }: { widthClassName: string }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 0.6 : 0.4);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`h-md rounded-sm bg-surfaceAlt ${widthClassName}`}
    />
  );
}

export function HelloSkeleton() {
  const { t } = useTranslation('common');

  return (
    <View
      testID="hello-skeleton"
      className="w-full max-w-sm gap-sm"
      accessibilityRole="progressbar"
      accessibilityLabel={t('hello.loading')}
    >
      {BAR_WIDTH_CLASSES.map((widthClassName) => (
        <SkeletonBar key={widthClassName} widthClassName={widthClassName} />
      ))}
    </View>
  );
}
