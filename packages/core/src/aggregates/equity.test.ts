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
});

describe('equityCurveByDay', () => {
  it('0 jour : un seul point, le solde initial', () => {
    expect(equityCurveByDay(d('1000'), [])).toEqual([{ tradingDay: null, balance: d('1000') }]);
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
  });
});
