import { Card, useMotionPreference } from '@repo/ui';
import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useComingSoonStore } from './comingSoonStore';

const AUTO_HIDE_MS = 2600;

/**
 * Notice flottante « bientôt disponible » (M1-8, ADR-017 : transitions
 * Reanimated, respect de « réduire les animations »). Montée une seule fois
 * dans `(app)/_layout.tsx` (mobile et web), au-dessus du header et de la
 * navigation — remplace `Toast` (`packages/ui`, pas encore livré) le temps que
 * l'ajout de trade n'existe pas (CLAUDE.md M1-8 : « ne crée pas Toast maintenant »).
 */
export function ComingSoonBanner() {
  const visible = useComingSoonStore((state) => state.visible);
  const message = useComingSoonStore((state) => state.message);
  const hide = useComingSoonStore((state) => state.hide);
  const { reduceMotion } = useMotionPreference();

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [visible, hide]);

  if (!visible || !message) return null;

  return (
    <Animated.View
      testID="coming-soon-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? undefined : FadeIn}
      exiting={reduceMotion ? undefined : FadeOut}
      pointerEvents="none"
      className="absolute inset-x-0 top-sm z-50 items-center px-lg"
    >
      <Card testID="coming-soon-banner-card" className="max-w-sm">
        <Text className="text-center font-sans-medium text-sm text-textPrimary">{message}</Text>
      </Card>
    </Animated.View>
  );
}
