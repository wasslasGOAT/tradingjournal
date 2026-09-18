import { describe, expect, it } from 'vitest';

import { Decimal } from '../money';
import {
  computeBalance,
  computeReturnRate,
  InvalidCashMovementError,
  signedCashMovementAmount,
} from './balance';
import type { CashMovementInput } from './balance';

function d(value: string): Decimal {
  return new Decimal(value);
}

function movement(type: CashMovementInput['type'], amount: string): CashMovementInput {
  return { type, amount: d(amount), occurredAt: new Date('2026-03-02T00:00:00Z') };
}

describe('signedCashMovementAmount', () => {
  it('deposit : augmente le solde (+)', () => {
    expect(signedCashMovementAmount(movement('deposit', '1000')).toString()).toBe('1000');
  });

  it('withdrawal : diminue le solde (-)', () => {
    expect(signedCashMovementAmount(movement('withdrawal', '1000')).toString()).toBe('-1000');
  });

  it('payout : diminue le solde (-), même sens que withdrawal', () => {
    expect(signedCashMovementAmount(movement('payout', '500')).toString()).toBe('-500');
  });

  it('fee : diminue le solde (-)', () => {
    expect(signedCashMovementAmount(movement('fee', '10')).toString()).toBe('-10');
  });

  it('adjustment : utilise le montant tel quel (signé par l’appelant)', () => {
    expect(signedCashMovementAmount(movement('adjustment', '25')).toString()).toBe('25');
    expect(signedCashMovementAmount(movement('adjustment', '-25')).toString()).toBe('-25');
  });

  it('rejette un montant négatif pour deposit/withdrawal/payout/fee', () => {
    expect(() => signedCashMovementAmount(movement('deposit', '-1'))).toThrow(InvalidCashMovementError);
    expect(() => signedCashMovementAmount(movement('withdrawal', '-1'))).toThrow(InvalidCashMovementError);
    expect(() => signedCashMovementAmount(movement('payout', '-1'))).toThrow(InvalidCashMovementError);
    expect(() => signedCashMovementAmount(movement('fee', '-1'))).toThrow(InvalidCashMovementError);
  });
});

describe('computeBalance', () => {
  it('cas golden : solde initial 200 000, P&L net total -19 743,43, aucun mouvement -> 180 256,57', () => {
    const balance = computeBalance(d('200000'), [d('-19743.43')], []);
    expect(balance.toString()).toBe('180256.57');
  });

  it('additionne plusieurs P&L nets', () => {
    const balance = computeBalance(d('1000'), [d('100'), d('-30'), d('5.5')], []);
    expect(balance.toString()).toBe('1075.5');
  });

  it('0 trade : le solde reste le solde initial + mouvements', () => {
    const balance = computeBalance(d('1000'), [], [movement('deposit', '500')]);
    expect(balance.toString()).toBe('1500');
  });

  it('combine P&L nets et mouvements de trésorerie de tous types', () => {
    const balance = computeBalance(
      d('10000'),
      [d('200'), d('-50')],
      [movement('deposit', '1000'), movement('withdrawal', '300'), movement('fee', '20'), movement('adjustment', '-5')],
    );
    // 10000 + 200 - 50 + 1000 - 300 - 20 - 5 = 10825
    expect(balance.toString()).toBe('10825');
  });

  it('propage une erreur de mouvement de trésorerie invalide', () => {
    expect(() => computeBalance(d('1000'), [], [movement('deposit', '-1')])).toThrow(
      InvalidCashMovementError,
    );
  });
});

describe('computeReturnRate', () => {
  it('cas golden : 200 000 -> 180 256,57 donne -0,09871715 (affiché -9,87 %)', () => {
    const rate = computeReturnRate(d('200000'), d('180256.57'));
    expect(rate.toString()).toBe('-0.09871715');
  });

  it('rendement positif', () => {
    const rate = computeReturnRate(d('1000'), d('1100'));
    expect(rate.toString()).toBe('0.1');
  });

  it('rendement nul quand le solde est inchangé', () => {
    expect(computeReturnRate(d('1000'), d('1000')).toString()).toBe('0');
  });

  it('rejette un solde initial <= 0', () => {
    expect(() => computeReturnRate(d('0'), d('100'))).toThrow();
    expect(() => computeReturnRate(d('-100'), d('100'))).toThrow();
  });
});
