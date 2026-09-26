import { animation, pnlColorSchemes, radii, spacing, themes, typography } from './tokens';
import type { ColorTokens, PnlColorScheme, ThemeMode } from './tokens';

/**
 * Génère `src/styles/theme.generated.css` (Tailwind v4, ADR-024) depuis la
 * source de vérité des tokens (`@repo/ui/tokens-data`) — aucune couleur/taille
 * recopiée à la main (W-3). Fonction pure (pas de `fs`/DOM) : le fichier est
 * écrit par `vite.config.ts` (Node), et cette fonction reste testable seule.
 *
 * Deux couches :
 * 1. Variables « sémantiques » (`--background`, `--brand`, `--pnl-profit`…) —
 *    valeurs réelles posées par thème (`[data-theme]`) et schéma P&L
 *    (`[data-pnl]`) sur `<html>`, permettant une bascule instantanée sans
 *    recharger la feuille de style (le théorique `<html data-theme>` change,
 *    pas les classes Tailwind générées).
 * 2. `@theme inline { ... }` — mappe ces variables sémantiques sur les noms
 *    attendus par Tailwind v4 et par shadcn/ui (`--color-background`,
 *    `--color-primary`, etc.), plus rayons/espacements/typo/durées.
 */

/** Nom de variable CSS (kebab-case) pour chaque token sémantique de couleur. */
const COLOR_VAR_NAMES: Record<keyof ColorTokens, string> = {
  background: '--background',
  surface: '--surface',
  surfaceAlt: '--surface-alt',
  border: '--border',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  // `accent` (tokens) = la couleur de marque (bleu) — renommée `--brand` côté
  // web pour ne pas entrer en collision avec `--accent`/`--accent-foreground`
  // de shadcn (fond de survol neutre, voir MUTED_ALIASES ci-dessous).
  accent: '--brand',
  accentMuted: '--brand-muted',
  onAccent: '--on-brand',
  danger: '--danger',
  warning: '--warning',
  success: '--success',
  scrim: '--scrim',
};

const PNL_VAR_NAMES: Record<'profit' | 'loss' | 'flat', string> = {
  profit: '--pnl-profit',
  loss: '--pnl-loss',
  flat: '--pnl-flat',
};

const THEME_MODES: ThemeMode[] = ['dark', 'light'];
const PNL_SCHEMES: PnlColorScheme[] = ['blueGray', 'greenRed'];

function semanticVarLines(mode: ThemeMode, scheme: PnlColorScheme): string[] {
  const colors = themes[mode];
  const pnl = pnlColorSchemes[mode][scheme];
  return [
    ...(Object.keys(COLOR_VAR_NAMES) as (keyof ColorTokens)[]).map(
      (key) => `  ${COLOR_VAR_NAMES[key]}: ${colors[key]};`,
    ),
    ...(Object.keys(PNL_VAR_NAMES) as (keyof typeof PNL_VAR_NAMES)[]).map(
      (intent) => `  ${PNL_VAR_NAMES[intent]}: ${pnl[intent]};`,
    ),
  ];
}

/** Bloc `:root`/`[data-theme]`/`[data-pnl]` — valeurs réelles par thème et schéma P&L. */
function buildSemanticColorBlocks(): string {
  const blocks: string[] = [];

  for (const mode of THEME_MODES) {
    for (const scheme of PNL_SCHEMES) {
      const isDefaultScheme = scheme === 'blueGray';
      const selectors =
        mode === 'dark' && isDefaultScheme
          ? [':root', "[data-theme='dark']"]
          : mode === 'dark'
            ? [`[data-theme='dark'][data-pnl='${scheme}']`]
            : isDefaultScheme
              ? [`[data-theme='light']`]
              : [`[data-theme='light'][data-pnl='${scheme}']`];
      blocks.push(`${selectors.join(', ')} {\n${semanticVarLines(mode, scheme).join('\n')}\n}`);
    }
  }

  return blocks.join('\n\n');
}

/** Alias shadcn/ui → variables sémantiques (`@theme inline`, ADR-024). */
const SHADCN_COLOR_ALIASES: Record<string, string> = {
  '--color-background': 'var(--background)',
  '--color-foreground': 'var(--text-primary)',
  '--color-card': 'var(--surface)',
  '--color-card-foreground': 'var(--text-primary)',
  '--color-popover': 'var(--surface)',
  '--color-popover-foreground': 'var(--text-primary)',
  '--color-primary': 'var(--brand)',
  '--color-primary-foreground': 'var(--on-brand)',
  '--color-secondary': 'var(--surface-alt)',
  '--color-secondary-foreground': 'var(--text-primary)',
  '--color-muted': 'var(--surface-alt)',
  '--color-muted-foreground': 'var(--text-muted)',
  // shadcn `accent` = fond de survol/sélection neutre (distinct de la couleur
  // de marque, exposée séparément ci-dessous en `--color-brand`).
  '--color-accent': 'var(--surface-alt)',
  '--color-accent-foreground': 'var(--text-primary)',
  '--color-destructive': 'var(--danger)',
  '--color-destructive-foreground': 'var(--on-brand)',
  '--color-border': 'var(--border)',
  '--color-input': 'var(--border)',
  '--color-ring': 'var(--brand)',
};

/** Tokens exposés tels quels (marque, statuts système, P&L — ARCHITECTURE §6.2). */
const DIRECT_COLOR_ALIASES: Record<string, string> = {
  '--color-brand': 'var(--brand)',
  '--color-brand-muted': 'var(--brand-muted)',
  '--color-on-brand': 'var(--on-brand)',
  '--color-warning': 'var(--warning)',
  '--color-success': 'var(--success)',
  '--color-scrim': 'var(--scrim)',
  '--color-pnl-profit': 'var(--pnl-profit)',
  '--color-pnl-loss': 'var(--pnl-loss)',
  '--color-pnl-flat': 'var(--pnl-flat)',
};

function radiusVars(): string[] {
  return Object.entries(radii).map(([key, value]) => `  --radius-${key}: ${value};`);
}

/**
 * Espacements nommés du design system, exposés sous `--space-*` — **jamais**
 * `--spacing-*` (W-4, correctif) : dans Tailwind v4, `--spacing-*` est un
 * espace de noms **partagé** par de très nombreux utilitaires au-delà de
 * `p-*`/`gap-*` (`w-*`, `h-*`, `min-w-*`/`max-w-*`, `inset-*`, `translate-*`,
 * `size-*`…). Nos clés (`xs`/`sm`/`md`/`lg`/`xl`/`2xl`) sont aussi des mots-clés
 * intégrés de Tailwind pour ces mêmes utilitaires (ex. `max-w-lg` = 32rem par
 * défaut) : les exposer sous `--spacing-lg` écrasait silencieusement
 * `max-w-lg`/`max-w-sm`/… par nos valeurs d'espacement (24px/8px…), cassant
 * `DialogContent`/`DrawerContent`/`EmptyState` (constaté visuellement en
 * révision W-4 : `Dialog` réduit à une largeur de ~24px). `--space-*` reste
 * disponible via `var(--space-sm)` pour qui en a besoin, sans interférer avec
 * l'espace de noms `--spacing-*` de Tailwind. Aucun code de `apps/web` ne
 * dépend d'utilitaires `p-xs`/`gap-md`… (vérifié) : seuls les utilitaires
 * numériques standard de Tailwind (`p-4`, `gap-2`…) sont utilisés.
 */
function spaceVars(): string[] {
  return Object.entries(spacing).map(([key, value]) => `  --space-${key}: ${value};`);
}

/**
 * Tailles de texte (`--text-*` + `--text-*--line-height`, Tailwind v4). Les
 * graisses (`typography.fontWeight`) ne sont pas remappées : 400/500/600
 * correspondent déjà aux utilitaires par défaut de Tailwind
 * (`font-normal`/`font-medium`/`font-semibold`).
 */
function fontSizeVars(): string[] {
  return Object.entries(typography.fontSize).flatMap(([key, [size, { lineHeight }]]) => [
    `  --text-${key}: ${size};`,
    `  --text-${key}--line-height: ${lineHeight};`,
  ]);
}

function durationVars(): string[] {
  return Object.entries(animation.duration).map(([key, ms]) => `  --duration-${key}: ${ms}ms;`);
}

function easingVars(): string[] {
  return Object.entries(animation.easing).map(
    ([key, curve]) => `  --ease-${key}: cubic-bezier(${curve.join(', ')});`,
  );
}

/**
 * Police web (ADR-021 côté natif = familles RN `Inter_400Regular`…, chargées
 * par `expo-google-fonts`) : `apps/web` charge `@fontsource-variable/inter`
 * (une seule famille variable, `globals.css`) — pile différente de la pile
 * native, donc volontairement pas reprise de `typography.fontFamily` (qui
 * liste des noms de police React Native invalides sur le web).
 */
const FONT_FAMILY_VARS = [
  "  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;",
  "  --font-mono: ui-monospace, 'SFMono Regular', Menlo, monospace;",
];

function buildThemeInlineBlock(): string {
  const lines = [
    ...Object.entries(SHADCN_COLOR_ALIASES).map(([varName, value]) => `  ${varName}: ${value};`),
    ...Object.entries(DIRECT_COLOR_ALIASES).map(([varName, value]) => `  ${varName}: ${value};`),
    ...radiusVars(),
    ...spaceVars(),
    ...fontSizeVars(),
    ...FONT_FAMILY_VARS,
    ...durationVars(),
    ...easingVars(),
  ];
  return `@theme inline {\n${lines.join('\n')}\n}`;
}

/** Génère le contenu complet de `theme.generated.css` (W-3). */
export function buildThemeCss(): string {
  return [
    '/**',
    ' * Généré depuis les tokens (@repo/ui/tokens-data, ADR-012/ADR-024) par',
    ' * `src/lib/theme/generate-theme-css.ts` — voir `vite.config.ts`.',
    ' * NE PAS MODIFIER À LA MAIN : régénéré à chaque démarrage/build de Vite.',
    ' * Bascule de thème/P&L : attributs `data-theme`/`data-pnl` sur `<html>`',
    ' * (`src/features/preferences/theme-store.ts`), jamais de classe `dark:`.',
    ' */',
    '',
    buildSemanticColorBlocks(),
    '',
    buildThemeInlineBlock(),
    '',
  ].join('\n');
}
