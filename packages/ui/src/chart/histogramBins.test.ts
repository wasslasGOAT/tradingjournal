import { describe, expect, it } from 'vitest';

import { binNumericValues } from './histogramBins';

describe('binNumericValues', () => {
  it('tableau vide -> aucune classe', () => {
    expect(binNumericValues([], 5)).toEqual([]);
  });

  it('rejette un binCount <= 0', () => {
    expect(() => binNumericValues([1, 2], 0)).toThrow();
    expect(() => binNumericValues([1, 2], -1)).toThrow();
  });

  it('valeurs identiques -> une seule classe contenant tout', () => {
    const bins = binNumericValues([4, 4, 4], 5);
    expect(bins).toHaveLength(1);
    expect(bins[0]!.value).toBe(3);
  });

  it('répartit en classes de largeur égale couvrant tout le domaine', () => {
    const bins = binNumericValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(bins).toHaveLength(5);
    expect(bins[0]!.x0).toBe(0);
    expect(bins.at(-1)!.x1).toBe(10);
    const total = bins.reduce((acc, bin) => acc + bin.value, 0);
    expect(total).toBe(11);
  });

  it('la valeur maximale tombe dans la dernière classe (borne haute incluse uniquement pour elle)', () => {
    const bins = binNumericValues([0, 10], 2);
    expect(bins).toHaveLength(2);
    expect(bins[0]!.value).toBe(1);
    expect(bins[1]!.value).toBe(1);
  });

  it('classes contiguës (x1 d’une classe = x0 de la suivante)', () => {
    const bins = binNumericValues([-5, -2, 0, 3, 9], 4);
    for (let i = 1; i < bins.length; i += 1) {
      expect(bins[i]!.x0).toBeCloseTo(bins[i - 1]!.x1, 9);
    }
  });
});
