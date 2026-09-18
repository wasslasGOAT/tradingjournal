/**
 * Preset Tailwind / NativeWind partagé (ARCHITECTURE §6.2, ADR-012).
 * Consommé par `apps/app/tailwind.config.js` via `presets: [require('@repo/ui/tailwind-preset')]`.
 * CommonJS volontairement : chargé par le CLI Tailwind en Node (hors Metro).
 */
const { dark, pnl, radii, spacing, typography } = require('./src/tokens.data.cjs');

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      // Palette par défaut (sombre) exposée sous forme de classes utilitaires,
      // ex. `bg-background`, `text-textPrimary`, `border-border`.
      colors: {
        ...dark,
        pnlProfit: pnl.blueGray.profit,
        pnlLoss: pnl.blueGray.loss,
        pnlFlat: pnl.blueGray.flat,
        pnlProfitAlt: pnl.greenRed.profit,
        pnlLossAlt: pnl.greenRed.loss,
      },
      borderRadius: radii,
      spacing,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
    },
  },
  plugins: [],
};
