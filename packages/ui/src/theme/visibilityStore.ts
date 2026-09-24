import { create } from 'zustand';

/**
 * Masquage global des montants (icône œil, M1-8, ARCHITECTURE §6.2 : « Masquage
 * des montants (icône œil) global, persistant »). État partagé par tout écran
 * affichant des montants (dashboard, calendrier, trades…) — un seul bouton
 * (header) le change pour toute l'app. Pas encore persisté sur disque
 * (préférences utilisateur réelles, M2+) : en mémoire seulement, comme
 * `useThemeStore`.
 */
interface VisibilityState {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  setHideAmounts: (hideAmounts: boolean) => void;
}

export const useVisibilityStore = create<VisibilityState>((set) => ({
  hideAmounts: false,
  toggleHideAmounts: () => set((state) => ({ hideAmounts: !state.hideAmounts })),
  setHideAmounts: (hideAmounts) => set({ hideAmounts }),
}));
