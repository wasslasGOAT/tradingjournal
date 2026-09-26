import type { ChartHistogramBin } from './types';

/**
 * Découpage générique en classes de largeur égale (M1-6) — utilitaire
 * d'affichage pour peupler un `Chart` `type: 'histogram'` à partir de valeurs
 * `number` brutes (ex. catalogue de composants, écran sans distribution déjà
 * calculée par `packages/core`). **Ne remplace pas** une distribution métier
 * comme `computeRDistribution` (`packages/core/aggregates`, classes en
 * `Decimal`, arrondi exact) : celle-ci reste la source de vérité dès qu'un
 * calcul de R multiples/pnl est en jeu.
 *
 * @param values valeurs à répartir (vide -> `[]`)
 * @param binCount nombre de classes visées, doit être `> 0`
 */
export function binNumericValues(values: readonly number[], binCount: number): ChartHistogramBin[] {
  if (values.length === 0) return [];
  if (binCount <= 0) {
    throw new Error(`binCount doit être strictement positif (reçu ${binCount}).`);
  }

  let min = values[0]!;
  let max = values[0]!;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  // Domaine dégénéré (toutes les valeurs identiques) : une seule classe centrée sur la valeur.
  if (min === max) {
    return [{ x0: min - 0.5, x1: min + 0.5, value: values.length }];
  }

  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of values) {
    // La valeur maximale tombe dans la dernière classe (borne haute incluse
    // uniquement pour elle, sinon `floor` la ferait déborder d'une classe).
    const rawIndex = Math.floor((value - min) / width);
    const index = Math.min(rawIndex, binCount - 1);
    counts[index] = (counts[index] ?? 0) + 1;
  }

  return counts.map((count, index) => ({
    x0: min + index * width,
    x1: min + (index + 1) * width,
    value: count,
  }));
}
