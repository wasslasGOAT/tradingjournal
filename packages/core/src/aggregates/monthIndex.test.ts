import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { toTradingDay } from '../time';
import { aggregateByTradingDay } from './day';
import { buildMonthDayIndex, groupTradesByTradingDay } from './monthIndex';

describe('groupTradesByTradingDay', () => {
  it('0 trade : Map vide', () => {
    expect(groupTradesByTradingDay([]).size).toBe(0);
  });

  it('regroupe plusieurs trades du même jour, préserve leur ordre', () => {
    const t1 = buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' });
    const t2 = buildTrade({ id: 't2', netPnl: d('-30'), tradingDay: '2026-03-02' });
    const t3 = buildTrade({ id: 't3', netPnl: d('10'), tradingDay: '2026-03-05' });
    const grouped = groupTradesByTradingDay([t1, t2, t3]);
    expect([...grouped.keys()]).toEqual(['2026-03-02', '2026-03-05']);
    expect(grouped.get(toTradingDay('2026-03-02'))).toEqual([t1, t2]);
    expect(grouped.get(toTradingDay('2026-03-05'))).toEqual([t3]);
  });

  it("inclut les trades `open` (pas de filtre par statut, contrairement à l'agrégation)", () => {
    const open = buildTrade({
      id: 't-open',
      netPnl: d('0'),
      status: 'open',
      closedAt: null,
      tradingDay: '2026-03-02',
    });
    expect(groupTradesByTradingDay([open]).get(toTradingDay('2026-03-02'))).toEqual([open]);
  });
});

describe('buildMonthDayIndex', () => {
  it('0 jour, 0 journal : index vide', () => {
    expect(buildMonthDayIndex([], [])).toEqual([]);
  });

  it('un jour tradé sans journal : `netPnl` renseigné, `hasJournalEntry` false', () => {
    const days = aggregateByTradingDay(d('0'), [
      buildTrade({ netPnl: d('100'), tradingDay: '2026-03-02' }),
    ]);
    const index = buildMonthDayIndex(days, []);
    expect(index).toEqual([{ tradingDay: '2026-03-02', netPnl: d('100'), hasJournalEntry: false }]);
  });

  it('un jour de journal sans trade : `netPnl` null, `hasJournalEntry` true', () => {
    const index = buildMonthDayIndex([], [toTradingDay('2026-03-04')]);
    expect(index).toEqual([{ tradingDay: '2026-03-04', netPnl: null, hasJournalEntry: true }]);
  });

  it('un jour à la fois tradé et journalisé : fusionne les deux (pas de doublon)', () => {
    const days = aggregateByTradingDay(d('0'), [
      buildTrade({ netPnl: d('50'), tradingDay: '2026-03-02' }),
    ]);
    const index = buildMonthDayIndex(days, [toTradingDay('2026-03-02')]);
    expect(index).toEqual([{ tradingDay: '2026-03-02', netPnl: d('50'), hasJournalEntry: true }]);
  });

  it('union triée chronologiquement, jours tradés et journalisés mélangés', () => {
    const days = aggregateByTradingDay(d('0'), [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-05' }),
      buildTrade({ id: 't2', netPnl: d('-40'), tradingDay: '2026-03-01' }),
    ]);
    const index = buildMonthDayIndex(days, [toTradingDay('2026-03-03')]);
    expect(index.map((e) => e.tradingDay)).toEqual(['2026-03-01', '2026-03-03', '2026-03-05']);
    expect(index.map((e) => e.netPnl?.toString() ?? null)).toEqual(['-40', null, '100']);
    expect(index.map((e) => e.hasJournalEntry)).toEqual([false, true, false]);
  });

  it('un jour cash-only (aucun trade, mouvement de trésorerie) a `netPnl` null, pas 0 trompeur', () => {
    const days = aggregateByTradingDay(
      d('1000'),
      [],
      [{ tradingDay: '2026-03-02', signedAmount: d('200') }],
    );
    const index = buildMonthDayIndex(days, []);
    expect(index).toEqual([{ tradingDay: '2026-03-02', netPnl: null, hasJournalEntry: false }]);
  });

  it("agrégation multi-comptes : `days` déjà calculé sur l'union des trades de tous les comptes (pas de re-somme ici)", () => {
    const days = aggregateByTradingDay(d('0'), [
      buildTrade({ id: 'acc-a-1', accountId: 'acc-a', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 'acc-b-1', accountId: 'acc-b', netPnl: d('-30'), tradingDay: '2026-03-02' }),
    ]);
    const index = buildMonthDayIndex(days, []);
    expect(index[0]?.netPnl?.toString()).toBe('70');
  });
});
