/**
 * Convertit un token de couleur hex (`#RRGGBB`, `themes[mode].*`) en chaîne
 * `rgba(...)` — seul moyen de composer un calque translucide (ex. heatmap,
 * `components/chart/heatmapColor.ts`) à partir des tokens de couleur, qui
 * sont des hex opaques (W-4, copie de `packages/ui/src/theme/withAlpha.ts`,
 * gelé). Jamais utilisé avec une couleur en dur : toujours `themes[mode].<clé>`
 * en entrée.
 * @param alpha opacité `[0, 1]`
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
