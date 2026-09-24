import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { aggregateByTradingDay } from './day';
import { computeMonthStats } from './month';

describe('computeMonthStats', () => {
  it('0 jour : compteurs à 0, bestDay/worstDay null', () => {
    const stats = computeMonthStats([]);
    expect(stats).toMatchObject({
      tradesCount: 0,
      winningDays: 0,
      losingDays: 0,
      breakevenDays: 0,
    });
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

  it("revue M3 #6 : un jour cash-only (tradesCount 0, netPnl 0) n'est ni breakeven, ni meilleur/pire jour", () => {
    const trades = [
      buildTrade({ id: 't1', tradingDay: '2026-03-02', netPnl: d('-50') }),
      buildTrade({ id: 't2', tradingDay: '2026-03-03', netPnl: d('10') }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades, [
      { tradingDay: '2026-03-01', signedAmount: d('500') }, // dépôt seul, aucun trade ce jour-là
    ]);
    const cashOnlyDay = days.find((day) => day.tradingDay === '2026-03-01');
    expect(cashOnlyDay).toMatchObject({ tradesCount: 0 });
    expect(cashOnlyDay?.netPnl.isZero()).toBe(true);

    const stats = computeMonthStats(days);
    // Sans le filtre `tradesCount === 0`, le jour cash-only (netPnl 0) serait moins bon que
    // -50 ? Non : ici on vérifie surtout qu'il ne devient PAS le "meilleur jour" à tort face
    // à un vrai jour perdant, et qu'il n'est comptabilisé nulle part (ni breakeven, ni perdant).
    expect(stats.breakevenDays).toBe(0);
    expect(stats.losingDays).toBe(1); // seul 2026-03-02 (-50)
    expect(stats.winningDays).toBe(1); // seul 2026-03-03 (+10)
    expect(stats.bestDay?.tradingDay).toBe('2026-03-03');
    expect(stats.worstDay?.tradingDay).toBe('2026-03-02');
    expect(stats.worstDay?.netPnl.toString()).toBe('-50'); // pas le jour cash-only à 0
  });
});
