import { describe, expect, it } from 'vitest';

import { colorVarNames, pnlVarNames, themes } from '../tokens';
import { buildThemeVars, resolveThemeMode } from './themeMode';

describe('resolveThemeMode', () => {
  it('suit le thème système quand la préférence est "system"', () => {
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
  });

  it('retombe sur sombre si le thème système est inconnu (ADR-012, défaut sombre)', () => {
    expect(resolveThemeMode('system', null)).toBe('dark');
    expect(resolveThemeMode('system', undefined)).toBe('dark');
  });

  it('force le thème choisi quel que soit le système', () => {
    expect(resolveThemeMode('light', 'dark')).toBe('light');
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
  });
});

describe('buildThemeVars', () => {
  it('pose une variable CSS par token de couleur et par intention P&L', () => {
    const result = buildThemeVars('dark', 'blueGray');
    expect(Object.keys(result).sort()).toEqual(
      [...Object.values(colorVarNames), ...Object.values(pnlVarNames)].sort(),
    );
  });

  it('reflète les valeurs du thème et du schéma P&L demandés', () => {
    const result = buildThemeVars('light', 'greenRed');
    expect(result[colorVarNames.background]).toBe(themes.light.background);
    expect(result[colorVarNames.accent]).toBe(themes.light.accent);
  });

  it('change instantanément de valeurs quand le thème ou le schéma change', () => {
    const dark = buildThemeVars('dark', 'blueGray');
    const light = buildThemeVars('light', 'blueGray');
    expect(dark[colorVarNames.background]).not.toBe(light[colorVarNames.background]);

    const blueGray = buildThemeVars('dark', 'blueGray');
    const greenRed = buildThemeVars('dark', 'greenRed');
    expect(blueGray[pnlVarNames.profit]).not.toBe(greenRed[pnlVarNames.profit]);
  });
});
