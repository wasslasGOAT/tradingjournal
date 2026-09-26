import { create } from 'zustand';

/**
 * Forçage de « réduire les animations », indépendant du réglage système
 * (M1-2). `null` = suit le système (`useReducedMotion`, valeur par défaut) ;
 * `true`/`false` = forcé, quel que soit le système — utile pour un futur
 * réglage utilisateur explicite dans l'app, ou pour les tests/le catalogue de
 * composants. En mémoire seulement (comme `themeStore`), pas encore persisté.
 */
interface MotionState {
  forceReducedMotion: boolean | null;
  setForceReducedMotion: (value: boolean | null) => void;
}

export const useMotionStore = create<MotionState>((set) => ({
  forceReducedMotion: null,
  setForceReducedMotion: (forceReducedMotion) => set({ forceReducedMotion }),
}));
