import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import {
  aggregateByHourOfDay,
  aggregateBySession,
  aggregateBySetup,
  aggregateBySymbol,
  aggregateByTag,
  aggregateByWeekday,
  UNSET_SETUP_KEY,
} from './dimensions';

describe('aggregateBySymbol', () => {
  it('0 trade : aucun groupe', () => {
    expect(aggregateBySymbol([])).toEqual([]);
  });

  it('regroupe et trie par symbole (ordre alphabétique)', () => {
    const trades = [
      buildTrade({ symbol: 'XAUUSD', netPnl: d('10') }),
      buildTrade({ symbol: 'EURUSD', netPnl: d('-5') }),
      buildTrade({ symbol: 'EURUSD', netPnl: d('20') }),
    ];
    const result = aggregateBySymbol(trades);
    expect(result.map((r) => r.key)).toEqual(['EURUSD', 'XAUUSD']);
    expect(result[0]).toMatchObject({ tradesCount: 2, wins: 1, losses: 1 });
    expect(result[0]?.netPnl.toString()).toBe('15');
  });
});

describe('aggregateBySetup', () => {
  it('place les trades sans setup sous la clé null, en dernier', () => {
    const trades = [
      buildTrade({ setup: 'breakout', netPnl: d('10') }),
      buildTrade({ setup: undefined, netPnl: d('5') }),
      buildTrade({ setup: 'pullback', netPnl: d('-3') }),
    ];
    const result = aggregateBySetup(trades);
    expect(result.map((r) => r.key)).toEqual(['breakout', 'pullback', UNSET_SETUP_KEY]);
  });
});

describe('aggregateByTag', () => {
  it('un trade avec plusieurs tags alimente chaque groupe', () => {
    const trades = [
      buildTrade({ tags: ['discipline', 'plan-respecte'], netPnl: d('10') }),
      buildTrade({ tags: ['discipline'], netPnl: d('-5') }),
      buildTrade({ tags: undefined, netPnl: d('100') }),
    ];
    const result = aggregateByTag(trades);
    expect(result.map((r) => r.key)).toEqual(['discipline', 'plan-respecte']);
    expect(result[0]?.tradesCount).toBe(2);
    expect(result[1]?.tradesCount).toBe(1);
  });
});

describe('aggregateBySession', () => {
  it('trie selon un ordre fixe (asia, london, new_york, overlap, other)', () => {
    const trades = [
      buildTrade({ session: 'other', netPnl: d('1') }),
      buildTrade({ session: 'asia', netPnl: d('1') }),
      buildTrade({ session: 'overlap', netPnl: d('1') }),
    ];
    const result = aggregateBySession(trades);
    expect(result.map((r) => r.key)).toEqual(['asia', 'overlap', 'other']);
  });
});

describe('aggregateByWeekday', () => {
  it('regroupe par jour de semaine du tradingDay, trié 0..6', () => {
    const trades = [
      buildTrade({ tradingDay: '2026-03-30', netPnl: d('1') }), // lundi (1)
      buildTrade({ tradingDay: '2026-03-01', netPnl: d('1') }), // dimanche (0)
    ];
    const result = aggregateByWeekday(trades);
    expect(result.map((r) => r.key)).toEqual([0, 1]);
  });
});

describe('aggregateByHourOfDay', () => {
  it('résout l’heure locale dans le fuseau donné', () => {
    const trades = [
      buildTrade({ openedAt: new Date('2026-03-02T08:15:00Z'), netPnl: d('1') }), // 09:15 Europe/Paris (hiver->été proche, encore CET)
      buildTrade({ openedAt: new Date('2026-03-02T14:45:00Z'), netPnl: d('1') }), // 15:45 Europe/Paris
    ];
    const result = aggregateByHourOfDay(trades, 'Europe/Paris');
    expect(result.map((r) => r.key)).toEqual([9, 15]);
  });

  it('trie les heures numériquement (pas lexicographiquement)', () => {
    const trades = [
      buildTrade({ openedAt: new Date('2026-03-02T20:00:00Z'), netPnl: d('1') }), // heure UTC élevée
      buildTrade({ openedAt: new Date('2026-03-02T02:00:00Z'), netPnl: d('1') }),
    ];
    const result = aggregateByHourOfDay(trades, 'UTC');
    expect(result.map((r) => r.key)).toEqual([2, 20]);
  });
});
