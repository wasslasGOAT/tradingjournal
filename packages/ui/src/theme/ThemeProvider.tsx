import { vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { View, useColorScheme } from 'react-native';

import { defaultThemeMode } from '../tokens';
import type { ThemeMode } from '../tokens';
import { buildThemeVars, resolveThemeMode } from './themeMode';
import type { PreferencesStorage } from './preferencesStorage';
import {
  persistHideAmounts,
  persistPnlColorScheme,
  persistThemePreference,
} from './preferencesStorage';
import { useThemeStore } from './themeStore';
import { useVisibilityStore } from './visibilityStore';

const ThemeModeContext = createContext<ThemeMode>(defaultThemeMode);

/** Thème sombre/clair effectivement appliqué (résolu depuis la préférence + le système). */
export function useThemeMode(): ThemeMode {
  return useContext(ThemeModeContext);
}

export interface ThemeProviderProps {
  readonly children: ReactNode;
  /**
   * Stockage optionnel (M1-9) pour persister thème, couleurs P&L et masquage
   * des montants entre deux lancements — injecté depuis l'app
   * (`apps/app/lib/storage`, ARCHITECTURE §10) : `packages/ui` ne dépend
   * d'aucun stockage concret, seulement de cette interface minimale
   * (`PreferencesStorage`). Sans `storage` (tests, catalogue), les bascules
   * restent en mémoire comme avant M1-9.
   *
   * La restauration elle-même (lecture au démarrage) se fait en amont, avant
   * le premier rendu, via `loadPersistedPreferences` + `hydrate` sur les
   * stores (`apps/app/app/_layout.tsx`, comme le chargement des polices) —
   * ce composant ne fait qu'écrire les changements ultérieurs.
   */
  readonly storage?: PreferencesStorage;
}

/**
 * Pose les variables CSS NativeWind du thème actif sur toute la sous-arborescence
 * (M1-1, ARCHITECTURE §6.2) : les classes `bg-background`, `text-textPrimary`,
 * `text-pnlProfit`… lisent ces variables — bascule sombre/clair et bleu/gris ↔
 * vert/rouge instantanée, sans rechargement (`useThemeStore`).
 * À monter une seule fois, à la racine (`apps/app/app/_layout.tsx`).
 */
export function ThemeProvider({ children, storage }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);

  const mode = resolveThemeMode(preference, systemColorScheme);
  const themeVars = useMemo(
    () => vars(buildThemeVars(mode, pnlColorScheme)),
    [mode, pnlColorScheme],
  );

  // M1-9 : persiste chaque changement ultérieur (la valeur initiale a déjà été
  // restaurée avant le montage, voir `ThemeProviderProps.storage`). Un seul
  // abonnement par store, jamais désactivé tant que `storage` ne change pas.
  useEffect(() => {
    if (!storage) return undefined;

    const unsubscribeTheme = useThemeStore.subscribe((state) => {
      void persistThemePreference(storage, state.preference);
      void persistPnlColorScheme(storage, state.pnlColorScheme);
    });
    const unsubscribeVisibility = useVisibilityStore.subscribe((state) => {
      void persistHideAmounts(storage, state.hideAmounts);
    });

    return () => {
      unsubscribeTheme();
      unsubscribeVisibility();
    };
  }, [storage]);

  return (
    <View style={[{ flex: 1 }, themeVars]}>
      <ThemeModeContext.Provider value={mode}>{children}</ThemeModeContext.Provider>
    </View>
  );
}
