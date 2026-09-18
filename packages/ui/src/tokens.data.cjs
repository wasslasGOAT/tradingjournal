/**
 * Source de vérité des tokens de design (données brutes).
 * Fichier CommonJS volontairement : consommé tel quel par `tailwind-preset.cjs`
 * (chargé par le CLI Tailwind en Node, hors bundler) ET par `tokens.ts` (typé,
 * consommé par l'app). Ne pas dupliquer ces valeurs ailleurs (ADR-012, ARCHITECTURE §6.2).
 *
 * Ébauche M0 (T4) : direction visuelle acceptée (ADR-012), détail des composants en M1.
 */

/** Fond noir, cartes `#0E0E11`, accent bleu — thème sombre par défaut. */
const dark = {
  background: '#000000',
  surface: '#0E0E11',
  surfaceAlt: '#16161B',
  border: '#232329',
  textPrimary: '#F5F6F7',
  textSecondary: '#9CA0AA',
  textMuted: '#6B6F78',
  accent: '#5D99F9',
  accentMuted: '#1E2B47',
  danger: '#F45B69',
  warning: '#F5A623',
};

/** Thème clair — même vocabulaire de tokens, prévu par ADR-012. */
const light = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F1F4',
  border: '#E2E4E9',
  textPrimary: '#101114',
  textSecondary: '#585C66',
  textMuted: '#8A8E99',
  accent: '#2F6FEA',
  accentMuted: '#DCE7FC',
  danger: '#D6394A',
  warning: '#B9790A',
};

/**
 * Couleurs P&L : `blueGray` (défaut, profits en bleu) ou `greenRed` (option),
 * réglage `preferences.pnl_colors` (ARCHITECTURE §6.2). `flat` = P&L nul.
 */
const pnl = {
  blueGray: { profit: '#5D99F9', loss: '#6B7280', flat: '#9CA0AA' },
  greenRed: { profit: '#37C97E', loss: '#F45B69', flat: '#9CA0AA' },
};

/** Rayons de bordure, en px (chaînes pour Tailwind). */
const radii = {
  none: '0px',
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
};

/** Espacements sémantiques, en complément de l'échelle numérique Tailwind par défaut. */
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

/** Typo : familles système (pas de police custom en M0) + échelle de tailles. */
const typography = {
  fontFamily: {
    sans: ['System', 'ui-sans-serif', 'sans-serif'],
    mono: ['Menlo', 'ui-monospace', 'monospace'],
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    md: ['18px', { lineHeight: '26px' }],
    lg: ['22px', { lineHeight: '30px' }],
    xl: ['28px', { lineHeight: '36px' }],
    '2xl': ['34px', { lineHeight: '42px' }],
  },
};

module.exports = { dark, light, pnl, radii, spacing, typography };
