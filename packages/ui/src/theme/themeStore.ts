import { create } from 'zustand';

import { defaultPnlColorScheme } from '../tokens';
import type { PnlColorScheme } from '../tokens';
import type { ThemePreference } from './themeMode';

/**
 * État de thème global (M1-1). Suit le thème système par défaut, avec
 * possibilité de forcer sombre/clair et de choisir le schéma de couleurs P&L
 * (bleu/gris par défaut, vert/rouge en option — ARCHITECTURE §6.2). Le choix
 * n'est pas encore persisté (arrive avec les préférences utilisateur, M2+) :
 * en mémoire seulement, réinitialisé au démarrage de l'app.
 */
interface ThemeState {
  preference: ThemePreference;
  pnlColorScheme: PnlColorScheme;
  setPreference: (preference: ThemePreference) => void;
  setPnlColorScheme: (scheme: PnlColorScheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  pnlColorScheme: defaultPnlColorScheme,
  setPreference: (preference) => set({ preference }),
  setPnlColorScheme: (pnlColorScheme) => set({ pnlColorScheme }),
}));
