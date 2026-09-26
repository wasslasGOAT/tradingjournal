import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { toTradingDay } from '../time';
import { aggregateByTradingDay } from './day';
import { balanceAtDay, equityCurveByDay, equityCurveByTrade } from './equity';

describe('equityCurveByTrade', () => {
  it('0 trade : un seul point, le solde initial', () => {
    const curve = equityCurveByTrade(d('1000'), []);
    expect(curve).toEqual([{ tradeId: null, at: null, balance: d('1000') }]);
  });

  it('un point par trade, cumulatif, trié chronologiquement', () => {
    const trades = [
      buildTrade({ id: 't2', netPnl: d('-30'), closedAt: new Date('2026-03-02T00:00:00Z') }),
      buildTrade({ id: 't1', netPnl: d('100'), closedAt: new Date('2026-03-01T00:00:00Z') }),
    ];
    const curve = equityCurveByTrade(d('1000'), trades);
    expect(curve.map((p) => p.tradeId)).toEqual([null, 't1', 't2']);
    expect(curve.map((p) => p.balance.toString())).toEqual(['1000', '1100', '1070']);
  });

  it('revue M3 #5 : un trade "open" (même avec commission) est ignoré', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), closedAt: new Date('2026-03-01T00:00:00Z') }),
      buildTrade({
        id: 't2-open',
        netPnl: d('-30'),
        status: 'open',
        closedAt: null,
        commission: d('5'),
      }),
    ];
    const curve = equityCurveByTrade(d('1000'), trades);
    expect(curve.map((p) => p.tradeId)).toEqual([null, 't1']);
    expect(curve[curve.length - 1]?.balance.toString()).toBe('1100');
  });
});

describe('equityCurveByDay', () => {
  it('0 jour : un seul point, le solde initial (tradingEquity === balance)', () => {
    expect(equityCurveByDay(d('1000'), [])).toEqual([
      { tradingDay: null, tradingEquity: d('1000'), balance: d('1000') },
    ]);
  });

  it('un point par jour (solde de fin déjà cumulatif), précédé du solde initial', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 't2', netPnl: d('-30'), tradingDay: '2026-03-03' }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    const curve = equityCurveByDay(d('1000'), days);
    expect(curve.map((p) => p.tradingDay)).toEqual([null, '2026-03-02', '2026-03-03']);
    expect(curve.map((p) => p.balance.toString())).toEqual(['1000', '1100', '1070']);
    expect(curve.map((p) => p.tradingEquity.toString())).toEqual(['1000', '1100', '1070']);
  });

  it('revue M3 #8 : un dépôt gonfle balance mais pas tradingEquity (courbes divergentes)', () => {
    const trades = [buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' })];
    const days = aggregateByTradingDay(d('1000'), trades, [
      { tradingDay: '2026-03-02', signedAmount: d('5000') }, // dépôt le même jour que le trade
    ]);
    const curve = equityCurveByDay(d('1000'), days);
    const point = curve[1];
    expect(point?.tradingEquity.toString()).toBe('1100'); // 1000 + 100, sans le dépôt
    expect(point?.balance.toString()).toBe('6100'); // 1000 + 100 + 5000, solde réel
  });
});

describe('balanceAtDay', () => {
  it('0 jour : renvoie le solde initial pour n’importe quelle date', () => {
    expect(balanceAtDay(d('1000'), [], toTradingDay('2026-03-02'))).toEqual(d('1000'));
  });

  it('renvoie le solde initial pour une date antérieure au premier jour', () => {
    const trades = [buildTrade({ netPnl: d('100'), tradingDay: '2026-03-05' })];
    const days = aggregateByTradingDay(d('1000'), trades);
    expect(balanceAtDay(d('1000'), days, toTradingDay('2026-03-01'))).toEqual(d('1000'));
  });

  it('renvoie le solde du dernier jour connu à la date exacte', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 't2', netPnl: d('-30'), tradingDay: '2026-03-05' }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    expect(balanceAtDay(d('1000'), days, toTradingDay('2026-03-02'))).toEqual(d('1100'));
    expect(balanceAtDay(d('1000'), days, toTradingDay('2026-03-05'))).toEqual(d('1070'));
  });

  it('reporte (« or before ») le solde à travers un jour sans trade', () => {
    const trades = [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 't2', netPnl: d('-30'), tradingDay: '2026-03-05' }),
    ];
    const days = aggregateByTradingDay(d('1000'), trades);
    // 2026-03-03 et 2026-03-04 n'ont aucun trade : le solde reste celui du 03-02.
    expect(balanceAtDay(d('1000'), days, toTradingDay('2026-03-03'))).toEqual(d('1100'));
    expect(balanceAtDay(d('1000'), days, toTradingDay('2026-03-04'))).toEqual(d('1100'));
  });

  it('renvoie le solde le plus récent pour une date postérieure au dernier jour', () => {
    const trades = [buildTrade({ netPnl: d('100'), tradingDay: '2026-03-02' })];
    const days = aggregateByTradingDay(d('1000'), trades);
    expect(balanceAtDay(d('1000'), days, toTradingDay('2026-12-31'))).toEqual(d('1100'));
  });
});
