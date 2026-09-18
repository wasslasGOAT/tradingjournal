import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { computeRDistribution } from './rDistribution';

describe('computeRDistribution', () => {
  it('0 trade : aucune classe, aucun inconnu', () => {
    const result = computeRDistribution([], d('0.5'));
    expect(result).toEqual({ bins: [], unknownCount: 0 });
  });

  it('exclut les trades sans R multiple connu, les compte dans unknownCount', () => {
    const trades = [buildTrade({ netPnl: d('10'), rMultiple: null })];
    const result = computeRDistribution(trades, d('0.5'));
    expect(result.bins).toEqual([]);
    expect(result.unknownCount).toBe(1);
  });

  it('classe correctement les R négatifs (floor, pas troncature vers 0)', () => {
    // -0.3 avec binSize 0.5 -> classe [-0.5, 0), pas [0, 0.5).
    const trades = [buildTrade({ netPnl: d('-30'), rMultiple: d('-0.3') })];
    const result = computeRDistribution(trades, d('0.5'));
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0]?.rangeStart.toString()).toBe('-0.5');
    expect(result.bins[0]?.rangeEnd.toString()).toBe('0');
    expect(result.bins[0]?.count).toBe(1);
  });

  it('regroupe plusieurs trades dans la même classe et trie les classes', () => {
    const trades = [
      buildTrade({ netPnl: d('100'), rMultiple: d('2.9') }),
      buildTrade({ netPnl: d('50'), rMultiple: d('2.1') }),
      buildTrade({ netPnl: d('-50'), rMultiple: d('-1.5') }),
    ];
    const result = computeRDistribution(trades, d('1'));
    expect(result.bins.map((b) => b.rangeStart.toString())).toEqual(['-2', '2']);
    const positiveBin = result.bins[1];
    expect(positiveBin?.count).toBe(2);
    expect(positiveBin?.netPnl.toString()).toBe('150');
  });

  it('rejette une largeur de classe <= 0', () => {
    expect(() => computeRDistribution([], d('0'))).toThrow();
    expect(() => computeRDistribution([], d('-1'))).toThrow();
  });
});
