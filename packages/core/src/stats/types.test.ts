import { describe, expect, it } from 'vitest';

import { buildTrade, d } from './testHelpers';
import { compareOrdinal, filterClosedTrades, sortTradesChronologically } from './types';

describe('compareOrdinal (revue M3 #4 — jamais localeCompare)', () => {
  it('trie par ordre de code point, indépendant de la locale', () => {
    expect(compareOrdinal('a', 'b')).toBe(-1);
    expect(compareOrdinal('b', 'a')).toBe(1);
    expect(compareOrdinal('a', 'a')).toBe(0);
  });

  it('utilisable directement comme comparateur Array#sort', () => {
    expect(['banana', 'apple', 'cherry'].sort(compareOrdinal)).toEqual([
      'apple',
      'banana',
      'cherry',
    ]);
  });
});

describe('filterClosedTrades (revue M3 #5)', () => {
  it('ne garde que les trades closed', () => {
    const trades = [
      buildTrade({ id: 'a', status: 'closed', netPnl: d('10') }),
      buildTrade({
        id: 'b',
        status: 'open',
        closedAt: null,
        netPnl: d('-999'),
        commission: d('5'),
      }),
    ];
    expect(filterClosedTrades(trades).map((t) => t.id)).toEqual(['a']);
  });

  it('liste vide -> liste vide', () => {
    expect(filterClosedTrades([])).toEqual([]);
  });
});

describe('sortTradesChronologically', () => {
  it('trie par closedAt, repli openedAt pour un trade sans closedAt', () => {
    const trades = [
      buildTrade({ id: 't2', netPnl: d('1'), closedAt: new Date('2026-03-02T00:00:00Z') }),
      buildTrade({ id: 't1', netPnl: d('1'), closedAt: new Date('2026-03-01T00:00:00Z') }),
    ];
    expect(sortTradesChronologically(trades).map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('départage à horodatage égal par id (ordinal, pas localeCompare)', () => {
    const sameInstant = new Date('2026-03-01T00:00:00Z');
    const trades = [
      buildTrade({ id: 'b', netPnl: d('1'), closedAt: sameInstant }),
      buildTrade({ id: 'a', netPnl: d('1'), closedAt: sameInstant }),
    ];
    expect(sortTradesChronologically(trades).map((t) => t.id)).toEqual(['a', 'b']);
  });
});
