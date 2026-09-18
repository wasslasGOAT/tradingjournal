/** Déclarations de types pour `tokens.data.cjs` (données brutes des tokens, module CommonJS). */

declare const tokensData: {
  dark: Record<string, string>;
  light: Record<string, string>;
  pnl: {
    blueGray: { profit: string; loss: string; flat: string };
    greenRed: { profit: string; loss: string; flat: string };
  };
  radii: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    fontFamily: { sans: string[]; mono: string[] };
    fontSize: Record<string, [string, { lineHeight: string }]>;
  };
};

export = tokensData;
