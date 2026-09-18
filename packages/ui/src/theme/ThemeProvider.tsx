import { vars } from 'nativewind';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { View, useColorScheme } from 'react-native';

import { defaultThemeMode } from '../tokens';
import type { ThemeMode } from '../tokens';
import { buildThemeVars, resolveThemeMode } from './themeMode';
import { useThemeStore } from './themeStore';

const ThemeModeContext = createContext<ThemeMode>(defaultThemeMode);

/** Thème sombre/clair effectivement appliqué (résolu depuis la préférence + le système). */
export function useThemeMode(): ThemeMode {
  return useContext(ThemeModeContext);
}

/**
 * Pose les variables CSS NativeWind du thème actif sur toute la sous-arborescence
 * (M1-1, ARCHITECTURE §6.2) : les classes `bg-background`, `text-textPrimary`,
 * `text-pnlProfit`… lisent ces variables — bascule sombre/clair et bleu/gris ↔
 * vert/rouge instantanée, sans rechargement (`useThemeStore`).
 * À monter une seule fois, à la racine (`apps/app/app/_layout.tsx`).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme);

  const mode = resolveThemeMode(preference, systemColorScheme);
  const themeVars = useMemo(
    () => vars(buildThemeVars(mode, pnlColorScheme)),
    [mode, pnlColorScheme],
  );

  return (
    <View style={[{ flex: 1 }, themeVars]}>
      <ThemeModeContext.Provider value={mode}>{children}</ThemeModeContext.Provider>
    </View>
  );
}
