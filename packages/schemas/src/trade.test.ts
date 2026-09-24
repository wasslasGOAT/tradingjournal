import { describe, expect, it } from 'vitest';

import { tradeFormSchema } from './trade';

const execution = {
  side: 'buy' as const,
  quantity: '1',
  price: '1.26500',
  executedAt: '2026-03-02T08:15:00Z',
};
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

  it('rejette un stop loss ou un take profit nul ou négatif (revue M3 #12 — niveaux de prix, pas une distance)', () => {
    expect(tradeFormSchema.safeParse({ ...valid, stopLoss: '0' }).success).toBe(false);
    expect(tradeFormSchema.safeParse({ ...valid, stopLoss: '-1.5' }).success).toBe(false);
    expect(tradeFormSchema.safeParse({ ...valid, takeProfit: '0' }).success).toBe(false);
    expect(tradeFormSchema.safeParse({ ...valid, takeProfit: '-1.5' }).success).toBe(false);
  });

  it('accepte un stop loss et un take profit strictement positifs', () => {
    const result = tradeFormSchema.safeParse({
      ...valid,
      stopLoss: '1.25000',
      takeProfit: '1.29000',
    });
    expect(result.success).toBe(true);
  });

  it('rejette une première exécution dont le côté ne correspond pas à la direction (revue M3 #12)', () => {
    const mismatched = tradeFormSchema.safeParse({
      ...valid,
      direction: 'long',
      executions: [{ ...execution, side: 'sell' }],
    });
    expect(mismatched.success).toBe(false);
    if (!mismatched.success) {
      expect(mismatched.error.issues[0]?.message).toBe('validation.trade.directionMismatch');
    }

    const mismatchedShort = tradeFormSchema.safeParse({
      ...valid,
      direction: 'short',
      executions: [{ ...execution, side: 'buy' }],
    });
    expect(mismatchedShort.success).toBe(false);
  });

  it("refuse une inversion de position au sein d'un même formulaire de trade (revue M3 #12)", () => {
    // Long 10 @ entry, clôture totale à 10 (position à plat AVANT la dernière exécution), puis rouvre 5 : inversion refusée ici.
    const result = tradeFormSchema.safeParse({
      ...valid,
      direction: 'long',
      executions: [
        { ...execution, side: 'buy', quantity: '10', executedAt: '2026-03-02T08:00:00Z' },
        { ...execution, side: 'sell', quantity: '10', executedAt: '2026-03-02T09:00:00Z' },
        { ...execution, side: 'buy', quantity: '5', executedAt: '2026-03-02T10:00:00Z' },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('validation.trade.inversionNotAllowed');
    }
  });

  it('accepte une sortie totale en dernière exécution (position à plat seulement à la fin, pas une inversion)', () => {
    const result = tradeFormSchema.safeParse({
      ...valid,
      direction: 'long',
      executions: [
        { ...execution, side: 'buy', quantity: '10', executedAt: '2026-03-02T08:00:00Z' },
        { ...execution, side: 'sell', quantity: '4', executedAt: '2026-03-02T09:00:00Z' },
        { ...execution, side: 'sell', quantity: '6', executedAt: '2026-03-02T10:00:00Z' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepte des sorties partielles multiples tant que le sens de la position ne change pas avant la dernière exécution', () => {
    const result = tradeFormSchema.safeParse({
      ...valid,
      direction: 'short',
      executions: [
        { ...execution, side: 'sell', quantity: '10', executedAt: '2026-03-02T08:00:00Z' },
        { ...execution, side: 'sell', quantity: '5', executedAt: '2026-03-02T08:30:00Z' },
        { ...execution, side: 'buy', quantity: '15', executedAt: '2026-03-02T09:00:00Z' },
      ],
    });
    expect(result.success).toBe(true);
  });

  describe('revue M3 (boucle 2) #1 — inversion sur la dernière exécution (bloquant)', () => {
    it('refuse une inversion QUAND ELLE SURVIENT SUR LA DERNIÈRE EXÉCUTION (achat 1 puis vente 3, dépassement de signe)', () => {
      const result = tradeFormSchema.safeParse({
        ...valid,
        direction: 'long',
        executions: [
          { ...execution, side: 'buy', quantity: '1', executedAt: '2026-03-02T08:00:00Z' },
          { ...execution, side: 'sell', quantity: '3', executedAt: '2026-03-02T09:00:00Z' },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.trade.inversionNotAllowed');
      }
    });

    it('accepte une clôture EXACTE sur la dernière exécution (pas une inversion, régression)', () => {
      const result = tradeFormSchema.safeParse({
        ...valid,
        direction: 'long',
        executions: [
          { ...execution, side: 'buy', quantity: '1', executedAt: '2026-03-02T08:00:00Z' },
          { ...execution, side: 'sell', quantity: '1', executedAt: '2026-03-02T09:00:00Z' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("revue M3 (boucle 2) #2 — cohérence suit l'ordre chronologique, pas l'ordre de saisie", () => {
    it("rejette un trade long dont la vente est saisie en premier mais datée AVANT l'achat (tri par executedAt)", () => {
      // Ordre de saisie : vente (index 0) puis achat (index 1) — mais l'achat
      // est horodaté AVANT la vente : une fois trié par `executedAt`, l'achat
      // devient la première exécution chronologique (cohérent avec la
      // direction 'long'), et la vente (index 0, saisie en premier) devrait
      // donc être signalée si un contrôle naïf se fiait à l'ordre du tableau.
      // Ici on teste l'inverse : vente datée AVANT l'achat -> la première
      // exécution chronologique est la vente, incohérente avec 'long'.
      const result = tradeFormSchema.safeParse({
        ...valid,
        direction: 'long',
        executions: [
          { ...execution, side: 'buy', quantity: '10', executedAt: '2026-03-02T10:00:00Z' },
          { ...execution, side: 'sell', quantity: '10', executedAt: '2026-03-02T08:00:00Z' },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.trade.directionMismatch');
        // Le `path` pointe vers la position d'ORIGINE dans le tableau (index 1, la vente), pas la position triée.
        expect(result.error.issues[0]?.path).toEqual(['executions', 1, 'side']);
      }
    });

    it('sequence départage deux exécutions au même executedAt, avant la position de saisie', () => {
      const sameInstant = '2026-03-02T09:00:00Z';
      const result = tradeFormSchema.safeParse({
        ...valid,
        direction: 'long',
        executions: [
          // Saisie dans l'ordre : vente (sequence 2) puis achat (sequence 1) -> triée : achat d'abord, cohérent avec 'long'.
          { ...execution, side: 'sell', quantity: '10', executedAt: sameInstant, sequence: 2 },
          { ...execution, side: 'buy', quantity: '10', executedAt: sameInstant, sequence: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
