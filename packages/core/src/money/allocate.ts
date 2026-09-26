import { Decimal } from './decimal';

/** Erreur typée levée par {@link allocateProRata} sur des poids invalides. */
export class InvalidAllocationWeightsError extends Error {
  constructor(reason: string) {
    super(`Répartition au prorata impossible : ${reason}.`);
    this.name = 'InvalidAllocationWeightsError';
  }
}

/**
 * Répartit un montant total en autant de parts que `weights`, au prorata de
 * chaque poids, arrondies à `scale` décimales — **la dernière part de poids
 * non nul absorbe l'écart d'arrondi** (`total - Σ(autres parts)`) plutôt qu'un arrondi
 * indépendant par part, qui pourrait faire dévier la somme des parts de
 * `total` d'un centime (revue M3 #10 ; même principe que la répartition
 * commission/frais de `packages/core/trading/groupExecutions`, mais
 * généralisé ici pour toute répartition future).
 *
 * Formule : `share[i] = (total * weight[i] / Σweights)` arrondi à `scale`
 * décimales ; l'index `k` de la dernière part de poids non nul reçoit
 * `total - Σ(share[i≠k])`. Une part de poids nul vaut donc toujours `0`
 * (revue M3 boucle 2 : `[1, 1, 0]` ne doit jamais donner de reste à la 3ᵉ part).
 *
 * @param total montant total à répartir
 * @param weights poids de chaque part (ex. quantités), toutes `>= 0`, au moins un `> 0`
 * @param scale décimales d'arrondi des parts intermédiaires (toutes sauf la dernière), défaut `8`
 * @returns une part par poids de `weights`, dans le même ordre, dont la somme vaut **exactement** `total`
 * @throws {InvalidAllocationWeightsError} si `weights` est vide, contient un poids négatif, ou si la somme des poids est nulle
 */
export function allocateProRata(total: Decimal, weights: readonly Decimal[], scale = 8): Decimal[] {
  if (weights.length === 0) {
    throw new InvalidAllocationWeightsError('weights ne peut pas être vide');
  }
  if (weights.some((w) => w.lessThan(0))) {
    throw new InvalidAllocationWeightsError('aucun poids ne peut être négatif');
  }
  const totalWeight = weights.reduce((acc, w) => acc.plus(w), new Decimal(0));
  if (totalWeight.isZero()) {
    throw new InvalidAllocationWeightsError('la somme des poids doit être strictement positive');
  }

  const shares = weights.map((w) =>
    total.times(w).dividedBy(totalWeight).toDecimalPlaces(scale, Decimal.ROUND_HALF_EVEN),
  );
  // Dernière part de poids non nul : elle absorbe l'écart d'arrondi. Une part de
  // poids nul reste à 0 (elle ne représente aucune quantité à répartir).
  let absorbing = weights.length - 1;
  while (absorbing > 0 && weights[absorbing]?.isZero() === true) {
    absorbing -= 1;
  }
  const allocatedElsewhere = shares.reduce(
    (acc, s, i) => (i === absorbing ? acc : acc.plus(s)),
    new Decimal(0),
  );
  return shares.map((s, i) => (i === absorbing ? total.minus(allocatedElsewhere) : s));
}
