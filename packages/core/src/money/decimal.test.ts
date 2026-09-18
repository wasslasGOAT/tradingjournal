import { describe, expect, it } from 'vitest';

import { Decimal } from './decimal';

describe('Decimal (constructeur configuré)', () => {
  it('conserve tous les chiffres significatifs au-delà des 20 par défaut de decimal.js', () => {
    // Avec le défaut de decimal.js (precision: 20), cette somme s'arrondit
    // silencieusement à "200000000000000". Avec precision: 40, elle est exacte.
    const a = new Decimal('99999999999999.99999999');
    const b = new Decimal('99999999999999.99999999');
    expect(a.plus(b).toString()).toBe('199999999999999.99999998');
  });

  it("expose une précision d'au moins 40 chiffres significatifs", () => {
    expect(Decimal.precision).toBeGreaterThanOrEqual(40);
  });

  it('utilise ROUND_HALF_EVEN (arrondi bancaire) pour les opérations non exactes', () => {
    expect(Decimal.rounding).toBe(Decimal.ROUND_HALF_EVEN);
    // 2.5 et 3.5 arrondis au nombre pair le plus proche (pas toujours vers le haut).
    expect(new Decimal('2.5').toDecimalPlaces(0).toString()).toBe('2');
    expect(new Decimal('3.5').toDecimalPlaces(0).toString()).toBe('4');
  });

  it("produit des instances utilisables comme n'importe quel Decimal (division, comparaison)", () => {
    const result = new Decimal('10').dividedBy('3');
    expect(result.toDecimalPlaces(2).toString()).toBe('3.33');
  });
});
