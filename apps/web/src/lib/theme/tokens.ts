import tokensData from '@repo/ui/tokens-data';

/**
 * Adaptateur typé autour de la source de vérité des tokens (`@repo/ui/tokens-data`
 * → `packages/ui/src/tokens.data.cjs`, ADR-012/ADR-024). `packages/ui/src/tokens.ts`
 * fait la même chose pour Expo, mais `packages/ui` est gelé (ADR-023) et son
 * barrel n'est pas importable ici : ce fichier ne fait que retyper les mêmes
 * données brutes, sans en dupliquer une seule valeur à la main (W-3).
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

export const themeModes: ThemeMode[] = ['dark', 'light'];
export const pnlColorSchemeKeys: PnlColorScheme[] = ['blueGray', 'greenRed'];

export const defaultThemeMode: ThemeMode = 'dark';
export const defaultPnlColorScheme: PnlColorScheme = 'blueGray';

export type ColorTokens = (typeof themes)[ThemeMode];
