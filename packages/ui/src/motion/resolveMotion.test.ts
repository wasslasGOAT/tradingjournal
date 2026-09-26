import { describe, expect, it } from 'vitest';

import { animation } from '../tokens';
import { resolveDuration, resolveEasingPoints, resolveSpringConfig } from './resolveMotion';
import type { DurationToken, EasingToken, SpringToken } from './types';

// Garde les jetons littéraux (`types.ts`) synchronisés avec les données réelles
// (`tokens.data.cjs`) : casse si un jeton est renommé/retiré côté données sans
// mise à jour de `DurationToken`/`EasingToken`/`SpringToken`.
const DURATION_TOKENS: DurationToken[] = ['fast', 'base', 'slow'];
const EASING_TOKENS: EasingToken[] = ['standard', 'decelerate', 'accelerate'];
const SPRING_TOKENS: SpringToken[] = ['default', 'snappy', 'gentle'];

// `animation.duration`/`.spring` sont typés `Record<string, ...>` côté données brutes
// (`tokens.data.d.cts`) : ces accesseurs évitent le `| undefined` de
// `noUncheckedIndexedAccess` ici, la présence des clés étant déjà couverte ci-dessus.
function expectedDuration(token: DurationToken): number {
  const value = animation.duration[token];
  if (value === undefined) throw new Error(`Jeton de durée manquant : ${token}`);
  return value;
}
function expectedSpring(token: SpringToken): { damping: number; stiffness: number; mass: number } {
  const value = animation.spring[token];
  if (value === undefined) throw new Error(`Jeton de ressort manquant : ${token}`);
  return value;
}
function expectedEasingPoints(token: EasingToken): readonly [number, number, number, number] {
  const value = animation.easing[token];
  if (value === undefined) throw new Error(`Jeton d’easing manquant : ${token}`);
  return value;
}

describe('resolveMotion — jetons connus vs données réelles', () => {
  it('DurationToken couvre exactement les clés de animation.duration', () => {
    expect(DURATION_TOKENS.slice().sort()).toEqual(Object.keys(animation.duration).sort());
  });

  it('EasingToken couvre exactement les clés de animation.easing', () => {
    expect(EASING_TOKENS.slice().sort()).toEqual(Object.keys(animation.easing).sort());
  });

  it('SpringToken couvre exactement les clés de animation.spring', () => {
    expect(SPRING_TOKENS.slice().sort()).toEqual(Object.keys(animation.spring).sort());
  });
});

describe('resolveDuration', () => {
  it('renvoie la durée du jeton quand le mouvement n’est pas réduit', () => {
    for (const token of DURATION_TOKENS) {
      expect(resolveDuration(token, false)).toBe(expectedDuration(token));
    }
  });

  it('renvoie 0 pour chaque jeton quand le mouvement est réduit', () => {
    for (const token of DURATION_TOKENS) {
      expect(resolveDuration(token, true)).toBe(0);
    }
  });
});

describe('resolveSpringConfig', () => {
  it('renvoie la config du jeton quand le mouvement n’est pas réduit', () => {
    for (const token of SPRING_TOKENS) {
      expect(resolveSpringConfig(token, false)).toEqual(expectedSpring(token));
    }
  });

  it('renvoie null pour chaque jeton quand le mouvement est réduit', () => {
    for (const token of SPRING_TOKENS) {
      expect(resolveSpringConfig(token, true)).toBeNull();
    }
  });
});

describe('resolveEasingPoints', () => {
  it('renvoie les 4 points de la courbe de Bézier du jeton', () => {
    for (const token of EASING_TOKENS) {
      expect(resolveEasingPoints(token)).toEqual(expectedEasingPoints(token));
    }
  });
});

// `resolveEasing`/`resolveTimingConfig` (`./easing.ts`) importent `react-native-reanimated`,
// qui ne se charge pas sous Vitest/Node (voir note de tête de `resolveMotion.ts`) : non
// testés ici, vérifiés par le typecheck + les builds natifs/web.
