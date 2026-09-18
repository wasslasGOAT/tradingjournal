import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { computeHeatmap } from './heatmap';

describe('computeHeatmap', () => {
  it('0 trade : aucune cellule', () => {
    expect(computeHeatmap([], 'UTC')).toEqual([]);
  });

  it('regroupe par (jour de semaine, heure locale) et trie', () => {
    const trades = [
      // lundi 2026-03-30 (après le passage à l'heure d'été, CEST = UTC+2), 10:15 Europe/Paris (08:15 UTC)
      buildTrade({ tradingDay: '2026-03-30', openedAt: new Date('2026-03-30T08:15:00Z'), netPnl: d('10') }),
      buildTrade({ tradingDay: '2026-03-30', openedAt: new Date('2026-03-30T08:45:00Z'), netPnl: d('-4') }),
      // dimanche 2026-03-01 (hiver, CET = UTC+1), 10:00 Europe/Paris (09:00 UTC)
      buildTrade({ tradingDay: '2026-03-01', openedAt: new Date('2026-03-01T09:00:00Z'), netPnl: d('5') }),
    ];
    const result = computeHeatmap(trades, 'Europe/Paris');
    expect(result).toEqual([
      expect.objectContaining({ weekday: 0, hour: 10, tradesCount: 1 }),
      expect.objectContaining({ weekday: 1, hour: 10, tradesCount: 2, wins: 1, losses: 1 }),
    ]);
    const mondayCell = result.find((c) => c.weekday === 1);
    expect(mondayCell?.netPnl.toString()).toBe('6');
  });
});
