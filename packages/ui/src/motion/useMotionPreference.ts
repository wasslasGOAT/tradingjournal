import { useReducedMotion } from 'react-native-reanimated';

import { useMotionStore } from './motionStore';
import type { MotionPreference } from './types';

/**
 * Préférence de mouvement effective (M1-2, ADR-017) : réglage système
 * (`useReducedMotion` de Reanimated, web + natif) combiné au forçage éventuel
 * de `motionStore`. Toutes les animations de `packages/ui` lisent
 * `reduceMotion` d'ici (via ce hook ou `usePressScale`) plutôt que d'appeler
 * `useReducedMotion` directement.
 *
 * Note : `useReducedMotion` de Reanimated lit le réglage système **une seule
 * fois au démarrage de l'app** (il ne se re-rend pas si l'utilisateur change
 * ce réglage pendant que l'app tourne — limitation documentée de Reanimated).
 * Le forçage de `motionStore`, lui, est réactif immédiatement (ex. réglage
 * utilisateur dans l'app, catalogue de composants).
 */
export function useMotionPreference(): MotionPreference {
  const systemReduceMotion = useReducedMotion();
  const forceReducedMotion = useMotionStore((state) => state.forceReducedMotion);

  return { reduceMotion: forceReducedMotion ?? systemReduceMotion };
}
