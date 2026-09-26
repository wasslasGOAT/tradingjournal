import { hexToRgba } from '../theme/withAlpha';
import type { ColorTokens } from '../tokens';
import type { ChartPnlPalette } from './colors';

/**
 * Intensité `[0, 1]` de `value` par rapport à `maxAbsValue` (M1-6, heatmap
 * sans bibliothèque). Alpha minimal `0.12` même pour la plus petite valeur
 * non nulle : une cellule à très faible intensité doit rester visible/
 * cliquable (contraste), pas quasi transparente. `value === 0` ou
 * `maxAbsValue === 0` -> `0` (case vide, pas de division par zéro).
 */
export function computeHeatmapIntensity(value: number, maxAbsValue: number): number {
  if (value === 0 || maxAbsValue === 0) return 0;
  const ratio = Math.min(Math.abs(value) / maxAbsValue, 1);
  const MIN_ALPHA = 0.12;
  return MIN_ALPHA + ratio * (1 - MIN_ALPHA);
}

/**
 * Couleur d'une cellule de heatmap : teinte profit/perte du schéma P&L actif
 * (selon le signe de `value`), diluée par {@link computeHeatmapIntensity} —
 * cohérent avec le reste de l'app (P&L bleu/gris ou vert/rouge selon
 * `preferences.pnl_colors`), jamais une échelle de couleur ad hoc.
 * `value === 0` -> couleur `flat` à intensité nulle (cellule quasi neutre,
 * distincte du fond par sa bordure, pas par son remplissage).
 */
export function resolveHeatmapCellColor(
  value: number,
  maxAbsValue: number,
  pnl: ChartPnlPalette,
): string {
  const intensity = computeHeatmapIntensity(value, maxAbsValue);
  const baseColor = value === 0 ? pnl.flat : value > 0 ? pnl.profit : pnl.loss;
  return hexToRgba(baseColor, intensity === 0 ? 0.08 : intensity);
}

/** Couleur de la bordure d'une cellule de heatmap — toujours `colors.border`, indépendante de l'intensité. */
export function resolveHeatmapCellBorderColor(colors: ColorTokens): string {
  return colors.border;
}

/** `max(|value|)` sur un ensemble de cellules — base de {@link computeHeatmapIntensity}. `0` si vide. */
export function computeMaxAbsValue(values: readonly number[]): number {
  let max = 0;
  for (const value of values) {
    const abs = Math.abs(value);
    if (abs > max) max = abs;
  }
  return max;
}
