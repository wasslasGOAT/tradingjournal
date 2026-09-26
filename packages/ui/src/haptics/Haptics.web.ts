import type { HapticsAdapter } from './types';

/**
 * Implémentation web — aucune API haptique standard côté navigateur (ADR-017 :
 * « implémentation web vide »). Même forme que `Haptics.native.ts` : les
 * composants de `packages/ui` appellent `haptics.*` sans jamais tester la
 * plateforme eux-mêmes.
 */
export const haptics: HapticsAdapter = {
  selection() {
    // no-op (web)
  },
  impactLight() {
    // no-op (web)
  },
  impactMedium() {
    // no-op (web)
  },
  success() {
    // no-op (web)
  },
  error() {
    // no-op (web)
  },
};
