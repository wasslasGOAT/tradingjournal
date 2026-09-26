/** Déclarations de types pour `tokens.data.cjs` (données brutes des tokens, module CommonJS). */

// Union explicite (plutôt que `Record<string, string>`) : avec
// `noUncheckedIndexedAccess`, un index signature générique renverrait
// `string | undefined` à chaque accès ; ici les clés sont connues et finies.
type ColorTokenKey =
  | 'background'
  | 'surface'
  | 'surfaceAlt'
  | 'border'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'accent'
  | 'accentMuted'
  | 'onAccent'
  | 'danger'
  | 'warning'
  | 'success'
  | 'scrim';
type ThemeColors = Record<ColorTokenKey, string>;
type PnlIntents = { profit: string; loss: string; flat: string };
type PnlSchemes = { blueGray: PnlIntents; greenRed: PnlIntents };

declare const tokensData: {
  dark: ThemeColors;
  light: ThemeColors;
  pnl: {
    dark: PnlSchemes;
    light: PnlSchemes;
  };
  colorVarNames: Record<ColorTokenKey, string>;
  pnlVarNames: Record<'profit' | 'loss' | 'flat', string>;
  radii: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    fontFamily: Record<string, string[]>;
    fontWeight: Record<string, string>;
    fontSize: Record<string, [string, { lineHeight: string }]>;
    tabularNumsStyle: { fontVariant: string[] };
  };
  animation: {
    duration: Record<string, number>;
    easing: Record<string, [number, number, number, number]>;
    spring: Record<string, { damping: number; stiffness: number; mass: number }>;
  };
  elevation: {
    card: Record<'dark' | 'light', Record<string, unknown>>;
    glow: Record<'dark' | 'light', Record<string, unknown>>;
  };
};

export = tokensData;
