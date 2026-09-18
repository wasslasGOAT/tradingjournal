import { describe, expect, it } from 'vitest';

import { tradeFormSchema } from './trade';

const execution = { side: 'buy' as const, quantity: '1', price: '1.26500', executedAt: '2026-03-02T08:15:00Z' };
const valid = {
  accountId: '123e4567-e89b-42d3-a456-426614174000',
  instrumentId: '123e4567-e89b-42d3-a456-426614174001',
  direction: 'long' as const,
  executions: [execution],
};

describe('tradeFormSchema', () => {
  it('accepte un trade valide (mode simple, 2 exécutions), tagIds par défaut []', () => {
    const result = tradeFormSchema.safeParse({
      ...valid,
      executions: [execution, { ...execution, side: 'sell', executedAt: '2026-03-02T14:45:00Z' }],
    });
    expect(result.success).toBe(true);
    expect(result.data?.tagIds).toEqual([]);
  });

  it('accepte une position encore ouverte (une seule exécution)', () => {
    expect(tradeFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette un trade sans exécution', () => {
    expect(tradeFormSchema.safeParse({ ...valid, executions: [] }).success).toBe(false);
  });

  it('rejette un risque initial nul ou négatif', () => {
    expect(tradeFormSchema.safeParse({ ...valid, initialRisk: '0' }).success).toBe(false);
    expect(tradeFormSchema.safeParse({ ...valid, initialRisk: '-100' }).success).toBe(false);
  });

  it('accepte un risque initial strictement positif', () => {
    expect(tradeFormSchema.safeParse({ ...valid, initialRisk: '250' }).success).toBe(true);
  });

  it('rejette un rating hors 1-5', () => {
    expect(tradeFormSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(tradeFormSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });

  it('accepte setup, note et tagIds', () => {
    const result = tradeFormSchema.safeParse({
      ...valid,
      setup: 'breakout',
      note: 'Bonne exécution, respect du plan.',
      tagIds: ['123e4567-e89b-42d3-a456-426614174002'],
    });
    expect(result.success).toBe(true);
  });

  it('rejette une direction inconnue', () => {
    expect(tradeFormSchema.safeParse({ ...valid, direction: 'flat' }).success).toBe(false);
  });
});
