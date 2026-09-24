import { Decimal } from '../money';
import { filterClosedTrades, sortTradesChronologically } from './types';
import type { TradeRecord } from './types';

export interface DrawdownResult {
  /** Perte maximale en montant, depuis le plus haut de l'equity (`>= 0`, `0` si l'equity n'a jamais baissé). */
  readonly maxDrawdownAmount: Decimal;
  /**
   * Perte maximale en fraction du plus haut atteint à cet instant (pas en
   * pourcentage — multiplier par 100 à l'affichage, `packages/core/format`).
   * Peut différer du point de {@link maxDrawdownAmount} si un plus haut plus
   * bas donne un pourcentage plus élevé pour un montant plus faible : les
   * deux maxima sont calculés indépendamment sur toute la série (convention
   * usuelle en analyse de performance).
   */
  readonly maxDrawdownPercent: Decimal;
  /** Plus haut de l'equity au moment du pire drawdown en montant. */
  readonly peakBalance: Decimal;
  /** Solde le plus bas atteint après ce plus haut (creux du pire drawdown en montant). */
  readonly troughBalance: Decimal;
}

/**
 * Drawdown maximal d'un compte : perte maximale entre un plus haut de
 * l'equity et le creux qui le suit, en montant et en pourcentage.
 *
 * **Convention (validé le 2026-09-19)** : le plus haut de
 * référence inclut le **solde initial** — c'est le premier point de la série
 * d'equity (avant tout trade), pas seulement les soldes atteints après des
 * gains. Un compte qui ne fait que perdre depuis le premier trade a donc un
 * drawdown mesuré depuis `startingBalance`, pas depuis `0`.
 *
 * Formule : construit la série d'**equity de trading** (`startingBalance`,
 * puis `+= netPnl` pour chaque trade `closed` dans l'ordre chronologique de
 * `closedAt` — **sans** les mouvements de trésorerie, voir revue M3 #8 :
 * un dépôt ne doit ni combler ni aggraver artificiellement un drawdown), puis
 * pour chaque point calcule `drawdown = peakSoFar - equity` et
 * `drawdownPercent = drawdown / peakSoFar` (`peakSoFar` = maximum de
 * l'equity jusqu'à ce point inclus, jamais inférieur à `startingBalance`).
 * Renvoie le maximum de chaque série. Trades `open` exclus (voir
 * {@link filterClosedTrades}).
 *
 * @param startingBalance solde initial du compte (`accounts.starting_balance`)
 * @param trades trades à inclure (trades `open` ignorés, voir ci-dessus)
 */
export function computeMaxDrawdown(
  startingBalance: Decimal,
  trades: readonly TradeRecord[],
): DrawdownResult {
  const ordered = sortTradesChronologically(filterClosedTrades(trades));

  let equity = startingBalance;
  let peak = startingBalance;
  let maxDrawdownAmount = new Decimal(0);
  let maxDrawdownPercent = new Decimal(0);
  let peakAtMaxAmount = startingBalance;
  let troughAtMaxAmount = startingBalance;

  const consider = (): void => {
    const drawdown = peak.minus(equity);
    if (drawdown.greaterThan(maxDrawdownAmount)) {
      maxDrawdownAmount = drawdown;
      peakAtMaxAmount = peak;
      troughAtMaxAmount = equity;
    }
    if (!peak.isZero()) {
      const drawdownPercent = drawdown.dividedBy(peak);
      if (drawdownPercent.greaterThan(maxDrawdownPercent)) {
        maxDrawdownPercent = drawdownPercent;
      }
    }
  };

  consider();
  for (const trade of ordered) {
    equity = equity.plus(trade.netPnl);
    if (equity.greaterThan(peak)) peak = equity;
    consider();
  }

  return {
    maxDrawdownAmount,
    maxDrawdownPercent,
    peakBalance: peakAtMaxAmount,
    troughBalance: troughAtMaxAmount,
  };
}
