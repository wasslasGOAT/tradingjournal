/**
 * Échelles cartésiennes pures (W-4) : copie web de `packages/ui/src/chart/scale.ts`
 * (gelé, ADR-023) — indépendantes de recharts, utilisées pour calculer les
 * domaines/graduations des axes. Aucune dépendance DOM.
 */

export type NumericDomain = readonly [number, number];

/** Domaine `[min, max]` d'un ensemble de valeurs. `[0, 0]` si `values` est vide (rien à diviser par zéro plus loin). */
export function computeDomain(values: readonly number[]): NumericDomain {
  if (values.length === 0) return [0, 0];
  let min = values[0]!;
  let max = values[0]!;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

/**
 * Construit une échelle linéaire `domaine -> intervalle` (ex. valeur -> pixel).
 * Domaine dégénéré (`min === max`) : renvoie toujours le milieu de
 * l'intervalle (évite une division par zéro, cas d'une série à un seul point
 * ou constante).
 */
export function createLinearScale(
  domain: NumericDomain,
  range: NumericDomain,
): (value: number) => number {
  const [domainMin, domainMax] = domain;
  const [rangeMin, rangeMax] = range;
  const domainSpan = domainMax - domainMin;

  if (domainSpan === 0) {
    const mid = (rangeMin + rangeMax) / 2;
    return () => mid;
  }

  return (value: number) => {
    const ratio = (value - domainMin) / domainSpan;
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
}

/**
 * Pas "arrondi" (1/2/5 × puissance de 10) le plus proche de `rawStep`, pour
 * des graduations lisibles (convention D3 `ticks`). `rawStep` doit être `> 0`.
 */
function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const niceResidual = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  return niceResidual * magnitude;
}

/**
 * Graduations lisibles couvrant `domain` (`count` graduations visées, pas
 * garanties exactes — convention D3 `ticks`). Domaine dégénéré ou `count <= 0` ->
 * `[domain[0]]` (une seule graduation, pas de division par zéro).
 */
export function computeTicks(domain: NumericDomain, count = 4): number[] {
  const [domainMin, domainMax] = domain;
  if (domainMin === domainMax || count <= 0) return [domainMin];

  const step = niceStep((domainMax - domainMin) / count);
  const start = Math.ceil(domainMin / step) * step;
  const ticks: number[] = [];
  // Tolérance flottante : évite d'omettre/dupliquer la dernière graduation
  // par erreur d'arrondi binaire (ex. 0.1 + 0.2).
  const epsilon = step / 1e6;
  for (let tick = start; tick <= domainMax + epsilon; tick += step) {
    ticks.push(Number(tick.toFixed(10)));
  }
  return ticks.length > 0 ? ticks : [domainMin];
}

/**
 * Domaine `[min, max]` d'un ensemble de valeurs, toujours élargi pour inclure `0` — la ligne
 * de base d'un graphique en barres doit rester dans le domaine visible, sinon `yScale(0)`
 * extrapole hors du canvas et les barres semblent flotter. `reduce` plutôt que
 * `Math.min(0, ...values)`/`Math.max(0, ...values)` : l'étalement d'un grand tableau en
 * arguments peut dépasser la limite d'arguments d'un appel de fonction sur certains moteurs JS
 * pour de très longues séries.
 */
export function domainIncludingZero(values: readonly number[]): NumericDomain {
  return values.reduce<NumericDomain>(
    ([min, max], value) => [Math.min(min, value), Math.max(max, value)],
    [0, 0],
  );
}

/**
 * Élargit un domaine de quelques pourcents de part et d'autre, pour les séries
 * dont les valeurs sont loin de zéro (courbe d'equity : un axe partant de `0`
 * écrase toute la courbe contre le haut du graphique — bug historique corrigé
 * en M1-6, reproduit ici pour `apps/web`). Domaine dégénéré (`min === max`) :
 * ouvre un intervalle symétrique autour de la valeur (10 %, ou `[-1, 1]` si
 * la valeur est nulle) pour rester traçable.
 */
export function padDomain(domain: NumericDomain, ratio = 0.08): NumericDomain {
  const [domainMin, domainMax] = domain;
  const span = domainMax - domainMin;
  if (span === 0) {
    const fallback = domainMin === 0 ? 1 : Math.abs(domainMin) * 0.1;
    return [domainMin - fallback, domainMax + fallback];
  }
  const padding = span * ratio;
  return [domainMin - padding, domainMax + padding];
}
