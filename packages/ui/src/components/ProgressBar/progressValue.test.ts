import { describe, expect, it } from 'vitest';

import { clampProgress, toProgressPercent } from './progressValue';

describe('clampProgress', () => {
  it('laisse passer une valeur déjà dans [0, 1]', () => {
    expect(clampProgress(0.42)).toBe(0.42);
  });

  it('ramène à 0 une valeur négative', () => {
    expect(clampProgress(-0.5)).toBe(0);
  });

  it('ramène à 1 une valeur supérieure à 1', () => {
    expect(clampProgress(1.5)).toBe(1);
  });

  it('ramène NaN à 0', () => {
    expect(clampProgress(NaN)).toBe(0);
  });
});

describe('toProgressPercent', () => {
  it('arrondit au pourcentage entier le plus proche', () => {
    expect(toProgressPercent(0.655)).toBe(66);
    expect(toProgressPercent(0)).toBe(0);
    expect(toProgressPercent(1)).toBe(100);
  });
});
