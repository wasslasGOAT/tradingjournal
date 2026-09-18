import { describe, expect, it } from 'vitest';

import { executionFormSchema, executionSchema } from './execution';

const valid = {
  side: 'buy' as const,
  quantity: '1',
  price: '1.26500',
  executedAt: '2026-03-02T08:15:00Z',
};

describe('executionFormSchema', () => {
  it('accepte une exécution valide, commission/fees par défaut à 0', () => {
    const result = executionFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.commission).toBe('0');
    expect(result.data?.fees).toBe('0');
  });

  it('rejette une quantité nulle ou négative', () => {
    expect(executionFormSchema.safeParse({ ...valid, quantity: '0' }).success).toBe(false);
    expect(executionFormSchema.safeParse({ ...valid, quantity: '-1' }).success).toBe(false);
  });

  it('rejette un prix nul ou négatif', () => {
    expect(executionFormSchema.safeParse({ ...valid, price: '0' }).success).toBe(false);
    expect(executionFormSchema.safeParse({ ...valid, price: '-1.5' }).success).toBe(false);
  });

  it('rejette une commission ou des frais négatifs', () => {
    expect(executionFormSchema.safeParse({ ...valid, commission: '-1' }).success).toBe(false);
    expect(executionFormSchema.safeParse({ ...valid, fees: '-1' }).success).toBe(false);
  });

  it('accepte une commission ou des frais à 0 exactement', () => {
    expect(executionFormSchema.safeParse({ ...valid, commission: '0.00', fees: '0' }).success).toBe(true);
  });

  it('rejette un side inconnu', () => {
    expect(executionFormSchema.safeParse({ ...valid, side: 'short' }).success).toBe(false);
  });

  it('rejette une date non ISO', () => {
    expect(executionFormSchema.safeParse({ ...valid, executedAt: '02/03/2026' }).success).toBe(false);
  });
});

describe('executionSchema', () => {
  it('étend executionFormSchema avec accountId/instrumentId', () => {
    const result = executionSchema.safeParse({
      ...valid,
      accountId: '123e4567-e89b-42d3-a456-426614174000',
      instrumentId: '123e4567-e89b-42d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });

  it('rejette un accountId non UUID', () => {
    const result = executionSchema.safeParse({ ...valid, accountId: 'not-a-uuid', instrumentId: '123e4567-e89b-42d3-a456-426614174001' });
    expect(result.success).toBe(false);
  });
});
