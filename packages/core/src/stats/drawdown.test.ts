import { describe, expect, it } from 'vitest';

import { buildTrade, d } from './testHelpers';
import { computeMaxDrawdown } from './drawdown';

function trade(netPnl: string, closedAt: string): ReturnType<typeof buildTrade> {
  return buildTrade({
    netPnl: d(netPnl),
    closedAt: new Date(closedAt),
    openedAt: new Date(closedAt),
  });
}

describe('computeMaxDrawdown', () => {
  it('0 trade : drawdown nul, pic = creux = solde initial', () => {
    const result = computeMaxDrawdown(d('1000'), []);
    expect(result.maxDrawdownAmount.toString()).toBe('0');
    expect(result.maxDrawdownPercent.toString()).toBe('0');
    expect(result.peakBalance.toString()).toBe('1000');
    expect(result.troughBalance.toString()).toBe('1000');
  });

  it('revue M3 #5 : un trade "open" (même avec commission) est ignoré', () => {
    const openTrade = buildTrade({
      netPnl: d('-9999'),
      status: 'open',
      closedAt: null,
      commission: d('5'),
    });
    const result = computeMaxDrawdown(d('1000'), [
      trade('-100', '2026-03-01T00:00:00Z'),
      openTrade,
    ]);
    expect(result.troughBalance.toString()).toBe('900'); // pas 1000-100-9999
  });

  it('le plus haut inclut le solde initial : une série de pertes pures est mesurée depuis lui', () => {
    const trades = [trade('-100', '2026-03-01T00:00:00Z'), trade('-50', '2026-03-02T00:00:00Z')];
    const result = computeMaxDrawdown(d('1000'), trades);
    expect(result.peakBalance.toString()).toBe('1000');
    expect(result.troughBalance.toString()).toBe('850');
    expect(result.maxDrawdownAmount.toString()).toBe('150');
    expect(result.maxDrawdownPercent.toString()).toBe('0.15');
  });

  it('un nouveau plus haut réinitialise le point de référence du drawdown suivant', () => {
    // 1000 -> 1200 (nouveau pic) -> 1080 (creux, -120 depuis 1200, 10%) -> 1300 (nouveau pic).
    const trades = [
      trade('200', '2026-03-01T00:00:00Z'),
      trade('-120', '2026-03-02T00:00:00Z'),
      trade('220', '2026-03-03T00:00:00Z'),
    ];
    const result = computeMaxDrawdown(d('1000'), trades);
    expect(result.peakBalance.toString()).toBe('1200');
    expect(result.troughBalance.toString()).toBe('1080');
    expect(result.maxDrawdownAmount.toString()).toBe('120');
    expect(result.maxDrawdownPercent.toString()).toBe('0.1');
  });

  it('cas particulier (P&L net golden en un seul trade) : le drawdown coïncide avec la perte totale depuis le solde initial', () => {
    // Un seul trade qui réalise tout le P&L net golden (pas le fixture à 25
    // trades — voir `test/golden/golden.test.ts` pour la marge restante
    // réelle "256,57 $" calculée depuis le solde initial, pas depuis le
    // drawdown : sur le fixture à 25 trades, des jours gagnants remontent le
    // pic de l'equity en cours de route, donc le pire drawdown y est plus
    // grand que la seule perte nette totale — la règle « perte max statique »
    // (ROADMAP M8) se mesure depuis le solde initial, pas depuis le pic).
    const result = computeMaxDrawdown(d('200000'), [trade('-19743.43', '2026-04-01T10:30:00Z')]);
    const maxLossAllowed = d('200000').times('0.10');
    const remainingMargin = maxLossAllowed.minus(result.maxDrawdownAmount);
    expect(remainingMargin.toFixed(2)).toBe('256.57');
  });

  it('trie les trades non ordonnés chronologiquement avant de calculer', () => {
    const outOfOrder = [
      trade('-50', '2026-03-02T00:00:00Z'),
      trade('-100', '2026-03-01T00:00:00Z'),
    ];
    const result = computeMaxDrawdown(d('1000'), outOfOrder);
    expect(result.troughBalance.toString()).toBe('850');
    expect(result.maxDrawdownAmount.toString()).toBe('150');
  });

  it('equity qui remonte au-dessus du solde initial sans jamais baisser : drawdown nul', () => {
    const trades = [trade('100', '2026-03-01T00:00:00Z'), trade('50', '2026-03-02T00:00:00Z')];
    const result = computeMaxDrawdown(d('1000'), trades);
    expect(result.maxDrawdownAmount.toString()).toBe('0');
  });
});
