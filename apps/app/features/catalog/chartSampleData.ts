import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';
import type { ChartBarDatum, ChartHeatmapCell } from '@repo/ui';

/**
 * Données factices des sections `Chart`/`VirtualizedList` du catalogue
 * (M1-6/M1-5). Générateurs déterministes (petit générateur pseudo-aléatoire à
 * graine fixe, pas `Math.random`) : le catalogue doit rendre le même
 * graphique à chaque ouverture (revues visuelles, captures d'écran stables).
 */

/** Générateur pseudo-aléatoire déterministe (mulberry32) — `seed` fixe -> même séquence à chaque appel. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SAMPLE_CHART_CURRENCY = 'USD';

/** 180 jours (~6 mois) — « jeu de données long » pour la démo ligne/aire du catalogue. */
export const SAMPLE_LONG_EQUITY_DAYS: readonly TradingDay[] = Array.from(
  { length: 180 },
  (_, index) => {
    const date = new Date(Date.UTC(2026, 2, 1) + index * 86_400_000);
    return toTradingDay(date.toISOString().slice(0, 10));
  },
);

function generateEquityPoints(): readonly { readonly x: number; readonly y: number }[] {
  const random = mulberry32(42);
  let balance = 20000;
  const points = [{ x: 0, y: balance }];
  for (let day = 1; day < SAMPLE_LONG_EQUITY_DAYS.length; day += 1) {
    // Dérive légèrement positive (edge du trader) + bruit, pour une courbe plausible.
    const noise = (random() - 0.42) * 420;
    balance = Math.max(balance + noise, 5000);
    points.push({ x: day, y: Math.round(balance * 100) / 100 });
  }
  return points;
}

export const SAMPLE_LONG_EQUITY_POINTS = generateEquityPoints();

/** P&L par symbole (barres) — mixte positif/négatif pour montrer la coloration par intention. */
export const SAMPLE_PNL_BY_SYMBOL: readonly ChartBarDatum[] = [
  { x: 'EURUSD', y: 842.3, intent: 'profit' },
  { x: 'NAS100', y: -318.7, intent: 'loss' },
  { x: 'GBPUSD', y: 214.1, intent: 'profit' },
  { x: 'XAUUSD', y: 605.9, intent: 'profit' },
  { x: 'US30', y: -142.4, intent: 'loss' },
  { x: 'BTCUSD', y: -486.2, intent: 'loss' },
  { x: 'AAPL', y: 96.5, intent: 'profit' },
  { x: 'CADJPY', y: -58.9, intent: 'loss' },
];

/** ~500 R multiples factices (distribution asymétrique typique) pour l'histogramme — via `binNumericValues` (`@repo/ui`). */
export function generateSampleRMultiples(): readonly number[] {
  const random = mulberry32(7);
  const values: number[] = [];
  for (let i = 0; i < 500; i += 1) {
    // Mélange pertes fréquentes/petites et gains plus rares/plus larges (asymétrie usuelle d'un edge positif).
    const isWin = random() < 0.38;
    const magnitude = isWin ? random() * 4.5 + 0.2 : -(random() * 1.6 + 0.1);
    values.push(Math.round(magnitude * 100) / 100);
  }
  return values;
}

const WEEKDAY_COUNT = 5; // lun-ven (marché)
const HOUR_COUNT = 24;

/** Heatmap heure × jour de semaine — plus d'activité en session Londres/New York (8h-16h). */
export function generateSampleHeatmapCells(): readonly ChartHeatmapCell[] {
  const random = mulberry32(99);
  const cells: ChartHeatmapCell[] = [];
  for (let weekday = 0; weekday < WEEKDAY_COUNT; weekday += 1) {
    for (let hour = 0; hour < HOUR_COUNT; hour += 1) {
      const inSession = hour >= 8 && hour <= 16;
      const activity = inSession ? random() : random() * 0.2;
      if (activity < 0.08) continue;
      const sign = random() < 0.6 ? 1 : -1;
      cells.push({ row: weekday, col: hour, value: Math.round(sign * activity * 480) });
    }
  }
  return cells;
}

export const SAMPLE_HEATMAP_ROWS = WEEKDAY_COUNT;
export const SAMPLE_HEATMAP_COLS = HOUR_COUNT;
