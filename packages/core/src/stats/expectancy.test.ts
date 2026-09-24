import { describe, expect, it } from 'vitest';

import { buildTrade, d } from './testHelpers';
import { computeAverageRatio, computeAverageWinLoss, computeExpectancy } from './expectancy';

describe('computeExpectancy', () => {
  it('0 trade : null', () => {
    expect(computeExpectancy([])).toBeNull();
  });

  it('inclut les trades breakeven dans la moyenne (contrairement au win rate)', () => {
    const trades = [
      buildTrade({ netPnl: d('30') }),
      buildTrade({ netPnl: d('0') }),
      buildTrade({ netPnl: d('-15') }),
    ];
    // (30 + 0 - 15) / 3 = 5
    expect(computeExpectancy(trades)?.toString()).toBe('5');
  });

  it('cas golden : -19743.43 / 25 trades', () => {
    const trades = Array.from({ length: 25 }, () => buildTrade({ netPnl: d('0') }));
    const withTotal = [...trades.slice(1), buildTrade({ netPnl: d('-19743.43') })];
    expect(computeExpectancy(withTotal)?.toFixed(4)).toBe('-789.7372');
  });

  it('revue M3 #5 : un trade "open" (même avec commission) est exclu de la moyenne', () => {
    const openTrade = buildTrade({
      netPnl: d('-9999'),
      status: 'open',
      closedAt: null,
      commission: d('5'),
    });
    const trades = [buildTrade({ netPnl: d('10') }), buildTrade({ netPnl: d('20') }), openTrade];
    expect(computeExpectancy(trades)?.toString()).toBe('15'); // (10+20)/2, pas /3
  });
});

describe('computeAverageWinLoss', () => {
  it('aucun trade : les deux moyennes sont null', () => {
    expect(computeAverageWinLoss([])).toEqual({ averageWin: null, averageLoss: null });
  });

  it('aucun gagnant : averageWin null, averageLoss défini', () => {
    const result = computeAverageWinLoss([
      buildTrade({ netPnl: d('-10') }),
      buildTrade({ netPnl: d('-30') }),
    ]);
    expect(result.averageWin).toBeNull();
    expect(result.averageLoss?.toString()).toBe('-20');
  });

  it('aucun perdant : averageLoss null, averageWin défini', () => {
    const result = computeAverageWinLoss([
      buildTrade({ netPnl: d('10') }),
      buildTrade({ netPnl: d('30') }),
    ]);
    expect(result.averageLoss).toBeNull();
    expect(result.averageWin?.toString()).toBe('20');
  });

  it('cas golden : gain moyen 6187.50, perte moyenne -2118.73...', () => {
    const wins = [d('8200.00'), d('6300.00'), d('5100.00'), d('5150.00')].map((amount) =>
      buildTrade({ netPnl: amount }),
    );
    const losses = Array.from({ length: 21 }, () =>
      buildTrade({ netPnl: d('-2118.734761904761905') }),
    );
    const result = computeAverageWinLoss([...wins, ...losses]);
    expect(result.averageWin?.toFixed(2)).toBe('6187.50');
  });
});

describe('computeAverageRatio', () => {
  it('cas golden : ratio moyen 2.92 arrondi (PF 0.56 * 21/4)', () => {
    const wins = [d('8200.00'), d('6300.00'), d('5100.00'), d('5150.00')].map((amount) =>
      buildTrade({ netPnl: amount }),
    );
    const losses = [
      '2000.00',
      '1500.00',
      '1500.00',
      '1800.00',
      '1700.00',
      '1500.00',
      '2200.00',
      '1600.00',
      '1200.00',
      '2500.00',
      '1500.00',
      '1000.00',
      '1900.00',
      '1600.00',
      '1500.00',
      '3000.00',
      '2000.00',
      '6000.00',
      '4000.00',
      '2277.71',
      '2215.72',
    ].map((amount) => buildTrade({ netPnl: d(`-${amount}`) }));

    const ratio = computeAverageRatio([...wins, ...losses]);
    expect(ratio?.toDecimalPlaces(2).toFixed(2)).toBe('2.92');
  });

  it('null si aucun gagnant', () => {
    expect(computeAverageRatio([buildTrade({ netPnl: d('-10') })])).toBeNull();
  });

  it('null si aucun perdant', () => {
    expect(computeAverageRatio([buildTrade({ netPnl: d('10') })])).toBeNull();
  });

  it('null sur une collection vide', () => {
    expect(computeAverageRatio([])).toBeNull();
  });
});
