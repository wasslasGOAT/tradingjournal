import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { AmountParseError, parseAmount, toAmountString } from './parseAmount';

describe('parseAmount', () => {
  it('parse une chaîne numérique Postgres avec décimales', () => {
    const result = parseAmount('-17527.71000000');
    expect(result).toBeInstanceOf(Decimal);
    expect(result.toString()).toBe('-17527.71');
  });

  it('parse un entier sans décimales', () => {
    expect(parseAmount('200000').toString()).toBe('200000');
  });

  it('parse zéro', () => {
    expect(parseAmount('0').toString()).toBe('0');
    expect(parseAmount('0.00000000').toString()).toBe('0');
  });

  it('parse un montant positif explicite sans signe', () => {
    expect(parseAmount('19743.43').toString()).toBe('19743.43');
  });

  it('conserve la précision au-delà du flottant IEEE 754', () => {
    // 0.1 + 0.2 en float donne 0.30000000000000004 ; Decimal doit rester exact.
    const a = parseAmount('0.10000000');
    const b = parseAmount('0.20000000');
    expect(a.plus(b).toString()).toBe('0.3');
  });

  it('rejette un number JS', () => {
    expect(() => parseAmount(17527.71 as unknown as string)).toThrow(AmountParseError);
  });

  it('rejette la chaîne vide', () => {
    expect(() => parseAmount('')).toThrow(AmountParseError);
  });

  it('rejette la notation scientifique', () => {
    expect(() => parseAmount('1e21')).toThrow(AmountParseError);
  });

  it('rejette un séparateur de milliers', () => {
    expect(() => parseAmount('17,527.71')).toThrow(AmountParseError);
  });

  it('rejette une chaîne non numérique', () => {
    expect(() => parseAmount('abc')).toThrow(AmountParseError);
  });

  it('rejette les espaces', () => {
    expect(() => parseAmount(' 100 ')).toThrow(AmountParseError);
  });

  it('rejette NaN et Infinity texte', () => {
    expect(() => parseAmount('NaN')).toThrow(AmountParseError);
    expect(() => parseAmount('Infinity')).toThrow(AmountParseError);
  });

  it("l'erreur porte la valeur reçue", () => {
    try {
      parseAmount('nope');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AmountParseError);
      expect((error as AmountParseError).receivedValue).toBe('nope');
    }
  });
});

describe('toAmountString', () => {
  it('sérialise un Decimal négatif en notation fixe', () => {
    expect(toAmountString(new Decimal('-17527.71'))).toBe('-17527.71');
  });

  it('sérialise un entier sans point décimal superflu', () => {
    expect(toAmountString(new Decimal('200000'))).toBe('200000');
  });

  it('ne produit jamais de notation exponentielle', () => {
    const tiny = new Decimal('0.0000000001');
    expect(toAmountString(tiny)).not.toMatch(/e/i);
  });

  it('round-trip parseAmount -> toAmountString sur le cas golden', () => {
    const parsed = parseAmount('-19743.43000000');
    expect(toAmountString(parsed)).toBe('-19743.43');
  });
});
