import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { aggregateByTradingDay } from './day';
import { aggregateByWeek, tradingDayWeekday, weekStartOf } from './week';

describe('weekStartOf', () => {
  it('semaine commençant lundi : 2026-03-04 (mercredi) -> 2026-03-02 (lundi)', () => {
    expect(weekStartOf('2026-03-04', 1)).toBe('2026-03-02');
  });

  it('semaine commençant dimanche : 2026-03-04 (mercredi) -> 2026-03-01 (dimanche)', () => {
    expect(weekStartOf('2026-03-04', 0)).toBe('2026-03-01');
  });

  it('un lundi est déjà le début de sa semaine (weekStartsOn = 1)', () => {
    expect(weekStartOf('2026-03-02', 1)).toBe('2026-03-02');
  });

  it('franchit le changement de mois', () => {
    // 2026-04-01 est un mercredi -> semaine (lundi) du 2026-03-30.
    expect(weekStartOf('2026-04-01', 1)).toBe('2026-03-30');
  });
});

describe('tradingDayWeekday', () => {
  it('2026-03-01 est un dimanche (0)', () => {
    expect(tradingDayWeekday('2026-03-01')).toBe(0);
  });

  it('2026-03-30 est un lundi (1)', () => {
    expect(tradingDayWeekday('2026-03-30')).toBe(1);
  });
});

describe('aggregateByWeek', () => {
  it('0 jour : aucune semaine', () => {
    expect(aggregateByWeek([], 1)).toEqual([]);
  });

  it('cumule plusieurs jours de la même semaine (lundi -> dimanche)', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }), // lundi
      buildTrade({ id: 't2', netPnl: d('-40'), tradingDay: '2026-03-05' }), // jeudi, même semaine
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    const weeks = aggregateByWeek(days, 1);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toMatchObject({ weekStart: '2026-03-02', weekEnd: '2026-03-08', tradesCount: 2, activeDays: 2 });
    expect(weeks[0]?.netPnl.toString()).toBe('60');
  });

  it('sépare deux semaines distinctes, triées', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('10'), tradingDay: '2026-03-09' }), // semaine du 9
      buildTrade({ id: 't2', netPnl: d('20'), tradingDay: '2026-03-02' }), // semaine du 2
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    const weeks = aggregateByWeek(days, 1);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-03-02', '2026-03-09']);
  });
});
