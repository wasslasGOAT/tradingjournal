import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { aggregateByTradingDay } from './day';
import { computeMonthStats } from './month';

describe('computeMonthStats', () => {
  it('0 jour : compteurs à 0, bestDay/worstDay null', () => {
    const stats = computeMonthStats([]);
    expect(stats).toMatchObject({ tradesCount: 0, winningDays: 0, losingDays: 0, breakevenDays: 0 });
    expect(stats.bestDay).toBeNull();
    expect(stats.worstDay).toBeNull();
  });

  it('cas golden : mars 2026, 24 trades, -17527.71, 3 jours gagnants / 7 perdants, pire jour 30 mars', () => {
    const dayTotals: Array<[string, string, number]> = [
      ['2026-03-02', '14500.00', 2],
      ['2026-03-05', '-5000.00', 3],
      ['2026-03-09', '-5000.00', 3],
      ['2026-03-12', '5100.00', 1],
      ['2026-03-16', '-5000.00', 3],
      ['2026-03-19', '-5000.00', 3],
      ['2026-03-23', '5150.00', 1],
      ['2026-03-26', '-5000.00', 3],
      ['2026-03-29', '-5000.00', 2],
      ['2026-03-30', '-12277.71', 3],
    ];
    const trades = dayTotals.flatMap(([tradingDay, amount, count]) =>
      Array.from({ length: count }, (_, i) =>
        buildTrade({ id: `${tradingDay}-${i}`, tradingDay, netPnl: d(amount).dividedBy(count) }),
      ),
    );
    const days = aggregateByTradingDay(d('200000'), trades);
    const stats = computeMonthStats(days);

    expect(stats.tradesCount).toBe(24);
    expect(stats.winningDays).toBe(3);
    expect(stats.losingDays).toBe(7);
    expect(stats.breakevenDays).toBe(0);
    expect(stats.netPnl.toFixed(2)).toBe('-17527.71');
    expect(stats.worstDay?.tradingDay).toBe('2026-03-30');
    expect(stats.worstDay?.netPnl.toFixed(2)).toBe('-12277.71');
    expect(stats.bestDay?.tradingDay).toBe('2026-03-02');
  });

  it('identifie le jour breakeven séparément', () => {
    const trades = [
      buildTrade({ tradingDay: '2026-03-02', netPnl: d('0') }),
      buildTrade({ tradingDay: '2026-03-03', netPnl: d('10') }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    const stats = computeMonthStats(days);
    expect(stats.breakevenDays).toBe(1);
    expect(stats.winningDays).toBe(1);
  });
});
