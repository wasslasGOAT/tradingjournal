import type { TextStyle } from 'react-native';

import tokensData from './tokens.data.cjs';

/**
 * Tokens de design v2 (M1-1, ARCHITECTURE §6.2, ADR-012/ADR-017/ADR-021) :
 * couleurs par variable CSS NativeWind (voir `theme/ThemeProvider`), P&L par
 * thème, typo Inter + chiffres tabulaires, animation, élévations/lueurs.
 * Contraste AA vérifié par `theme/contrast.test.ts`.
 */

export type ThemeMode = 'dark' | 'light';
export type PnlColorScheme = 'blueGray' | 'greenRed';
export type PnlIntent = 'profit' | 'loss' | 'flat';

export const themes = {
  dark: tokensData.dark,
  light: tokensData.light,
} satisfies Record<ThemeMode, Record<string, string>>;

export const pnlColorSchemes = {
  dark: tokensData.pnl.dark,
  light: tokensData.pnl.light,
} satisfies Record<ThemeMode, Record<PnlColorScheme, Record<PnlIntent, string>>>;

export const colorVarNames = tokensData.colorVarNames;
export const pnlVarNames = tokensData.pnlVarNames;

export const radii = tokensData.radii;
export const spacing = tokensData.spacing;
export const typography = tokensData.typography;
export const animation = tokensData.animation;
export const elevation = tokensData.elevation;

/**
 * `typography.tabularNumsStyle` typé pour un style RN (`react-native.TextStyle`) —
 * `tokens.data.d.cts` le déclare en `{ fontVariant: string[] }` (fichier de
 * données partagé avec Tailwind, sans dépendance à `react-native`) ; `FontVariant`
 * n'accepte que des littéraux connus (`'tabular-nums'` ici, valeur fixe dans
 * `tokens.data.cjs`). À utiliser dans tout composant appliquant ce style à un
 * montant plutôt que de re-caster `typography.tabularNumsStyle` à chaque site
 * d'usage (M1-3).
 */
export const tabularNumsStyle = typography.tabularNumsStyle as TextStyle;

export const defaultThemeMode: ThemeMode = 'dark';
export const defaultPnlColorScheme: PnlColorScheme = 'blueGray';

export type ColorTokens = (typeof themes)[ThemeMode];

/** Palette du thème sombre par défaut, utilisée avant que la préférence utilisateur soit connue. */
export const defaultColors: ColorTokens = themes[defaultThemeMode];
