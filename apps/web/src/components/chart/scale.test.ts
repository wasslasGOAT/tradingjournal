import { describe, expect, it } from 'vitest';

import {
  computeDomain,
  computeTicks,
  createLinearScale,
  domainIncludingZero,
  padDomain,
} from './scale';

describe('computeDomain', () => {
  it('domaine [0,0] pour un tableau vide', () => {
    expect(computeDomain([])).toEqual([0, 0]);
  });

  it('min/max sur un ensemble quelconque, positif et négatif', () => {
    expect(computeDomain([3, -5, 10, 0, 7])).toEqual([-5, 10]);
  });

  it('domaine dégénéré pour une valeur constante', () => {
    expect(computeDomain([4, 4, 4])).toEqual([4, 4]);
  });
});

describe('createLinearScale', () => {
  it('mappe le domaine sur l’intervalle, bornes incluses', () => {
    const scale = createLinearScale([0, 100], [0, 200]);
    expect(scale(0)).toBe(0);
    expect(scale(100)).toBe(200);
    expect(scale(50)).toBe(100);
  });

  it('extrapole hors domaine (pas de clamp)', () => {
    const scale = createLinearScale([0, 10], [0, 100]);
    expect(scale(20)).toBe(200);
    expect(scale(-10)).toBe(-100);
  });

  it('domaine dégénéré -> toujours le milieu de l’intervalle, jamais NaN', () => {
    const scale = createLinearScale([5, 5], [0, 200]);
    expect(scale(5)).toBe(100);
    expect(scale(999)).toBe(100);
  });

  it('intervalle inversé (ex. axe Y écran) accepté', () => {
    const scale = createLinearScale([0, 10], [200, 0]);
    expect(scale(0)).toBe(200);
    expect(scale(10)).toBe(0);
  });
});

describe('computeTicks', () => {
  it('domaine dégénéré -> une seule graduation', () => {
    expect(computeTicks([3, 3], 4)).toEqual([3]);
  });

  it('count <= 0 -> une seule graduation (le minimum)', () => {
    expect(computeTicks([0, 10], 0)).toEqual([0]);
  });

  it('graduations "rondes" (1/2/5 × 10^n), couvrant le domaine', () => {
    const ticks = computeTicks([0, 100], 5);
    expect(ticks[0]).toBeGreaterThanOrEqual(0);
    expect(ticks.at(-1)).toBeLessThanOrEqual(100 + 1e-9);
    const step = ticks[1]! - ticks[0]!;
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i]! - ticks[i - 1]!).toBeCloseTo(step, 9);
    }
  });

  it('couvre un domaine négatif sans planter', () => {
    const ticks = computeTicks([-19743.43, 0], 4);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((t) => Number.isFinite(t))).toBe(true);
  });

  it('n’ omet ni ne duplique la dernière graduation par erreur flottante (0.1 + 0.2)', () => {
    const ticks = computeTicks([0, 1], 10);
    const unique = new Set(ticks.map((t) => t.toFixed(6)));
    expect(unique.size).toBe(ticks.length);
  });
});

describe('domainIncludingZero', () => {
  it('inclut toujours 0, même pour des valeurs toutes positives', () => {
    expect(domainIncludingZero([3, 10, 7])).toEqual([0, 10]);
  });

  it('inclut toujours 0, même pour des valeurs toutes négatives', () => {
    expect(domainIncludingZero([-5, -2, -9])).toEqual([-9, 0]);
  });

  it('couvre les valeurs positives et négatives', () => {
    expect(domainIncludingZero([-4, 6, -1, 2])).toEqual([-4, 6]);
  });

  it('[0, 0] pour un tableau vide', () => {
    expect(domainIncludingZero([])).toEqual([0, 0]);
  });

  it('ne dépasse pas la limite d’arguments d’un appel pour un très grand tableau', () => {
    const values = Array.from({ length: 200_000 }, (_, i) => (i % 2 === 0 ? i : -i));
    expect(() => domainIncludingZero(values)).not.toThrow();
    expect(domainIncludingZero(values)).toEqual([-199_999, 199_998]);
  });
});

describe('padDomain', () => {
  it('élargit le domaine de part et d’autre', () => {
    expect(padDomain([100, 200], 0.1)).toEqual([90, 210]);
  });

  it('garde une courbe loin de zéro dans la zone visible', () => {
    const [min, max] = padDomain([23565.8, 24850.3]);
    expect(min).toBeGreaterThan(23000);
    expect(max).toBeLessThan(25000);
    expect(min).toBeLessThan(23565.8);
    expect(max).toBeGreaterThan(24850.3);
  });

  it('ouvre un intervalle autour d’un domaine dégénéré', () => {
    expect(padDomain([5, 5])).toEqual([4.5, 5.5]);
    expect(padDomain([0, 0])).toEqual([-1, 1]);
  });
});
