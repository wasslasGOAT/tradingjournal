import { describe, expect, it } from 'vitest';

import { Decimal } from './decimal';
import {
  addMoney,
  CurrencyMismatchError,
  InvalidCurrencyError,
  money,
  negateMoney,
  sumMoneyByCurrency,
} from './money';

describe('money', () => {
  it('construit un Money avec un code ISO 4217 valide', () => {
    const m = money(new Decimal('200000'), 'USD');
    expect(m.amount.toString()).toBe('200000');
    expect(m.currency).toBe('USD');
  });

  it('tolère USDT', () => {
    expect(() => money(new Decimal('1'), 'USDT')).not.toThrow();
  });

  it('rejette un code devise invalide', () => {
    expect(() => money(new Decimal('1'), 'usd')).toThrow(InvalidCurrencyError);
    expect(() => money(new Decimal('1'), 'US')).toThrow(InvalidCurrencyError);
    expect(() => money(new Decimal('1'), 'USDC')).toThrow(InvalidCurrencyError);
  });
});

describe('addMoney', () => {
  it('additionne deux montants de même devise', () => {
    const result = addMoney(money(new Decimal('100'), 'EUR'), money(new Decimal('-30.5'), 'EUR'));
    expect(result.amount.toString()).toBe('69.5');
    expect(result.currency).toBe('EUR');
  });

  it('rejette deux devises différentes', () => {
    expect(() =>
      addMoney(money(new Decimal('100'), 'EUR'), money(new Decimal('100'), 'USD')),
    ).toThrow(CurrencyMismatchError);
  });
});

describe('negateMoney', () => {
  it('inverse le signe sans changer la devise', () => {
    const result = negateMoney(money(new Decimal('19743.43'), 'USD'));
    expect(result.amount.toString()).toBe('-19743.43');
    expect(result.currency).toBe('USD');
  });

  it('négation de zéro reste zéro (pas de "-0" affiché en toString)', () => {
    expect(negateMoney(money(new Decimal('0'), 'USD')).amount.toString()).toBe('0');
  });
});

describe('sumMoneyByCurrency', () => {
  it('additionne au sein de chaque devise sans conversion (ADR-019)', () => {
    const result = sumMoneyByCurrency([
      money(new Decimal('180256.57'), 'USD'),
      money(new Decimal('5000'), 'EUR'),
      money(new Decimal('19743.43'), 'USD'),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.currency).toBe('EUR');
    expect(result[0]?.amount.toString()).toBe('5000');
    expect(result[1]?.currency).toBe('USD');
    expect(result[1]?.amount.toString()).toBe('200000');
  });

  it('retourne un tableau vide pour une collection vide', () => {
    expect(sumMoneyByCurrency([])).toEqual([]);
  });

  it("n'ajoute pas de devise à zéro implicite : une seule devise présente -> un seul résultat", () => {
    const result = sumMoneyByCurrency([money(new Decimal('42'), 'GBP')]);
    expect(result).toHaveLength(1);
    expect(result[0]?.currency).toBe('GBP');
  });

  it('trie le résultat par code devise (déterministe)', () => {
    const result = sumMoneyByCurrency([
      money(new Decimal('1'), 'USD'),
      money(new Decimal('1'), 'EUR'),
    ]);
    expect(result.map((m) => m.currency)).toEqual(['EUR', 'USD']);
  });
});
