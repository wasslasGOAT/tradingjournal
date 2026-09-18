import { describe, expect, it } from 'vitest';

import { buildTrade, d } from './testHelpers';
import { computeStreaks } from './streaks';

function trade(netPnl: string, closedAt: string): ReturnType<typeof buildTrade> {
  return buildTrade({ netPnl: d(netPnl), closedAt: new Date(closedAt), openedAt: new Date(closedAt) });
}

describe('computeStreaks', () => {
  it('0 trade : aucune série', () => {
    const result = computeStreaks([]);
    expect(result).toEqual({ longestWinStreak: 0, longestLossStreak: 0, current: { type: 'none', count: 0 } });
  });

  it('série gagnante puis perdante, série en cours = la dernière', () => {
    const trades = [
      trade('10', '2026-03-01T00:00:00Z'),
      trade('20', '2026-03-02T00:00:00Z'),
      trade('30', '2026-03-03T00:00:00Z'),
      trade('-5', '2026-03-04T00:00:00Z'),
      trade('-5', '2026-03-05T00:00:00Z'),
    ];
    const result = computeStreaks(trades);
    expect(result.longestWinStreak).toBe(3);
    expect(result.longestLossStreak).toBe(2);
    expect(result.current).toEqual({ type: 'loss', count: 2 });
  });

  it('un trade breakeven casse la série sans en démarrer une nouvelle', () => {
    const trades = [
      trade('10', '2026-03-01T00:00:00Z'),
      trade('10', '2026-03-02T00:00:00Z'),
      trade('0', '2026-03-03T00:00:00Z'),
      trade('10', '2026-03-04T00:00:00Z'),
    ];
    const result = computeStreaks(trades);
    expect(result.longestWinStreak).toBe(2);
    expect(result.current).toEqual({ type: 'win', count: 1 });
  });

  it("série en cours 'none' quand le dernier trade est breakeven", () => {
    const trades = [trade('10', '2026-03-01T00:00:00Z'), trade('0', '2026-03-02T00:00:00Z')];
    const result = computeStreaks(trades).current;
    expect(result).toEqual({ type: 'none', count: 0 });
  });

  it('trie les trades non ordonnés avant de calculer', () => {
    const trades = [trade('-5', '2026-03-02T00:00:00Z'), trade('-5', '2026-03-01T00:00:00Z')];
    const result = computeStreaks(trades);
    expect(result.longestLossStreak).toBe(2);
    expect(result.current).toEqual({ type: 'loss', count: 2 });
  });
});
