import { describe, expect, it } from 'vitest';

import { colorVarNames, pnlColorSchemes, pnlVarNames, themes } from './tokens';

describe('tokens', () => {
  it('dark et light exposent exactement les mêmes clés de couleur', () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it('chaque clé de couleur a un nom de variable CSS associé', () => {
    expect(Object.keys(colorVarNames).sort()).toEqual(Object.keys(themes.dark).sort());
  });

  it('blueGray et greenRed exposent les mêmes intentions P&L, dans les deux thèmes', () => {
    for (const mode of ['dark', 'light'] as const) {
      expect(Object.keys(pnlColorSchemes[mode].blueGray).sort()).toEqual(
        Object.keys(pnlColorSchemes[mode].greenRed).sort(),
      );
      expect(Object.keys(pnlColorSchemes[mode].blueGray).sort()).toEqual(
        Object.keys(pnlVarNames).sort(),
      );
    }
  });
});
