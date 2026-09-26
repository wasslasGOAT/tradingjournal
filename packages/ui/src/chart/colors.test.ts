import { describe, expect, it } from 'vitest';

import { pnlColorSchemes, themes } from '../tokens';
import { resolveChartColor, resolvePnlIntentFromNumber } from './colors';

const colors = themes.dark;
const pnl = pnlColorSchemes.dark.blueGray;

describe('resolveChartColor', () => {
  it('résout profit/loss/flat depuis la palette P&L active', () => {
    expect(resolveChartColor('profit', colors, pnl)).toBe(pnl.profit);
    expect(resolveChartColor('loss', colors, pnl)).toBe(pnl.loss);
    expect(resolveChartColor('flat', colors, pnl)).toBe(pnl.flat);
  });

  it('résout accent (défaut) et neutral depuis les tokens de thème', () => {
    expect(resolveChartColor('accent', colors, pnl)).toBe(colors.accent);
    expect(resolveChartColor(undefined, colors, pnl)).toBe(colors.accent);
    expect(resolveChartColor('neutral', colors, pnl)).toBe(colors.textMuted);
  });

  it('change de couleur avec le schéma P&L (bleu/gris vs vert/rouge)', () => {
    const greenRed = pnlColorSchemes.dark.greenRed;
    expect(resolveChartColor('profit', colors, greenRed)).toBe(greenRed.profit);
    expect(resolveChartColor('profit', colors, pnl)).not.toBe(greenRed.profit);
  });
});

describe('resolvePnlIntentFromNumber', () => {
  it('0 -> flat (jamais -0)', () => {
    expect(resolvePnlIntentFromNumber(0)).toBe('flat');
    expect(resolvePnlIntentFromNumber(-0)).toBe('flat');
  });

  it('positif -> profit, négatif -> loss', () => {
    expect(resolvePnlIntentFromNumber(12.5)).toBe('profit');
    expect(resolvePnlIntentFromNumber(-3)).toBe('loss');
  });
});
