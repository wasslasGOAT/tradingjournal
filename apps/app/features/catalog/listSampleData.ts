import { toTradingDay } from '@repo/core';
import type { TradingDay } from '@repo/core';

/** Générateur pseudo-aléatoire déterministe (mulberry32) — même raison que `chartSampleData.ts`. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYMBOLS = [
  'EURUSD',
  'GBPUSD',
  'XAUUSD',
  'NAS100',
  'US30',
  'BTCUSD',
  'AAPL',
  'TSLA',
  'CADJPY',
  'SPX500',
] as const;

export interface SampleTradeRow {
  readonly id: string;
  readonly symbol: string;
  readonly direction: 'long' | 'short';
  /** Chaîne décimale (ADR-005) — convertie par `@repo/core#parseAmount` à l'affichage. */
  readonly pnl: string;
  readonly day: TradingDay;
}

/**
 * `count` trades factices, groupés ~40/jour (M1-5 : « démo avec 1 000 lignes
 * factices dans le catalogue »). Déterministe (graine fixe).
 */
export function generateSampleTrades(count: number): readonly SampleTradeRow[] {
  const random = mulberry32(123);
  const trades: SampleTradeRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const symbol = SYMBOLS[Math.floor(random() * SYMBOLS.length)] ?? SYMBOLS[0];
    const direction: 'long' | 'short' = random() < 0.5 ? 'long' : 'short';
    const isWin = random() < 0.45;
    const pnl = isWin ? random() * 600 + 20 : -(random() * 400 + 10);
    const dayOffset = Math.floor(i / 40);
    const date = new Date(Date.UTC(2026, 0, 1) + dayOffset * 86_400_000);
    trades.push({
      id: `sample-trade-${i}`,
      symbol,
      direction,
      pnl: pnl.toFixed(2),
      day: toTradingDay(date.toISOString().slice(0, 10)),
    });
  }
  return trades;
}

export interface SampleTradeSection {
  readonly id: string;
  readonly day: TradingDay;
  readonly data: readonly SampleTradeRow[];
}

/** Regroupe des trades déjà triés par `day` en sections (une par jour) — pour `VirtualizedList`. */
export function groupSampleTradesByDay(
  trades: readonly SampleTradeRow[],
): readonly SampleTradeSection[] {
  const byDay: SampleTradeRow[][] = [];
  for (const trade of trades) {
    const last = byDay.at(-1);
    if (last && last[0]?.day === trade.day) {
      last.push(trade);
    } else {
      byDay.push([trade]);
    }
  }
  return byDay.map((data) => ({ id: data[0]!.day, day: data[0]!.day, data }));
}
