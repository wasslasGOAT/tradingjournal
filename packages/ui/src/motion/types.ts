import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * Jetons d'animation (M1-2, ADR-017/ADR-021) — sous-ensembles connus de
 * `tokens.data.cjs#animation`, plus précis que le `Record<string, ...>` déclaré
 * dans `tokens.data.d.cts` (`noUncheckedIndexedAccess`). Tenus synchronisés avec
 * les données réelles par `resolveMotion.test.ts`.
 */
export type DurationToken = 'fast' | 'base' | 'slow';
export type EasingToken = 'standard' | 'decelerate' | 'accelerate';
export type SpringToken = 'default' | 'snappy' | 'gentle';

/** Préférence de mouvement effective : système (`useReducedMotion`) + forçage (`motionStore`). */
export interface MotionPreference {
  readonly reduceMotion: boolean;
}

export type { WithSpringConfig, WithTimingConfig };
