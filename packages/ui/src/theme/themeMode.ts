import type { ColorSchemeName } from 'react-native';

import { colorVarNames, pnlColorSchemes, pnlVarNames, themes } from '../tokens';
import type { PnlColorScheme, ThemeMode } from '../tokens';

/**
 * Logique pure de résolution de thème (M1-1) — testée sans rendu React.
 * `ThemeProvider` (composant) ne fait qu'appeler ces fonctions et les poser
 * en variables CSS NativeWind (`vars()`).
 */

/** Préférence utilisateur : `system` suit l'appareil, sinon thème forcé. La persistance arrive plus tard (M1). */
export type ThemePreference = 'system' | ThemeMode;

/**
 * Valeur renvoyée par `useColorScheme()` (React Native) : `null`/`undefined` tant
 * que non déterminée (ex. premier rendu web avant hydratation), `'unspecified'`
 * possible sur Android (pas de préférence système déclarée).
 */
export type SystemColorScheme = ColorSchemeName | null | undefined;

/**
 * Résout le thème effectif : tout ce qui n'est pas explicitement `'light'`
 * (système inconnu, `'unspecified'`) retombe sur le thème sombre par défaut
 * (ADR-012) plutôt que de flasher un thème clair non désiré.
 */
export function resolveThemeMode(
  preference: ThemePreference,
  systemColorScheme: SystemColorScheme,
): ThemeMode {
  if (preference !== 'system') return preference;
  return systemColorScheme === 'light' ? 'light' : 'dark';
}

/**
 * Construit la table `{ nomDeVariableCSS: valeur }` pour le thème et le schéma
 * P&L actifs — à passer à `vars()` (NativeWind) sur la vue racine.
 */
export function buildThemeVars(
  mode: ThemeMode,
  pnlColorScheme: PnlColorScheme,
): Record<string, string> {
  const colors = themes[mode];
  const pnl = pnlColorSchemes[mode][pnlColorScheme];
  const result: Record<string, string> = {};

  for (const [key, varName] of Object.entries(colorVarNames)) {
    // `themes[mode]` et `colorVarNames` partagent les mêmes clés (vérifié par tokens.test.ts).
    result[varName] = colors[key as keyof typeof colors];
  }
  for (const [intent, varName] of Object.entries(pnlVarNames)) {
    result[varName] = pnl[intent as keyof typeof pnl];
  }

  return result;
}
