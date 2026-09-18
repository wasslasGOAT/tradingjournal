/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  // Preset NativeWind (utilitaires RN) + tokens partagés du design system (ARCHITECTURE §6.2, ADR-012).
  presets: [require('nativewind/preset'), require('@repo/ui/tailwind-preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
