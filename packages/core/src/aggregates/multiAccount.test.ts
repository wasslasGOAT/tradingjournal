import { describe, expect, it } from 'vitest';

import { Decimal } from '../money';
import { aggregateAccountsByCurrency } from './multiAccount';
import type { AccountMoneyValues } from './multiAccount';

function account(accountId: string, currency: string, balance: string, netPnl: string): AccountMoneyValues {
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
    const accounts = [account('acc-eur', 'EUR', '1000', '100'), account('acc-usd', 'USD', '1080', '100')];
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
    expect(totals).toEqual([{ currency: 'EUR', balance: new Decimal('1000'), netPnl: new Decimal('0'), accountIds: ['acc-eur'] }]);
  });
});
