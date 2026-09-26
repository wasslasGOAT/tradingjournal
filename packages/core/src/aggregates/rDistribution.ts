import type { Decimal } from '../money';
import { filterClosedTrades } from '../stats';
import type { TradeRecord } from '../stats';

/** Classe (bin) de l'histogramme de distribution des R multiples, voir {@link computeRDistribution}. */
export interface RBin {
  /** Borne basse de la classe (incluse). */
  readonly rangeStart: Decimal;
  /** Borne haute de la classe (exclue) — toujours `rangeStart + binSize`. */
  readonly rangeEnd: Decimal;
  readonly count: number;
  /** Somme des `netPnl` des trades de cette classe (utile pour un histogramme coloré par $ plutôt que par nombre de trades). */
  readonly netPnl: Decimal;
}

export interface RDistributionResult {
  /** Classes non vides, triées par `rangeStart` croissant. */
  readonly bins: readonly RBin[];
  /** Nombre de trades sans R multiple connu (`rMultiple === null`), exclus de `bins`. */
  readonly unknownCount: number;
}

/**
 * Distribution des R multiples en histogramme à classes de largeur
 * `binSize` paramétrable (ARCHITECTURE §5.4/§0 : « distribution des R »).
 *
 * Formule : pour chaque trade avec `rMultiple` connu, la classe est
 * `floor(rMultiple / binSize) * binSize` (borne basse incluse, `+ binSize`
 * borne haute exclue) — `floor` (pas de troncature vers 0) pour que les R
 * négatifs tombent dans la classe qui les contient réellement (ex. `-0.3`
 * avec `binSize = 0.5` -> classe `[-0.5, 0)`, pas `[0, 0.5)`). Seules les
 * classes non vides sont renvoyées (pas de classe à 0 insérée entre deux
 * classes présentes) : à la charge de l'appelant/UI de compléter les trous
 * s'il veut un histogramme à axe continu.
 *
 * @param trades trades à répartir
 * @param binSize largeur de classe, doit être strictement positive
 * @throws {Error} si `binSize <= 0`
 */
export function computeRDistribution(
  trades: readonly TradeRecord[],
  binSize: Decimal,
): RDistributionResult {
  if (!binSize.greaterThan(0)) {
    throw new Error(`binSize doit être strictement positif (reçu ${binSize.toString()}).`);
  }

  const bins = new Map<string, { rangeStart: Decimal; count: number; netPnl: Decimal }>();
  let unknownCount = 0;

  for (const trade of filterClosedTrades(trades)) {
    if (trade.rMultiple === null) {
      unknownCount += 1;
      continue;
    }
    const index = trade.rMultiple.dividedBy(binSize).floor();
    const rangeStart = index.times(binSize);
    const key = rangeStart.toString();
    const existing = bins.get(key);
    if (existing) {
      existing.count += 1;
      existing.netPnl = existing.netPnl.plus(trade.netPnl);
    } else {
      bins.set(key, { rangeStart, count: 1, netPnl: trade.netPnl });
    }
  }

  const sortedBins = [...bins.values()]
    .sort((a, b) => a.rangeStart.comparedTo(b.rangeStart))
    .map((bin) => ({ ...bin, rangeEnd: bin.rangeStart.plus(binSize) }));

  return { bins: sortedBins, unknownCount };
}
