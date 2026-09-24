import { Decimal } from '@repo/core';
import { describe, expect, it } from 'vitest';

import { formatCompactSignedAmount } from './compactAmount';

describe('formatCompactSignedAmount', () => {
  it('sous 1 000 : nombre entier, sans palier', () => {
    expect(formatCompactSignedAmount(new Decimal('312'), { locale: 'en' })).toBe('+312');
  });

  it('arrondit les décimales sous 1 000', () => {
    expect(formatCompactSignedAmount(new Decimal('245.8'), { locale: 'en' })).toBe('+246');
  });

  it('palier k, une décimale sous 10', () => {
    expect(formatCompactSignedAmount(new Decimal('1300'), { locale: 'en' })).toBe('+1.3k');
    expect(formatCompactSignedAmount(new Decimal('1300'), { locale: 'fr' })).toBe('+1,3k');
  });

  it('palier k, sans décimale à partir de 10', () => {
    expect(formatCompactSignedAmount(new Decimal('12400'), { locale: 'en' })).toBe('+12k');
  });

  it('palier M', () => {
    expect(formatCompactSignedAmount(new Decimal('2400000'), { locale: 'en' })).toBe('+2.4M');
  });

  it('bascule au palier supérieur avant que l’arrondi n’atteigne 1000 dans le palier courant', () => {
    // 999 600 / 1000 = 999.6 -> arrondirait à "1000k" sans le seuil bas de palier.
    expect(formatCompactSignedAmount(new Decimal('999600'), { locale: 'en' })).toBe('+1.0M');
    expect(formatCompactSignedAmount(new Decimal('999600000'), { locale: 'en' })).toBe('+1.0B');
  });

  it('signe négatif (moins typographique, jamais le trait d’union)', () => {
    expect(formatCompactSignedAmount(new Decimal('-1345.2'), { locale: 'en' })).toBe('−1.3k');
  });

  it('zéro compte comme positif (convention formatSignedAmount)', () => {
    expect(formatCompactSignedAmount(new Decimal('0'), { locale: 'en' })).toBe('+0');
    expect(formatCompactSignedAmount(new Decimal('-0'), { locale: 'en' })).toBe('+0');
  });

  it('masque la valeur quand hideAmounts est actif', () => {
    expect(
      formatCompactSignedAmount(new Decimal('1300'), { locale: 'en', hideAmounts: true }),
    ).toBe('•••••');
  });
});
