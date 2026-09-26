/**
 * Source de vérité des tokens de design (données brutes).
 * Fichier CommonJS volontairement : consommé tel quel par `tailwind-preset.cjs`
 * (chargé par le CLI Tailwind en Node, hors bundler) ET par `tokens.ts` (typé,
 * consommé par l'app). Ne pas dupliquer ces valeurs ailleurs (ADR-012, ARCHITECTURE §6.2).
 *
 * v2 (M1-1) : les couleurs sont lues par NativeWind via des variables CSS
 * (`vars()`, `ThemeProvider`) — `colorVarNames`/`pnlVarNames` donnent le nom de
 * variable pour chaque token, partagé entre `tailwind-preset.cjs` (valeurs de
 * repli, thème sombre) et `ThemeProvider` (valeurs réellement appliquées selon
 * le thème actif). Bascule sombre/clair et bleu/gris ↔ vert/rouge instantanée,
 * sans rechargement — aucune classe `dark:`.
 *
 * Contraste AA vérifié par `contrast.test.ts` (WCAG 2.1 : texte normal ≥ 4,5:1,
 * texte large ≥ 3:1 — ici tous les tokens de texte, y compris P&L, visent
 * ≥ 4,5:1 pour rester corrects quelle que soit la taille d'affichage).
 * Constats corrigés (architecte, 2026-09-18) : `textMuted` (sombre 3,8:1 → clair
 * 3,3:1), perte bleu/gris sur carte sombre (≈4:1), profits en thème clair
 * (2,1 à 2,9:1) — toutes les couleurs ci-dessous ont été recalculées pour
 * franchir 4,5:1 avec une marge (voir contrast.test.ts).
 */

/** Fond noir, cartes `#0E0E11` — thème sombre par défaut (ADR-012). */
const dark = {
  background: '#000000',
  surface: '#0E0E11',
  surfaceAlt: '#16161B',
  border: '#232329',
  textPrimary: '#F5F6F7',
  textSecondary: '#9CA0AA',
  // v2 : éclairci de #6B6F78 (3,8:1 sur carte) à 4,5:1+ sur fond/carte/carte alt.
  textMuted: '#868A93',
  // v2 (ADR-012/ADR-021) : légèrement décalé de #5D99F9 (teinte de la référence,
  // +6° de teinte, plus saturé) pour ne pas copier son identité — reste un bleu vif.
  accent: '#5081FC',
  accentMuted: '#1E2A47',
  // Texte/icône à poser sur un remplissage `accent` (ex. bouton principal) :
  // le blanc n'atteint que 3,6:1 sur ce bleu, un anthracite proche du fond passe à 5,45:1.
  onAccent: '#0B0D12',
  danger: '#F45B69',
  warning: '#F5A623',
  // M1-4 (`Toast`) : statut système « succès », indépendant du réglage `pnl_colors`
  // (bleu/gris vs vert/rouge, ARCHITECTURE §6.2) — un toast de succès reste vert même en
  // schéma bleu/gris, ce n'est pas un P&L. Même valeur que `pnl.dark.greenRed.profit`
  // ci-dessous (déjà vérifiée ≥ 4,5:1 sur `surface`/`surfaceAlt`), promue en token à part.
  success: '#37C97E',
  // M1-4 (`Sheet`) : voile d'assombrissement derrière un panneau/une modale —
  // volontairement identique en clair/sombre (convention « scrim », comme Material
  // Design : toujours proche du noir quel que soit le thème, jamais dérivé de
  // `background`/`surface` qui eux changent de thème). Opacité posée par l'appelant
  // (animée), pas ici — ce token ne porte que la teinte.
  scrim: '#000000',
};

/** Thème clair — même vocabulaire de tokens, prévu par ADR-012. */
const light = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F1F4',
  border: '#E2E4E9',
  textPrimary: '#101114',
  textSecondary: '#585C66',
  // v2 : assombri de #8A8E99 (3,3:1) à 4,5:1+ sur fond/carte/carte alt.
  textMuted: '#666A75',
  // v2 : même teinte décalée que le thème sombre, assombrie pour rester lisible
  // sur fond clair (5,4:1+).
  accent: '#1753E8',
  accentMuted: '#DCE5FC',
  onAccent: '#FFFFFF',
  // v2 : assombris pour atteindre 4,5:1 sur carte alt (danger 2,9:1 → , warning 3,2:1 →).
  danger: '#B62635',
  warning: '#875907',
  // Voir le commentaire sur `dark.success` — même valeur que `pnl.light.greenRed.profit`.
  success: '#1E7046',
  // Voir le commentaire sur `dark.scrim` : même teinte que le thème sombre (convention « scrim »).
  scrim: '#000000',
};

/**
 * Couleurs P&L : `blueGray` (défaut, profits en bleu) ou `greenRed` (option),
 * réglage `preferences.pnl_colors` (ARCHITECTURE §6.2). `flat` = P&L nul.
 * v2 (M1-1) : une palette par thème (sombre/clair) — la v1 réutilisait les
 * mêmes teintes sombres pour les deux thèmes, illisibles en clair (profits
 * 2,1 à 2,9:1). `profit`/`loss` réutilisent volontairement `accent`/`textSecondary`/
 * `danger`/`textMuted` déjà vérifiés ≥ 4,5:1, plutôt que des teintes ad hoc.
 */
const pnl = {
  dark: {
    blueGray: { profit: dark.accent, loss: dark.textSecondary, flat: dark.textMuted },
    greenRed: { profit: '#37C97E', loss: dark.danger, flat: dark.textMuted },
  },
  light: {
    blueGray: { profit: light.accent, loss: light.textSecondary, flat: light.textMuted },
    // v2 : vert assombri de #37C97E (2,1:1 sur fond clair) à 5,4:1+.
    greenRed: { profit: '#1E7046', loss: light.danger, flat: light.textMuted },
  },
};

/** Nom de variable CSS NativeWind pour chaque token de couleur (thème). */
const colorVarNames = {
  background: '--color-background',
  surface: '--color-surface',
  surfaceAlt: '--color-surface-alt',
  border: '--color-border',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textMuted: '--color-text-muted',
  accent: '--color-accent',
  accentMuted: '--color-accent-muted',
  onAccent: '--color-on-accent',
  danger: '--color-danger',
  warning: '--color-warning',
  success: '--color-success',
  scrim: '--color-scrim',
};

/** Nom de variable CSS NativeWind pour chaque intention P&L (indépendant du schéma actif). */
const pnlVarNames = {
  profit: '--color-pnl-profit',
  loss: '--color-pnl-loss',
  flat: '--color-pnl-flat',
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

/**
 * Typo (ADR-021) : Inter via `@expo-google-fonts/inter`, chargée par
 * `apps/app/app/_layout.tsx` (`useFonts`). RN ne synthétise pas les graisses
 * d'une police statique : chaque graisse est une famille distincte
 * (`font-sans`/`font-sans-medium`/`font-sans-semibold`), pas un `font-weight`
 * sur une même famille. Repli système tant que la police n'est pas chargée.
 */
const typography = {
  fontFamily: {
    sans: ['Inter_400Regular', 'System', 'sans-serif'],
    'sans-medium': ['Inter_500Medium', 'System', 'sans-serif'],
    'sans-semibold': ['Inter_600SemiBold', 'System', 'sans-serif'],
    mono: ['Menlo', 'ui-monospace', 'monospace'],
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
  },
  fontSize: {
    // M1-4 (correctif calendrier) : cellules très étroites (grille 8 colonnes en
    // 320-430 px, `DayCell`/`WeekTotalCell`) où même `xs` (12px) pousse les
    // montants à la troncature — un cran en dessous, réservé à ce contexte dense.
    '2xs': ['10px', { lineHeight: '14px' }],
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    md: ['18px', { lineHeight: '26px' }],
    lg: ['22px', { lineHeight: '30px' }],
    xl: ['28px', { lineHeight: '36px' }],
    '2xl': ['34px', { lineHeight: '42px' }],
  },
  /**
   * Chiffres tabulaires (ADR-021) pour tous les montants : largeur fixe par
   * chiffre, évite que les colonnes de chiffres « sautent » au chargement.
   * Exposé en objet de style RN (et non en classe NativeWind) : garantit le
   * même rendu sur web et natif sans dépendre du support `font-variant-numeric`
   * du compilateur NativeWind.
   */
  tabularNumsStyle: { fontVariant: ['tabular-nums'] },
};

/**
 * Durées (ms) et courbes d'animation (Reanimated `Easing.bezier(...)`),
 * ARCHITECTURE §6.3/ADR-017. `spring` : presets `withSpring`.
 */
const animation = {
  duration: {
    fast: 120,
    base: 200,
    slow: 320,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    decelerate: [0, 0, 0.2, 1],
    accelerate: [0.4, 0, 1, 1],
  },
  spring: {
    default: { damping: 18, stiffness: 220, mass: 1 },
    snappy: { damping: 20, stiffness: 300, mass: 0.9 },
    gentle: { damping: 22, stiffness: 150, mass: 1 },
  },
};

/**
 * Élévations/lueurs (`GlowCard`, ARCHITECTURE §6.2) : props `shadow*` RN
 * (iOS/web) + `elevation` (Android). `glow` teinte l'ombre en `accent`.
 */
const elevation = {
  card: {
    dark: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    light: {
      shadowColor: '#1B1F27',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
  glow: {
    dark: {
      shadowColor: dark.accent,
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    light: {
      shadowColor: light.accent,
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
  },
};

module.exports = {
  dark,
  light,
  pnl,
  colorVarNames,
  pnlVarNames,
  radii,
  spacing,
  typography,
  animation,
  elevation,
};
