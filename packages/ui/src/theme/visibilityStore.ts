import { create } from 'zustand';

/**
 * Masquage global des montants (icône œil, M1-8, ARCHITECTURE §6.2 : « Masquage
 * des montants (icône œil) global, persistant »). État partagé par tout écran
 * affichant des montants (dashboard, calendrier, trades…) — un seul bouton
 * (header) le change pour toute l'app. Valeur par défaut en mémoire tant que
 * `hydrate` n'a pas été appelé : la persistance (M1-9) est câblée par
 * `ThemeProvider` (prop `storage` optionnelle) et par
 * `apps/app/app/_layout.tsx`, comme `useThemeStore`.
 */
interface VisibilityState {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  setHideAmounts: (hideAmounts: boolean) => void;
  /** Remplace l'état par la valeur restaurée (M1-9) — appelé une seule fois, au démarrage. */
  hydrate: (hideAmounts: boolean) => void;
}

export const useVisibilityStore = create<VisibilityState>((set) => ({
  hideAmounts: false,
  toggleHideAmounts: () => set((state) => ({ hideAmounts: !state.hideAmounts })),
  setHideAmounts: (hideAmounts) => set({ hideAmounts }),
  hydrate: (hideAmounts) => set({ hideAmounts }),
}));
