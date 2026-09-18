import { describe, expect, it } from 'vitest';

import { buildTrade, d } from './testHelpers';
import { computeWinLossCounts, computeWinRate } from './winRate';

describe('computeWinLossCounts', () => {
  it('0 trade : tous les compteurs à 0', () => {
    expect(computeWinLossCounts([])).toEqual({ wins: 0, losses: 0, breakeven: 0, total: 0 });
  });

  it('cas golden : 4 gagnants / 21 perdants sur 25 trades', () => {
    const wins = Array.from({ length: 4 }, () => buildTrade({ netPnl: d('100') }));
    const losses = Array.from({ length: 21 }, () => buildTrade({ netPnl: d('-50') }));
    const counts = computeWinLossCounts([...wins, ...losses]);
    expect(counts).toEqual({ wins: 4, losses: 21, breakeven: 0, total: 25 });
  });

  it('classe un trade à P&L = 0 en breakeven (ni gagnant ni perdant), compté dans total', () => {
    const trades = [buildTrade({ netPnl: d('0') }), buildTrade({ netPnl: d('10') })];
    expect(computeWinLossCounts(trades)).toEqual({ wins: 1, losses: 0, breakeven: 1, total: 2 });
  });
});

describe('computeWinRate', () => {
  it('cas golden : 4/25 -> 16 %', () => {
    const wins = Array.from({ length: 4 }, () => buildTrade({ netPnl: d('100') }));
    const losses = Array.from({ length: 21 }, () => buildTrade({ netPnl: d('-50') }));
    const rate = computeWinRate([...wins, ...losses]);
    expect(rate?.toFixed(4)).toBe('0.1600');
  });

  it('0 trade : null', () => {
    expect(computeWinRate([])).toBeNull();
  });

  it('uniquement des trades breakeven : null (aucun trade décisif)', () => {
    expect(computeWinRate([buildTrade({ netPnl: d('0') }), buildTrade({ netPnl: d('0') })])).toBeNull();
  });

  it('exclut les trades breakeven du dénominateur', () => {
    // 1 gagnant, 1 perdant, 1 breakeven -> win rate = 1 / 2 = 0.5 (pas 1/3).
    const trades = [
      buildTrade({ netPnl: d('10') }),
      buildTrade({ netPnl: d('-10') }),
      buildTrade({ netPnl: d('0') }),
    ];
    expect(computeWinRate(trades)?.toString()).toBe('0.5');
  });

  it('100 % de gagnants', () => {
    const trades = [buildTrade({ netPnl: d('10') }), buildTrade({ netPnl: d('20') })];
    expect(computeWinRate(trades)?.toString()).toBe('1');
  });
});
