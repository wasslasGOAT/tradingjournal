import { describe, expect, it } from 'vitest';

import { pnlColorSchemes, themes } from './tokens';

describe('tokens', () => {
  it('dark et light exposent exactement les mêmes clés de couleur', () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it('blueGray et greenRed exposent les mêmes intentions P&L', () => {
    expect(Object.keys(pnlColorSchemes.blueGray).sort()).toEqual(
      Object.keys(pnlColorSchemes.greenRed).sort(),
    );
  });
});
