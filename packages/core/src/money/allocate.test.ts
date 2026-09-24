import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { allocateProRata, InvalidAllocationWeightsError } from './allocate';

function d(value: string): Decimal {
  return new Decimal(value);
}

describe('allocateProRata (revue M3 #10)', () => {
  it('répartit exactement quand les parts tombent rond', () => {
    const shares = allocateProRata(d('100'), [d('1'), d('1')]);
    expect(shares.map((s) => s.toString())).toEqual(['50', '50']);
  });

  it('répartit au prorata de poids inégaux', () => {
    const shares = allocateProRata(d('100'), [d('1'), d('3')]);
    expect(shares.map((s) => s.toString())).toEqual(['25', '75']);
  });

  it('la dernière part absorbe l’écart d’arrondi (somme toujours exacte)', () => {
    // 10 / 3 = 3.33333333 (8 décimales), 3 parts égales : 3.33333333 * 3 = 9.99999999 != 10.
    // La dernière part doit donc valoir 10 - 3.33333333 - 3.33333333 = 3.33333334 (pas 3.33333333).
    const shares = allocateProRata(d('10'), [d('1'), d('1'), d('1')]);
    expect(shares[0]?.toString()).toBe('3.33333333');
    expect(shares[1]?.toString()).toBe('3.33333333');
    expect(shares[2]?.toString()).toBe('3.33333334');
    const total = shares.reduce((acc, s) => acc.plus(s), new Decimal(0));
    expect(total.toString()).toBe('10');
  });

  it('un seul poids : toute la part va à la dernière (et seule) entrée, exactement', () => {
    const shares = allocateProRata(d('19743.43'), [d('7')]);
    expect(shares).toHaveLength(1);
    expect(shares[0]?.toString()).toBe('19743.43');
  });

  it('un poids nul parmi d’autres reçoit une part nulle', () => {
    const shares = allocateProRata(d('100'), [d('0'), d('1')]);
    expect(shares[0]?.toString()).toBe('0');
    expect(shares[1]?.toString()).toBe('100');
  });

  it('accepte un scale personnalisé', () => {
    const shares = allocateProRata(d('10'), [d('1'), d('1'), d('1')], 2);
    expect(shares.map((s) => s.toString())).toEqual(['3.33', '3.33', '3.34']);
  });

  it('rejette une liste de poids vide', () => {
    expect(() => allocateProRata(d('100'), [])).toThrow(InvalidAllocationWeightsError);
  });

  it('rejette un poids négatif', () => {
    expect(() => allocateProRata(d('100'), [d('1'), d('-1')])).toThrow(
      InvalidAllocationWeightsError,
    );
  });

  it('rejette une somme de poids nulle', () => {
    expect(() => allocateProRata(d('100'), [d('0'), d('0')])).toThrow(
      InvalidAllocationWeightsError,
    );
  });

  it('répartit un montant négatif (ex. correction) de la même façon', () => {
    const shares = allocateProRata(d('-100'), [d('1'), d('1')]);
    expect(shares.map((s) => s.toString())).toEqual(['-50', '-50']);
  });
});
