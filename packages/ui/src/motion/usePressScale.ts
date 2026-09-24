import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { resolveSpringConfig } from './resolveMotion';
import { useMotionPreference } from './useMotionPreference';
import type { SpringToken } from './types';

export interface UsePressScaleOptions {
  /** Échelle atteinte pendant l'appui, défaut `0.96`. */
  readonly pressedScale?: number;
  /** Jeton de ressort (`tokens.animation.spring`), défaut `'snappy'`. */
  readonly spring?: SpringToken;
}

export interface PressScaleHandlers {
  /** Style animé (`transform: scale`) à poser sur un `Animated.View`/composant animé. */
  readonly style: ReturnType<typeof useAnimatedStyle>;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
}

/**
 * Animation d'appui partagée (échelle, M1-2/ADR-017) : `Button`, `IconButton`,
 * `DayCell`… l'utilisent pour un retour visuel cohérent, au lieu de dupliquer
 * la logique de ressort dans chaque composant. Respecte « réduire les
 * animations » via `resolveSpringConfig` (saut direct à la valeur cible si
 * réduit, pas de ressort joué à vide).
 */
export function usePressScale(options: UsePressScaleOptions = {}): PressScaleHandlers {
  const { pressedScale = 0.96, spring = 'snappy' } = options;
  const { reduceMotion } = useMotionPreference();
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const animateTo = (target: number) => {
    const config = resolveSpringConfig(spring, reduceMotion);
    // `react-hooks/immutability` (revue M1, Important #3) : faux positif connu sur
    // `SharedValue` Reanimated — la règle reconnaît `useRef`/`.current` comme mutable
    // (voir `isRefOrRefValue`, `mutate()` dans le plugin) mais pas encore les valeurs
    // partagées Reanimated (`useSharedValue`/`.value`, la même API, même contrat de
    // mutation hors rendu), malgré `environment.enableCustomTypeDefinitionForReanimated`
    // activé ci-dessus (`eslint.config.js`) — ce drapeau alimente la reconnaissance du
    // *type* mais pas encore l'exception de mutation. `scale.value` n'est écrit que dans
    // des gestionnaires d'événements (`onPressIn`/`onPressOut`), jamais pendant le rendu.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = config ? withSpring(target, config) : target;
  };

  return {
    style,
    onPressIn: () => animateTo(pressedScale),
    onPressOut: () => animateTo(1),
  };
}
