import { create } from 'zustand';

import type { PnlColorScheme, ThemeMode } from '@/lib/theme/tokens';

import { webLocalStorage } from './storage';
import type { ThemePreference } from './theme';
import {
  applyPnlSchemeToDocument,
  applyThemeToDocument,
  nextThemePreference,
  parsePnlColorScheme,
  parseThemePreference,
  resolveThemeMode,
} from './theme';

/** Clé de stockage web (préfixée, distincte du natif — ADR-023, stockages séparés). */
export const THEME_PREFERENCE_STORAGE_KEY = 'edgebook.web.preferences.themePreference';
/** Clé de stockage du schéma de couleurs P&L (W-4) — même préfixe que la préférence de thème. */
export const PNL_COLOR_SCHEME_STORAGE_KEY = 'edgebook.web.preferences.pnlColorScheme';

function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

interface ThemeState {
  preference: ThemePreference;
  resolvedMode: ThemeMode;
  pnlColorScheme: PnlColorScheme;
  /** Bouton temporaire (W-3) : fait défiler système → sombre → clair. Remplacé par l'écran Réglages en W-5/M2. */
  cyclePreference: () => void;
  setPreference: (preference: ThemePreference) => void;
  setPnlColorScheme: (scheme: PnlColorScheme) => void;
}

/**
 * Store de préférence de thème (W-3) : préférence par défaut = système
 * (`prefers-color-scheme`), persistée dans `localStorage` (enveloppée de
 * `try/catch`, `features/preferences/storage.ts`). Le script inline de
 * `index.html` pose déjà `data-theme` avant le premier rendu (anti-flash) ;
 * ce store réconcilie l'état React avec cet attribut au montage puis pilote
 * toute bascule ultérieure.
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: parseThemePreference(webLocalStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)),
  resolvedMode: resolveThemeMode(
    parseThemePreference(webLocalStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)),
    systemPrefersLight(),
  ),
  pnlColorScheme: parsePnlColorScheme(webLocalStorage.getItem(PNL_COLOR_SCHEME_STORAGE_KEY)),
  setPreference: (preference) => {
    const resolvedMode = resolveThemeMode(preference, systemPrefersLight());
    applyThemeToDocument(resolvedMode);
    webLocalStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
    set({ preference, resolvedMode });
  },
  setPnlColorScheme: (pnlColorScheme) => {
    applyPnlSchemeToDocument(pnlColorScheme);
    webLocalStorage.setItem(PNL_COLOR_SCHEME_STORAGE_KEY, pnlColorScheme);
    set({ pnlColorScheme });
  },
  cyclePreference: () => {
    get().setPreference(nextThemePreference(get().preference));
  },
}));

/**
 * Réabonnement au système (préférence `system`) — à appeler une fois au
 * montage de la racine (`main.tsx`). Renvoie la fonction de désabonnement.
 */
export function subscribeToSystemThemeChanges(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const listener = () => {
    const { preference, setPreference } = useThemeStore.getState();
    if (preference === 'system') setPreference('system');
  };
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
