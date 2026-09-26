import { describe, expect, it } from 'vitest';

import { Decimal } from '../money';
import { buildTrade, d } from '../stats/testHelpers';
import { toTradingDay } from '../time';
import { aggregateByTradingDay } from './day';
import {
  aggregateAccountsByCurrency,
  assertSingleCurrency,
  computeLastDayPnl,
  equityCurveByDayMultiAccount,
  MixedCurrencyAggregationError,
  summarizeAccountsOverPeriod,
} from './multiAccount';
import type { AccountDaySeries, AccountMoneyValues } from './multiAccount';

function account(
  accountId: string,
  currency: string,
  balance: string,
  netPnl: string,
): AccountMoneyValues {
  return { accountId, currency, balance: new Decimal(balance), netPnl: new Decimal(netPnl) };
}

describe('aggregateAccountsByCurrency', () => {
  it('0 compte : aucun total', () => {
    expect(aggregateAccountsByCurrency([])).toEqual([]);
  });

  it('ADR-019 option A : un total par devise, sans conversion, trié par devise', () => {
    const accounts = [
      account('acc-eur', 'EUR', '5000', '-200'),
      account('acc-usd-1', 'USD', '180256.57', '-19743.43'),
      account('acc-usd-2', 'USD', '1000', '50'),
    ];
    const totals = aggregateAccountsByCurrency(accounts);
    expect(totals.map((t) => t.currency)).toEqual(['EUR', 'USD']);
    const usd = totals.find((t) => t.currency === 'USD');
    expect(usd?.balance.toFixed(2)).toBe('181256.57');
    expect(usd?.netPnl.toFixed(2)).toBe('-19693.43');
    expect(usd?.accountIds).toEqual(['acc-usd-1', 'acc-usd-2']);
  });

  it('avec convert + targetCurrency : un seul total, dans la devise cible', () => {
    const accounts = [
      account('acc-eur', 'EUR', '1000', '100'),
      account('acc-usd', 'USD', '1080', '100'),
    ];
    const totals = aggregateAccountsByCurrency(accounts, {
      targetCurrency: 'USD',
      convert: (amount, from, to) => {
        if (from === to) return amount;
        if (from === 'EUR' && to === 'USD') return amount.times('1.08');
        throw new Error(`conversion non gérée : ${from} -> ${to}`);
      },
    });
    expect(totals).toHaveLength(1);
    expect(totals[0]?.currency).toBe('USD');
    expect(totals[0]?.balance.toFixed(2)).toBe('2160.00');
    expect(totals[0]?.accountIds).toEqual(['acc-eur', 'acc-usd']);
  });

  it('ignore `convert` si `targetCurrency` est absent (reste en mode option A)', () => {
    const accounts = [account('acc-eur', 'EUR', '1000', '0')];
    const totals = aggregateAccountsByCurrency(accounts, { convert: (amount) => amount.times(2) });
    expect(totals).toEqual([
      {
        currency: 'EUR',
        balance: new Decimal('1000'),
        netPnl: new Decimal('0'),
        accountIds: ['acc-eur'],
      },
    ]);
  });
});

function accountSeries(
  overrides: Partial<AccountDaySeries> & { accountId: string },
): AccountDaySeries {
  return {
    currency: 'USD',
    startingBalance: d('1000'),
    days: [],
    ...overrides,
  };
}

describe('equityCurveByDayMultiAccount', () => {
  it('0 compte : un point à 0 par jour de la période', () => {
    const curve = equityCurveByDayMultiAccount(
      [],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-02'),
    );
    expect(curve).toEqual([
      { tradingDay: '2026-03-01', balance: d('0') },
      { tradingDay: '2026-03-02', balance: d('0') },
    ]);
  });

  it('un compte : reprend le solde jour par jour, y compris les jours sans trade', () => {
    const trades = [buildTrade({ netPnl: d('100'), tradingDay: '2026-03-02' })];
    const days = aggregateByTradingDay(d('1000'), trades);
    const curve = equityCurveByDayMultiAccount(
      [accountSeries({ accountId: 'acc-1', startingBalance: d('1000'), days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-03'),
    );
    expect(curve.map((p) => p.balance.toString())).toEqual(['1000', '1100', '1100']);
  });

  it('plusieurs comptes de même devise : additionne les soldes de chaque compte à chaque jour', () => {
    const daysA = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 'a1', netPnl: d('100'), tradingDay: '2026-03-02' }),
    ]);
    const daysB = aggregateByTradingDay(d('500'), [
      buildTrade({ id: 'b1', netPnl: d('-20'), tradingDay: '2026-03-01' }),
    ]);
    const curve = equityCurveByDayMultiAccount(
      [
        accountSeries({ accountId: 'acc-a', startingBalance: d('1000'), days: daysA }),
        accountSeries({ accountId: 'acc-b', startingBalance: d('500'), days: daysB }),
      ],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-02'),
    );
    // 03-01 : acc-a solde initial 1000 (pas encore tradé) + acc-b 480 (500 - 20) = 1480
    // 03-02 : acc-a 1100 (1000 + 100) + acc-b 480 (inchangé) = 1580
    expect(curve.map((p) => p.balance.toString())).toEqual(['1480', '1580']);
  });

  it('lève `MixedCurrencyAggregationError` si les comptes ont des devises différentes (ADR-019)', () => {
    expect(() =>
      equityCurveByDayMultiAccount(
        [
          accountSeries({ accountId: 'acc-usd', currency: 'USD' }),
          accountSeries({ accountId: 'acc-eur', currency: 'EUR' }),
        ],
        toTradingDay('2026-03-01'),
        toTradingDay('2026-03-01'),
      ),
    ).toThrow(MixedCurrencyAggregationError);
  });
});

describe('computeLastDayPnl', () => {
  it('0 compte : aucun jour, P&L nul', () => {
    expect(computeLastDayPnl([], toTradingDay('2026-03-01'), toTradingDay('2026-03-31'))).toEqual({
      tradingDay: null,
      netPnl: d('0'),
    });
  });

  it('aucun trade dans la période : aucun jour, P&L nul', () => {
    const days = aggregateByTradingDay(d('1000'), [
      buildTrade({ netPnl: d('100'), tradingDay: '2026-04-01' }),
    ]);
    const result = computeLastDayPnl(
      [accountSeries({ accountId: 'acc-1', days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(result).toEqual({ tradingDay: null, netPnl: d('0') });
  });

  it('un seul compte : le dernier jour tradé de la période', () => {
    const days = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-02' }),
      buildTrade({ id: 't2', netPnl: d('-40'), tradingDay: '2026-03-10' }),
    ]);
    const result = computeLastDayPnl(
      [accountSeries({ accountId: 'acc-1', days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(result.tradingDay).toBe('2026-03-10');
    expect(result.netPnl.toString()).toBe('-40');
  });

  it('bug corrigé (revue W-10) : en multi-comptes, sélectionne le même jour pour tous, pas le dernier jour de chaque compte', () => {
    // acc-a a tradé le 03-10 (plus récent), acc-b seulement le 03-05.
    const daysA = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 'a1', netPnl: d('100'), tradingDay: '2026-03-10' }),
    ]);
    const daysB = aggregateByTradingDay(d('500'), [
      buildTrade({ id: 'b1', netPnl: d('30'), tradingDay: '2026-03-05' }),
    ]);
    const result = computeLastDayPnl(
      [
        accountSeries({ accountId: 'acc-a', days: daysA }),
        accountSeries({ accountId: 'acc-b', days: daysB }),
      ],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    // Le jour retenu est 03-10 (le plus récent tous comptes confondus) ; acc-b
    // n'a pas tradé ce jour-là, donc contribue 0 (pas son P&L du 03-05, qui
    // correspondrait à un jour différent et ne serait pas un chiffre réel).
    expect(result.tradingDay).toBe('2026-03-10');
    expect(result.netPnl.toString()).toBe('100');
  });

  it('ignore un jour cash-only (aucun trade, mouvement de trésorerie seul) même le plus récent', () => {
    const days = aggregateByTradingDay(
      d('1000'),
      [buildTrade({ netPnl: d('100'), tradingDay: '2026-03-05' })],
      [{ tradingDay: '2026-03-20', signedAmount: d('500') }],
    );
    const result = computeLastDayPnl(
      [accountSeries({ accountId: 'acc-1', days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(result.tradingDay).toBe('2026-03-05');
    expect(result.netPnl.toString()).toBe('100');
  });

  it('respecte les bornes `from`/`to` (un jour tradé hors période est ignoré)', () => {
    const days = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-05' }),
      buildTrade({ id: 't2', netPnl: d('-40'), tradingDay: '2026-04-01' }),
    ]);
    const result = computeLastDayPnl(
      [accountSeries({ accountId: 'acc-1', days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(result.tradingDay).toBe('2026-03-05');
    expect(result.netPnl.toString()).toBe('100');
  });

  it('lève `MixedCurrencyAggregationError` si les comptes ont des devises différentes (ADR-019)', () => {
    expect(() =>
      computeLastDayPnl(
        [
          accountSeries({ accountId: 'acc-usd', currency: 'USD' }),
          accountSeries({ accountId: 'acc-eur', currency: 'EUR' }),
        ],
        toTradingDay('2026-03-01'),
        toTradingDay('2026-03-31'),
      ),
    ).toThrow(MixedCurrencyAggregationError);
  });

  it('vraie somme multi-comptes : plusieurs comptes tradent le même dernier jour, leur P&L net s’additionne', () => {
    const daysA = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 'a1', netPnl: d('100'), tradingDay: '2026-03-05' }),
      buildTrade({ id: 'a2', netPnl: d('60'), tradingDay: '2026-03-10' }),
    ]);
    const daysB = aggregateByTradingDay(d('500'), [
      buildTrade({ id: 'b1', netPnl: d('-25'), tradingDay: '2026-03-10' }),
    ]);
    const result = computeLastDayPnl(
      [
        accountSeries({ accountId: 'acc-a', days: daysA }),
        accountSeries({ accountId: 'acc-b', days: daysB }),
      ],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    // Les deux comptes ont tradé le 03-10 (dernier jour tradé) : leur netPnl s'additionne réellement.
    expect(result.tradingDay).toBe('2026-03-10');
    expect(result.netPnl.toString()).toBe('35');
  });
});

describe('assertSingleCurrency', () => {
  it('ne lève rien pour 0 ou 1 devise', () => {
    expect(() => assertSingleCurrency([])).not.toThrow();
    expect(() => assertSingleCurrency([{ currency: 'USD' }, { currency: 'USD' }])).not.toThrow();
  });

  it('lève `MixedCurrencyAggregationError` pour plusieurs devises', () => {
    expect(() => assertSingleCurrency([{ currency: 'USD' }, { currency: 'EUR' }])).toThrow(
      MixedCurrencyAggregationError,
    );
  });
});

describe('summarizeAccountsOverPeriod', () => {
  it('0 compte : tout à 0, rendement à 0 (solde initial 0)', () => {
    const summary = summarizeAccountsOverPeriod(
      [],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(summary.startingBalance.toString()).toBe('0');
    expect(summary.balance.toString()).toBe('0');
    expect(summary.periodPnl.toString()).toBe('0');
    expect(summary.returnRate.toString()).toBe('0');
  });

  it('golden ROADMAP : solde initial 200000, P&L net -19743.43 -> solde 180256.57, rendement -9.87 %', () => {
    const days = aggregateByTradingDay(d('200000'), [
      buildTrade({ netPnl: d('-19743.43'), tradingDay: '2026-03-15' }),
    ]);
    const summary = summarizeAccountsOverPeriod(
      [accountSeries({ accountId: 'acc-1', startingBalance: d('200000'), days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(summary.startingBalance.toString()).toBe('200000');
    expect(summary.balance.toFixed(2)).toBe('180256.57');
    expect(summary.periodPnl.toFixed(2)).toBe('-19743.43');
    expect(summary.returnRate.times(100).toFixed(2)).toBe('-9.87');
  });

  it('plusieurs comptes : additionne solde initial, solde de clôture et P&L de la période', () => {
    const daysA = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 'a1', netPnl: d('100'), tradingDay: '2026-03-05' }),
    ]);
    const daysB = aggregateByTradingDay(d('500'), [
      buildTrade({ id: 'b1', netPnl: d('-20'), tradingDay: '2026-03-10' }),
    ]);
    const summary = summarizeAccountsOverPeriod(
      [
        accountSeries({ accountId: 'acc-a', startingBalance: d('1000'), days: daysA }),
        accountSeries({ accountId: 'acc-b', startingBalance: d('500'), days: daysB }),
      ],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(summary.startingBalance.toString()).toBe('1500');
    expect(summary.balance.toString()).toBe('1580'); // (1000+100) + (500-20)
    expect(summary.periodPnl.toString()).toBe('80'); // 100 + -20
  });

  it('ne compte que le P&L des jours dans [from, to] (un trade hors période est exclu de periodPnl mais pas de balance)', () => {
    const days = aggregateByTradingDay(d('1000'), [
      buildTrade({ id: 't1', netPnl: d('100'), tradingDay: '2026-03-05' }),
      buildTrade({ id: 't2', netPnl: d('-40'), tradingDay: '2026-04-01' }),
    ]);
    const summary = summarizeAccountsOverPeriod(
      [accountSeries({ accountId: 'acc-1', days })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(summary.periodPnl.toString()).toBe('100');
    // balance à `to` (03-31) : le trade du 04-01 est après `to`, ignoré par `balanceAtDay`.
    expect(summary.balance.toString()).toBe('1100');
  });

  it('rendement à 0 si le solde initial total est <= 0 (au lieu de lever)', () => {
    const summary = summarizeAccountsOverPeriod(
      [accountSeries({ accountId: 'acc-1', startingBalance: d('0'), days: [] })],
      toTradingDay('2026-03-01'),
      toTradingDay('2026-03-31'),
    );
    expect(summary.returnRate.toString()).toBe('0');
  });

  it('lève `MixedCurrencyAggregationError` si les comptes ont des devises différentes (ADR-019)', () => {
    expect(() =>
      summarizeAccountsOverPeriod(
        [
          accountSeries({ accountId: 'acc-usd', currency: 'USD' }),
          accountSeries({ accountId: 'acc-eur', currency: 'EUR' }),
        ],
        toTradingDay('2026-03-01'),
        toTradingDay('2026-03-31'),
      ),
    ).toThrow(MixedCurrencyAggregationError);
  });
});
