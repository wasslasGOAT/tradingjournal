import { create } from 'zustand';

import { defaultPnlColorScheme } from '../tokens';
import type { PnlColorScheme } from '../tokens';
import type { ThemePreference } from './themeMode';

/**
 * État de thème global (M1-1). Suit le thème système par défaut, avec
 * possibilité de forcer sombre/clair et de choisir le schéma de couleurs P&L
 * (bleu/gris par défaut, vert/rouge en option — ARCHITECTURE §6.2). Valeurs
 * par défaut en mémoire tant que `hydrate` n'a pas été appelé : la
 * persistance (M1-9) est câblée par `ThemeProvider` (prop `storage`
 * optionnelle) et par `apps/app/app/_layout.tsx`, qui appelle `hydrate` avec
 * les valeurs restaurées avant le premier rendu (pas de clignotement).
 */
interface ThemeState {
  preference: ThemePreference;
  pnlColorScheme: PnlColorScheme;
  setPreference: (preference: ThemePreference) => void;
  setPnlColorScheme: (scheme: PnlColorScheme) => void;
  /** Remplace l'état par des valeurs restaurées (M1-9) — appelé une seule fois, au démarrage. */
  hydrate: (preference: ThemePreference, pnlColorScheme: PnlColorScheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  pnlColorScheme: defaultPnlColorScheme,
  setPreference: (preference) => set({ preference }),
  setPnlColorScheme: (pnlColorScheme) => set({ pnlColorScheme }),
  hydrate: (preference, pnlColorScheme) => set({ preference, pnlColorScheme }),
}));
