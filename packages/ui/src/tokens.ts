import tokensData from './tokens.data.cjs';

/**
 * Tokens de design — ébauche M0 (T4). Direction visuelle acceptée par ADR-012 :
 * fond noir, cartes sombres, accent bleu, profits en bleu (option vert/rouge).
 * Le catalogue de composants et l'affinage des couleurs viennent en M1 (ARCHITECTURE §6.2).
 */

export type ThemeMode = 'dark' | 'light';
export type PnlColorScheme = 'blueGray' | 'greenRed';
export type PnlIntent = 'profit' | 'loss' | 'flat';

export const themes = {
  dark: tokensData.dark,
  light: tokensData.light,
} satisfies Record<ThemeMode, Record<string, string>>;

export const pnlColorSchemes = {
  blueGray: tokensData.pnl.blueGray,
  greenRed: tokensData.pnl.greenRed,
} satisfies Record<PnlColorScheme, Record<PnlIntent, string>>;

export const radii = tokensData.radii;
export const spacing = tokensData.spacing;
export const typography = tokensData.typography;

export const defaultThemeMode: ThemeMode = 'dark';
export const defaultPnlColorScheme: PnlColorScheme = 'blueGray';

export type ColorTokens = (typeof themes)[ThemeMode];

/** Palette du thème sombre par défaut, utilisée avant que la préférence utilisateur soit connue. */
export const defaultColors: ColorTokens = themes[defaultThemeMode];
