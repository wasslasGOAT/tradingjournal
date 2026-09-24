import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { aggregateByTradingDay } from './day';

describe('aggregateByTradingDay', () => {
  it('0 trade, aucun mouvement : aucun jour', () => {
    expect(aggregateByTradingDay(d('1000'), [])).toEqual([]);
  });

  it('regroupe plusieurs trades du même jour et cumule le solde de fin', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 't2', netPnl: d('-30'), tradingDay: '2026-03-02' }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      tradingDay: '2026-03-02',
      tradesCount: 2,
      wins: 1,
      losses: 1,
      breakeven: 0,
    });
    expect(days[0]?.netPnl.toString()).toBe('70');
    expect(days[0]?.endBalance.toString()).toBe('1070');
  });

  it('revue M3 #5 : un trade "open" (même avec commission) est exclu du jour et de endBalance', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({
        id: 't2-open',
        netPnl: d('-9999'),
        status: 'open',
        closedAt: null,
        commission: d('5'),
        tradingDay: '2026-03-02',
      }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ tradesCount: 1, wins: 1, losses: 0 });
    expect(days[0]?.netPnl.toString()).toBe('100');
    expect(days[0]?.endBalance.toString()).toBe('1100');
  });

  it('trie les jours et cumule le solde de fin jour après jour', () => {
    const trades = [
      buildTrade({ id: 't2', netPnl: d('-50'), tradingDay: '2026-03-05' }),
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    expect(days.map((day) => day.tradingDay)).toEqual(['2026-03-02', '2026-03-05']);
    expect(days[0]?.endBalance.toString()).toBe('1100');
    expect(days[1]?.endBalance.toString()).toBe('1050');
  });

  it('best/worst trade du jour et volume', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), quantity: d('2'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 't2', netPnl: d('-30'), quantity: d('1.5'), tradingDay: '2026-03-02' }),
    ];
    const [day] = aggregateByTradingDay(d('1000'), trades);
    expect(day?.bestTrade?.toString()).toBe('100');
    expect(day?.worstTrade?.toString()).toBe('-30');
    expect(day?.volume.toString()).toBe('3.5');
  });

  it('somme commission + fees dans `fees`', () => {
    const trades = [buildTrade({ netPnl: d('-77.71'), commission: d('50'), fees: d('20') })];
    const [day] = aggregateByTradingDay(d('1000'), trades);
    expect(day?.fees.toString()).toBe('70');
  });

  it('r_total : somme des R connus, null si aucun trade du jour n’a de R', () => {
    const withR = aggregateByTradingDay(d('1000'), [
      buildTrade({ netPnl: d('100'), rMultiple: d('2') }),
      buildTrade({ netPnl: d('-50'), rMultiple: d('-1') }),
    ]);
    expect(withR[0]?.rTotal?.toString()).toBe('1');

    const withoutR = aggregateByTradingDay(d('1000'), [
      buildTrade({ netPnl: d('100'), rMultiple: null }),
    ]);
    expect(withoutR[0]?.rTotal).toBeNull();
  });

  it('un trade breakeven est compté dans tradesCount et breakeven, ni wins ni losses', () => {
    const [day] = aggregateByTradingDay(d('1000'), [buildTrade({ netPnl: d('0') })]);
    expect(day).toMatchObject({ tradesCount: 1, wins: 0, losses: 0, breakeven: 1 });
  });

  it('inclut les mouvements de trésorerie déjà résolus dans le solde de fin', () => {
    const trades = [buildTrade({ netPnl: d('100'), tradingDay: '2026-03-02' })];
    const days = aggregateByTradingDay(d('1000'), trades, [
      { tradingDay: '2026-03-02', signedAmount: d('500') },
    ]);
    expect(days[0]?.endBalance.toString()).toBe('1600');
  });

  it('un jour avec un mouvement de trésorerie mais aucun trade apparaît quand même', () => {
    const days = aggregateByTradingDay(
      d('1000'),
      [],
      [{ tradingDay: '2026-03-02', signedAmount: d('200') }],
    );
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ tradingDay: '2026-03-02', tradesCount: 0 });
    expect(days[0]?.endBalance.toString()).toBe('1200');
  });
});
