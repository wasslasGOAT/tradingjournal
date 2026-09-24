import { describe, expect, it } from 'vitest';

import { buildTrade, d } from './testHelpers';
import { computeProfitFactor } from './profitFactor';

describe('computeProfitFactor', () => {
  it('cas golden : gains bruts 24750.00 / pertes brutes 44493.43 -> 0.56 arrondi', () => {
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
    expect(losses).toHaveLength(21);

    const result = computeProfitFactor([...wins, ...losses]);
    expect(result.reason).toBeNull();
    expect(result.grossWins.toFixed(2)).toBe('24750.00');
    expect(result.grossLosses.toFixed(2)).toBe('44493.43');
    expect(result.value?.toDecimalPlaces(2).toFixed(2)).toBe('0.56');
  });

  it('revue M3 #5 : un trade "open" (même avec commission) est exclu des deux sommes', () => {
    const openTrade = buildTrade({
      netPnl: d('-9999'),
      status: 'open',
      closedAt: null,
      commission: d('5'),
    });
    const result = computeProfitFactor([
      buildTrade({ netPnl: d('100') }),
      buildTrade({ netPnl: d('-50') }),
      openTrade,
    ]);
    expect(result.grossWins.toString()).toBe('100');
    expect(result.grossLosses.toString()).toBe('50');
  });

  it('aucune perte : value null, raison "no_losing_trades" (profit factor infini)', () => {
    const trades = [buildTrade({ netPnl: d('100') }), buildTrade({ netPnl: d('50') })];
    const result = computeProfitFactor(trades);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('no_losing_trades');
    expect(result.grossLosses.toString()).toBe('0');
  });

  it('0 trade : value null, raison "no_trades"', () => {
    const result = computeProfitFactor([]);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('no_trades');
  });

  it('uniquement des trades breakeven : value null, raison "no_trades" (aucun gain ni perte brute)', () => {
    const result = computeProfitFactor([
      buildTrade({ netPnl: d('0') }),
      buildTrade({ netPnl: d('0') }),
    ]);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('no_trades');
  });

  it('aucun gain : value 0, pas de raison (profit factor défini, nul)', () => {
    const result = computeProfitFactor([buildTrade({ netPnl: d('-100') })]);
    expect(result.value?.toString()).toBe('0');
    expect(result.reason).toBeNull();
  });

  it('exclut les trades breakeven des deux sommes', () => {
    const trades = [
      buildTrade({ netPnl: d('100') }),
      buildTrade({ netPnl: d('-50') }),
      buildTrade({ netPnl: d('0') }),
    ];
    const result = computeProfitFactor(trades);
    expect(result.grossWins.toString()).toBe('100');
    expect(result.grossLosses.toString()).toBe('50');
    expect(result.value?.toString()).toBe('2');
  });
});
