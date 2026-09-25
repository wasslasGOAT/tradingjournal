import { create } from "zustand"

import { webLocalStorage } from "./storage"
import type { LanguagePreference } from "./language"
import { LANGUAGE_PREFERENCE_STORAGE_KEY, parseLanguagePreference } from "./language"

interface LanguagePreferenceState {
  preference: LanguagePreference
  setPreference: (preference: LanguagePreference) => void
}

/**
 * Store de préférence de langue (W-5) : restaurée depuis `localStorage` dès
 * la création du store (avant le premier rendu, comme `useThemeStore`) —
 * réécrite à chaque changement. Synchronisée avec i18next par
 * `useLanguagePreferenceSync` (montée une fois dans `main.tsx`).
 */
export const useLanguagePreferenceStore = create<LanguagePreferenceState>((set) => ({
  preference: parseLanguagePreference(webLocalStorage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)),
  setPreference: (preference) => {
    webLocalStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, preference)
    set({ preference })
  },
}))
