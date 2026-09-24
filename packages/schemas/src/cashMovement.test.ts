import { describe, expect, it } from 'vitest';

import { cashMovementFormSchema } from './cashMovement';

const base = {
  accountId: '123e4567-e89b-42d3-a456-426614174000',
  occurredAt: '2026-03-02T00:00:00Z',
};

describe('cashMovementFormSchema', () => {
  it('accepte un dépôt (montant positif)', () => {
    expect(
      cashMovementFormSchema.safeParse({ ...base, type: 'deposit', amount: '1000' }).success,
    ).toBe(true);
  });

  it('rejette un retrait avec un montant négatif (magnitude attendue)', () => {
    const result = cashMovementFormSchema.safeParse({
      ...base,
      type: 'withdrawal',
      amount: '-500',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('validation.cashMovement.amountSign');
    }
  });

  it('accepte un ajustement négatif (signé librement)', () => {
    expect(
      cashMovementFormSchema.safeParse({ ...base, type: 'adjustment', amount: '-25' }).success,
    ).toBe(true);
  });

  it('accepte un ajustement positif', () => {
    expect(
      cashMovementFormSchema.safeParse({ ...base, type: 'adjustment', amount: '25' }).success,
    ).toBe(true);
  });

  it('accepte un montant à 0 pour un type non-adjustment', () => {
    expect(cashMovementFormSchema.safeParse({ ...base, type: 'fee', amount: '0' }).success).toBe(
      true,
    );
  });

  it('rejette un type inconnu', () => {
    expect(cashMovementFormSchema.safeParse({ ...base, type: 'bonus', amount: '10' }).success).toBe(
      false,
    );
  });

  it('accepte une note optionnelle', () => {
    const result = cashMovementFormSchema.safeParse({
      ...base,
      type: 'deposit',
      amount: '100',
      note: 'Virement initial',
    });
    expect(result.success).toBe(true);
  });
});
