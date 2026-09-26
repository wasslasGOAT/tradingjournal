import type { ChartLineSeries } from './types';

/** Une ligne de donnée fusionnée pour `recharts` (une valeur par série présente à ce `x`, `undefined` sinon — trou de la ligne). */
export type MergedLineRow = { readonly x: number } & Record<string, number | undefined>;

/**
 * Fusionne plusieurs {@link ChartLineSeries} en lignes `{ x, [seriesId]: y }`
 * (W-4, copie de `packages/ui/src/chart/mergeLineSeries.ts`, gelé) — format
 * attendu par `recharts` (`LineChart`/`AreaChart` lisent une seule liste de
 * lignes, une clé par série). Union des `x` de toutes les séries, triée
 * croissante ; une série sans point à un `x` donné laisse un trou
 * (`undefined`), pas un `0`.
 */
export function mergeLineSeries(series: readonly ChartLineSeries[]): MergedLineRow[] {
  const xValues = new Set<number>();
  for (const s of series) {
    for (const point of s.points) xValues.add(point.x);
  }
  const sortedX = [...xValues].sort((a, b) => a - b);

  return sortedX.map((x) => {
    const row: MergedLineRow = { x };
    for (const s of series) {
      const point = s.points.find((p) => p.x === x);
      if (point) row[s.id] = point.y;
    }
    return row;
  });
}
