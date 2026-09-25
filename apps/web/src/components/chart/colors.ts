import type { ColorTokens, PnlIntent } from '@/lib/theme/tokens';

import type { ChartIntent } from './types';

/** Palette P&L résolue pour le thème/schéma actifs — voir `themes`/`pnlColorSchemes` (`@/lib/theme/tokens`). */
export type ChartPnlPalette = Record<PnlIntent, string>;

/**
 * Résout un {@link ChartIntent} en couleur hex du thème actif (W-4, copie de
 * `packages/ui/src/chart/colors.ts`, gelé) — logique pure, testée sans rendu
 * (`Chart.tsx` passe des couleurs hex brutes à `recharts`, jamais une classe
 * Tailwind : même convention que `DayCell`).
 */
export function resolveChartColor(
  intent: ChartIntent | undefined,
  colors: ColorTokens,
  pnl: ChartPnlPalette,
): string {
  switch (intent ?? 'accent') {
    case 'profit':
      return pnl.profit;
    case 'loss':
      return pnl.loss;
    case 'flat':
      return pnl.flat;
    case 'neutral':
      return colors.textMuted;
    case 'accent':
    default:
      return colors.accent;
  }
}

/** Intention P&L déduite du signe d'une valeur déjà convertie en `number` (ex. hauteur de barre/bin). Jamais `-0` -> `'flat'` pour `0`. */
export function resolvePnlIntentFromNumber(value: number): PnlIntent {
  if (value === 0) return 'flat';
  return value < 0 ? 'loss' : 'profit';
}
