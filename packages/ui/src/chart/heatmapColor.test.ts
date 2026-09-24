import { describe, expect, it } from 'vitest';

import { pnlColorSchemes } from '../tokens';
import {
  computeHeatmapIntensity,
  computeMaxAbsValue,
  resolveHeatmapCellColor,
} from './heatmapColor';

const pnl = pnlColorSchemes.dark.blueGray;

describe('computeHeatmapIntensity', () => {
  it('0 si value === 0 (case vide)', () => {
    expect(computeHeatmapIntensity(0, 100)).toBe(0);
  });

  it('0 si maxAbsValue === 0 (aucune division par zéro)', () => {
    expect(computeHeatmapIntensity(5, 0)).toBe(0);
  });

  it('alpha minimal non nul pour une petite valeur non nulle', () => {
    const intensity = computeHeatmapIntensity(0.001, 1000);
    expect(intensity).toBeGreaterThan(0);
    expect(intensity).toBeCloseTo(0.12, 5);
  });

  it('intensité maximale (1) pour |value| === maxAbsValue', () => {
    expect(computeHeatmapIntensity(100, 100)).toBe(1);
    expect(computeHeatmapIntensity(-100, 100)).toBe(1);
  });

  it('plafonne à 1 si |value| > maxAbsValue', () => {
    expect(computeHeatmapIntensity(500, 100)).toBe(1);
  });
});

describe('resolveHeatmapCellColor', () => {
  it('utilise la teinte profit pour une valeur positive', () => {
    const color = resolveHeatmapCellColor(50, 100, pnl);
    expect(color).toContain('rgba(');
  });

  it('des valeurs de signe opposé donnent des couleurs différentes', () => {
    const profitColor = resolveHeatmapCellColor(50, 100, pnl);
    const lossColor = resolveHeatmapCellColor(-50, 100, pnl);
    expect(profitColor).not.toBe(lossColor);
  });

  it('value === 0 -> couleur flat, alpha faible', () => {
    const color = resolveHeatmapCellColor(0, 100, pnl);
    expect(color).toContain('0.08');
  });
});

describe('computeMaxAbsValue', () => {
  it('0 pour un tableau vide', () => {
    expect(computeMaxAbsValue([])).toBe(0);
  });

  it('valeur absolue maximale, signe indifférent', () => {
    expect(computeMaxAbsValue([3, -50, 12, -7])).toBe(50);
  });
});
