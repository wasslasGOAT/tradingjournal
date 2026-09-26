import { create } from 'zustand';

import { webLocalStorage } from './storage';

/**
 * Masquage global des montants (icône œil, ARCHITECTURE §6.2 : « Masquage des
 * montants global, persistant ») — copie web de
 * `packages/ui/src/theme/visibilityStore.ts` (gelé, ADR-023). État partagé
 * par tout écran affichant des montants (dashboard, calendrier, trades…) — un
 * seul bouton (header) le change pour toute l'app. Persisté dans
 * `localStorage` (comme `theme-store.ts`).
 */
export const HIDE_AMOUNTS_STORAGE_KEY = 'edgebook.web.preferences.hideAmounts';

function parseHideAmounts(raw: string | null): boolean {
  return raw === 'true';
}

interface VisibilityState {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  setHideAmounts: (hideAmounts: boolean) => void;
}

export const useVisibilityStore = create<VisibilityState>((set, get) => ({
  hideAmounts: parseHideAmounts(webLocalStorage.getItem(HIDE_AMOUNTS_STORAGE_KEY)),
  setHideAmounts: (hideAmounts) => {
    webLocalStorage.setItem(HIDE_AMOUNTS_STORAGE_KEY, String(hideAmounts));
    set({ hideAmounts });
  },
  toggleHideAmounts: () => {
    get().setHideAmounts(!get().hideAmounts);
  },
}));
