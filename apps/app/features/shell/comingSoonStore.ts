import { create } from 'zustand';

/**
 * Notice globale « bientôt disponible » (M1-8) : déclenchée par le bouton
 * d'ajout rapide du header et par les raccourcis qui mènent au même endroit
 * (ex. dashboard « Ajouter un trade »), avant que la vraie saisie de trade
 * n'existe. Un seul état partagé plutôt qu'un `Toast` dédié (`packages/ui`,
 * arrivée prévue en M1-4) — voir `ComingSoonBanner`.
 */
interface ComingSoonState {
  visible: boolean;
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

export const useComingSoonStore = create<ComingSoonState>((set) => ({
  visible: false,
  message: null,
  show: (message) => set({ visible: true, message }),
  hide: () => set({ visible: false, message: null }),
}));
