import { Easing } from 'react-native-reanimated';
import type { EasingFunctionFactory } from 'react-native-reanimated';

import { resolveDuration, resolveEasingPoints } from './resolveMotion';
import type { DurationToken, EasingToken, WithTimingConfig } from './types';

/**
 * Variantes Reanimated de `./resolveMotion.ts` (M1-2) — séparées dans ce
 * fichier car elles importent `react-native-reanimated`, qui ne se charge pas
 * sous Vitest/Node (voir note de tête de `resolveMotion.ts`) ; non couvertes
 * par des tests unitaires pour cette raison (comme le reste du code RN de
 * `packages/ui`), vérifiées par le typecheck + `expo export`/build natifs.
 */

/** Courbe d'accélération Reanimated pour `token`. */
export function resolveEasing(token: EasingToken): EasingFunctionFactory {
  const [x1, y1, x2, y2] = resolveEasingPoints(token);
  return Easing.bezier(x1, y1, x2, y2);
}

/** Config `withTiming` prête à l'emploi (durée + courbe), durée nulle si `reduceMotion`. */
export function resolveTimingConfig(
  durationToken: DurationToken,
  easingToken: EasingToken,
  reduceMotion: boolean,
): WithTimingConfig {
  return {
    duration: resolveDuration(durationToken, reduceMotion),
    easing: resolveEasing(easingToken),
  };
}
