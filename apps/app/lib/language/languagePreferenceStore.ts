import { create } from 'zustand';

import type { LanguagePreference } from './languagePreference';

/**
 * État de préférence de langue global (M1-9, écran Réglages). Valeur par
 * défaut en mémoire (`system`) tant que `hydrate` n'a pas été appelé : la
 * restauration se fait avant le premier rendu (`apps/app/app/_layout.tsx`,
 * comme `useThemeStore`/`useVisibilityStore` de `@repo/ui`), la persistance
 * des changements ultérieurs par `useLanguagePreferenceSync`.
 */
interface LanguagePreferenceState {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  hydrate: (preference: LanguagePreference) => void;
}

export const useLanguagePreferenceStore = create<LanguagePreferenceState>((set) => ({
  preference: 'system',
  setPreference: (preference) => set({ preference }),
  hydrate: (preference) => set({ preference }),
}));
