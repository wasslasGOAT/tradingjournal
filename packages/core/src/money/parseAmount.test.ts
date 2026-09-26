import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import {
  AmountParseError,
  parseAmount,
  sumAmountStrings,
  toAmountString,
  toDbAmount,
} from './parseAmount';

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

  it("décrit une valeur ni number ni string (ex. null/objet) dans le message d'erreur", () => {
    expect(() => parseAmount(null as unknown as string)).toThrow(/object/);
    expect(() => parseAmount(undefined as unknown as string)).toThrow(/undefined/);
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

describe('toDbAmount (revue M3 #10)', () => {
  it('arrondit ROUND_HALF_EVEN à scale décimales (défaut 8)', () => {
    expect(toDbAmount(new Decimal('1.123456789'))).toBe('1.12345679');
  });

  it('accepte un scale personnalisé (ex. 2 pour un affichage centime)', () => {
    expect(toDbAmount(new Decimal('2.005'), 2)).toBe('2.00'); // ROUND_HALF_EVEN : 2.00 est pair
    expect(toDbAmount(new Decimal('2.015'), 2)).toBe('2.02');
  });

  it("complète toujours avec des zéros jusqu'à scale (contrairement à toAmountString)", () => {
    expect(toDbAmount(new Decimal('200000'), 2)).toBe('200000.00');
    expect(toAmountString(new Decimal('200000'))).toBe('200000'); // pas de zéros ajoutés
  });

  it('ne produit jamais de notation exponentielle même pour un tout petit montant', () => {
    expect(toDbAmount(new Decimal('0.0000000001'), 8)).not.toMatch(/e/i);
  });

  it("tronque un Decimal à 40 chiffres significatifs (ADR-005) à l'échelle numeric(20,8) avant écriture", () => {
    // Un Decimal calculé (ex. profit factor) peut porter beaucoup plus de décimales
    // que numeric(20,8) n'en accepte : toDbAmount arrondit explicitement, jamais Postgres.
    const computed = new Decimal('1').dividedBy(new Decimal('3')); // 0.3333...3 (40 chiffres)
    expect(toDbAmount(computed, 8)).toBe('0.33333333');
  });
});

describe('sumAmountStrings (revue M1 bloquant #1 : total hebdo hors du composant calendrier)', () => {
  it('retourne 0 pour une liste vide', () => {
    expect(sumAmountStrings([]).toString()).toBe('0');
  });

  it('ignore les valeurs null/undefined mélangées à des montants', () => {
    const result = sumAmountStrings(['100.5', null, '-50.25', undefined, '10']);
    expect(result.toString()).toBe('60.25');
  });

  it('retourne 0 si toutes les valeurs sont absentes', () => {
    expect(sumAmountStrings([null, undefined, null]).toString()).toBe('0');
  });

  it('somme exacte sur des montants à 8 décimales (pas de dérive flottante)', () => {
    const result = sumAmountStrings(['0.10000001', '0.20000002', '0.30000003']);
    expect(result.toString()).toBe('0.60000006');
  });

  it('reproduit le total hebdo du jeu golden (10 jours, P&L net -17527.71)', () => {
    // Répartition arbitraire de -17527.71 sur 3 jours actifs + jours vides (weekend).
    const result = sumAmountStrings([
      '-8000.11',
      null,
      '-5000.00',
      undefined,
      '-4527.60',
      null,
      null,
    ]);
    expect(result.toString()).toBe('-17527.71');
  });

  it('rejette une valeur invalide via AmountParseError (parseAmount)', () => {
    expect(() => sumAmountStrings(['100', 'abc'])).toThrow(AmountParseError);
  });

  it('rejette un number JS glissé dans le tableau (typage contourné)', () => {
    expect(() => sumAmountStrings(['100', 17.5 as unknown as string])).toThrow(AmountParseError);
  });
});
