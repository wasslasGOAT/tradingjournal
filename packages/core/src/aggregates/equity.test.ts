import { describe, expect, it } from 'vitest';

import { buildTrade, d } from '../stats/testHelpers';
import { aggregateByTradingDay } from './day';
import { equityCurveByDay, equityCurveByTrade } from './equity';

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
