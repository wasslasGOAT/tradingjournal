/**
 * Preset Tailwind / NativeWind partagé (ARCHITECTURE §6.2, ADR-012).
 * Consommé par `apps/app/tailwind.config.js` via `presets: [require('@repo/ui/tailwind-preset')]`.
 * CommonJS volontairement : chargé par le CLI Tailwind en Node (hors Metro).
 *
 * v2 (M1-1) : les classes de couleur (`bg-background`, `text-textPrimary`, …)
 * lisent des variables CSS NativeWind (`var(--color-…)`), posées par
 * `ThemeProvider` (`packages/ui/src/theme`) selon le thème actif — bascule
 * sombre/clair et bleu/gris ↔ vert/rouge instantanée, sans rechargement. La
 * valeur de repli (thème sombre) évite un flash non stylé avant le montage du
 * `ThemeProvider` (ex. tests sans provider).
 */
const {
  dark,
  pnl,
  colorVarNames,
  pnlVarNames,
  radii,
  spacing,
  typography,
  animation,
} = require('./src/tokens.data.cjs');

function cssVar(varName, fallback) {
  return `var(${varName}, ${fallback})`;
}

const colors = {};
for (const [key, varName] of Object.entries(colorVarNames)) {
  colors[key] = cssVar(varName, dark[key]);
}
for (const [intent, varName] of Object.entries(pnlVarNames)) {
  const className = `pnl${intent.charAt(0).toUpperCase()}${intent.slice(1)}`;
  colors[className] = cssVar(varName, pnl.dark.blueGray[intent]);
}

module.exports = {
  // M1-8 : l'app ne bascule jamais de classe `.dark` sur `<html>` — `ThemeProvider`
  // pilote sombre/clair par variables CSS (`vars()`, ci-dessus), jamais par les
  // variantes `dark:` de Tailwind/NativeWind. Sans ce réglage explicite, NativeWind
  // web reste sur son défaut `darkMode: 'media'` : son observateur interne
  // (`react-native-css-interop`) plante avec « Cannot manually set color scheme, as
  // dark mode is type 'media' » dès qu'une feuille de style est (re)injectée après le
  // montage initial (repro : ouvrir `/` en 1280 px déclenche le montage tardif de
  // `Sidebar`/`SidebarItem`, absent du graphe de la tab bar mobile). `'class'` évite
  // ce plantage sans effet visuel, puisqu'aucune classe `dark:` n'est utilisée ici.
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      borderRadius: radii,
      spacing,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      transitionDuration: {
        fast: `${animation.duration.fast}ms`,
        base: `${animation.duration.base}ms`,
        slow: `${animation.duration.slow}ms`,
      },
    },
  },
  plugins: [],
};
