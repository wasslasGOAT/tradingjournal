/**
 * Tests golden (ARCHITECTURE §5.4, ROADMAP M3-8) : recalcule tout depuis les
 * exécutions brutes du fixture (`fixture.json`, généré par `build.mjs`) via
 * les fonctions publiques de `@repo/core`, et vérifie que chaque chiffre de
 * référence du ROADMAP tombe exactement (au centime, ou au pourcentage
 * arrondi indiqué). Aucun chiffre n'est recopié du fixture : tout est
 * recalculé ici (regroupement -> P&L -> jour de trading -> stats -> agrégats).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  aggregateByTradingDay,
  aggregateByWeek,
  classifySession,
  computeAverageRatio,
  computeBalance,
  computeMonthStats,
  computeNetPnl,
  computeProfitFactor,
  computeReturnRate,
  computeWinLossCounts,
  computeWinRate,
  Decimal,
  equityCurveByDay,
  formatPercent,
  groupExecutionsIntoTrades,
  parseAmount,
  tradingDayOf,
} from '../../src/index';
import type { ExecutionInput, InstrumentContractInfo, TradeRecord } from '../../src/index';

interface FixtureExecution {
  readonly id: string;
  readonly account_id: string;
  readonly instrument_id: string;
  readonly side: 'buy' | 'sell';
  readonly quantity: string;
  readonly price: string;
  readonly commission: string;
  readonly fees: string;
  readonly executed_at: string;
  readonly sequence: number;
}

interface Fixture {
  readonly account: {
    readonly id: string;
    readonly currency: string;
    readonly starting_balance: string;
    readonly timezone: string;
    readonly day_rollover_time: string;
    readonly grouping_method: 'fifo' | 'average';
  };
  readonly instruments: ReadonlyArray<{
    readonly id: string;
    readonly symbol: string;
    readonly contract_multiplier: string;
    readonly quote_ccy: string;
  }>;
  readonly executions: readonly FixtureExecution[];
  readonly cash_movements: readonly unknown[];
  readonly trade_swaps: ReadonlyArray<{
    readonly entry_execution_id: string;
    readonly swap: string;
  }>;
}

const fixturePath = fileURLToPath(new URL('./fixture.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as Fixture;

const startingBalance = parseAmount(fixture.account.starting_balance);

const instruments = new Map<string, InstrumentContractInfo>(
  fixture.instruments.map((i) => [
    i.id,
    { contractMultiplier: parseAmount(i.contract_multiplier), quoteCurrency: i.quote_ccy },
  ]),
);

/** `instrument_id` (UUID) -> `symbol` normalisé (DATA_MODEL `instruments.symbol`), voir `TradeRecord.symbol`. */
const symbolByInstrumentId = new Map(fixture.instruments.map((i) => [i.id, i.symbol]));

const executions: ExecutionInput[] = fixture.executions.map((e) => ({
  id: e.id,
  accountId: e.account_id,
  instrumentId: e.instrument_id,
  side: e.side,
  quantity: parseAmount(e.quantity),
  price: parseAmount(e.price),
  commission: parseAmount(e.commission),
  fees: parseAmount(e.fees),
  executedAt: new Date(e.executed_at),
  sequence: e.sequence,
}));

const groupedTrades = groupExecutionsIntoTrades(
  executions,
  instruments,
  fixture.account.grouping_method,
  fixture.account.currency,
);

/**
 * Swap par trade (voir `build.mjs` — DATA_MODEL : `swap` est une colonne de
 * `trades`, pas d'`executions`), ancré sur l'id de l'**exécution d'entrée**
 * de chaque trade (`executionIds[0]`, stable indépendamment du fuseau/de
 * l'horodatage — contrairement à un appariement `(instrument, opened_at)`).
 */
const swapByEntryExecutionId = new Map(
  fixture.trade_swaps.map((s) => [s.entry_execution_id, parseAmount(s.swap)]),
);

const trades: TradeRecord[] = groupedTrades.map((g, index) => {
  const entryExecutionId = g.executionIds[0];
  const swap =
    (entryExecutionId !== undefined ? swapByEntryExecutionId.get(entryExecutionId) : undefined) ??
    new Decimal(0);
  const netPnl = computeNetPnl(g.grossPnl, g.commission, g.fees, swap);
  const referenceInstant = g.closedAt ?? g.openedAt;
  return {
    id: `trade-${index}`,
    accountId: g.accountId,
    currency: fixture.account.currency,
    symbol: symbolByInstrumentId.get(g.instrumentId) ?? g.instrumentId,
    direction: g.direction,
    status: g.status,
    openedAt: g.openedAt,
    closedAt: g.closedAt,
    tradingDay: tradingDayOf(
      referenceInstant,
      fixture.account.timezone,
      fixture.account.day_rollover_time,
    ),
    grossPnl: g.grossPnl,
    netPnl,
    rMultiple: null,
    commission: g.commission,
    fees: g.fees,
    quantity: g.quantity,
    session: classifySession(g.openedAt),
  };
});

const marchTrades = trades.filter((t) => t.tradingDay.startsWith('2026-03'));
const aprilTrades = trades.filter((t) => t.tradingDay.startsWith('2026-04'));

describe('fixture golden — regroupement des exécutions', () => {
  it('25 trades, tous clos (round-trips complets)', () => {
    expect(trades).toHaveLength(25);
    expect(trades.every((t) => t.status === 'closed')).toBe(true);
  });

  it('24 trades en mars, 1 le 1er avril', () => {
    expect(marchTrades).toHaveLength(24);
    expect(aprilTrades).toHaveLength(1);
  });

  it('le trade traversant le changement d’heure du 29 mars est résolu sur le bon jour de trading', () => {
    const dstTrade = trades.find(
      (t) => t.symbol === 'GBPUSD' && t.openedAt.toISOString() === '2026-03-29T00:30:00.000Z',
    );
    expect(dstTrade).toBeDefined();
    // 00:30 UTC = 01:30 CET (avant le saut) ; 02:30 UTC = 04:30 CEST (après) : les deux
    // exécutions tombent le même jour civil local (29 mars), bascule à 00:00 -> même trading_day.
    expect(dstTrade?.tradingDay).toBe('2026-03-29');
  });

  it('le trade avec commission/frais/swap non nuls retombe exactement sur le P&L net attendu', () => {
    const feeTrade = trades.find(
      (t) => t.symbol === 'GBPUSD' && t.openedAt.toISOString() === '2026-03-30T13:00:00.000Z',
    );
    expect(feeTrade).toBeDefined();
    expect(feeTrade?.commission.toFixed(2)).toBe('50.00');
    expect(feeTrade?.fees.toFixed(2)).toBe('20.00');
    expect(feeTrade?.netPnl.toFixed(2)).toBe('-2277.71');
  });

  it('symboles variés utilisés (GBPUSD, EURUSD, XAUUSD, NAS100)', () => {
    const symbols = new Set(trades.map((t) => t.symbol));
    expect([...symbols].sort()).toEqual(['EURUSD', 'GBPUSD', 'NAS100', 'XAUUSD']);
  });
});

describe('fixture golden — chiffres de référence ROADMAP M3', () => {
  it('P&L net total = -19743.43, solde = 180256.57, rendement = -9.87 %', () => {
    const netPnls = trades.map((t) => t.netPnl);
    const balance = computeBalance(startingBalance, netPnls, []);
    expect(balance.toFixed(2)).toBe('180256.57');

    const returnRate = computeReturnRate(startingBalance, netPnls);
    // U+00A0 (espace insécable) avant "%" en FR, voir `packages/core/format`.
    expect(formatPercent(returnRate, { locale: 'fr', decimals: 2 })).toBe('−9,87 %');
  });

  it('mars 2026 : 24 trades, P&L -17527.71', () => {
    const marchNet = marchTrades.reduce((acc, t) => acc.plus(t.netPnl), new Decimal(0));
    expect(marchNet.toFixed(2)).toBe('-17527.71');
  });

  it('1er avril : -2215.72', () => {
    expect(aprilTrades[0]?.netPnl.toFixed(2)).toBe('-2215.72');
  });

  it('4 gagnants / 21 perdants sur 25 trades -> win rate 16 %', () => {
    const counts = computeWinLossCounts(trades);
    expect(counts).toEqual({ wins: 4, losses: 21, breakeven: 0, total: 25 });
    expect(formatPercent(computeWinRate(trades) as Decimal, { locale: 'fr', decimals: 0 })).toBe(
      '16 %',
    );
  });

  it('profit factor arrondi 0.56, ratio moyen arrondi 2.92', () => {
    const pf = computeProfitFactor(trades);
    expect(pf.reason).toBeNull();
    expect(pf.value?.toDecimalPlaces(2).toFixed(2)).toBe('0.56');
    // bornes du ROADMAP : PF in [0.5552, 0.5571)
    expect(pf.value?.greaterThanOrEqualTo('0.5552')).toBe(true);
    expect(pf.value?.lessThan('0.5571')).toBe(true);
    expect(pf.grossWins.toFixed(2)).toBe('24750.00');
    expect(pf.grossLosses.toFixed(2)).toBe('44493.43');

    const ratio = computeAverageRatio(trades);
    expect(ratio?.toDecimalPlaces(2).toFixed(2)).toBe('2.92');
  });

  it('pire jour = 30 mars 2026 (perte plus grande que tout autre jour, y compris le 1er avril)', () => {
    const days = aggregateByTradingDay(startingBalance, trades);
    const marchDays = days.filter((d) => d.tradingDay.startsWith('2026-03'));
    const monthStats = computeMonthStats(marchDays);

    expect(monthStats.tradesCount).toBe(24);
    expect(monthStats.winningDays).toBe(3);
    expect(monthStats.losingDays).toBe(7);
    expect(monthStats.netPnl.toFixed(2)).toBe('-17527.71');
    expect(monthStats.worstDay?.tradingDay).toBe('2026-03-30');
    expect(monthStats.worstDay?.netPnl.toFixed(2)).toBe('-12277.71');

    const worstOverall = [...days].sort((a, b) => a.netPnl.comparedTo(b.netPnl))[0];
    expect(worstOverall?.tradingDay).toBe('2026-03-30');
    expect(worstOverall?.netPnl.lessThan(monthStats.worstDay!.netPnl.plus(0))).toBe(false); // même jour, même valeur
  });

  it('marge restante « perte max 10 % du solde initial » = 256.57 (règle ROADMAP M8, calculée ici depuis le solde initial, pas depuis un pic intermédiaire)', () => {
    const finalBalance = computeBalance(
      startingBalance,
      trades.map((t) => t.netPnl),
      [],
    );
    const totalLoss = startingBalance.minus(finalBalance); // perte totale (positive) depuis le solde initial
    const maxLossAllowed = startingBalance.times('0.10');
    const remainingMargin = maxLossAllowed.minus(totalLoss);
    expect(remainingMargin.toFixed(2)).toBe('256.57');
  });

  it('solde de fin de compte cohérent avec la courbe d’equity par jour', () => {
    const days = aggregateByTradingDay(startingBalance, trades);
    const curve = equityCurveByDay(startingBalance, days);
    const lastPoint = curve[curve.length - 1];
    expect(lastPoint?.balance.toFixed(2)).toBe('180256.57');
    // Aucun mouvement de trésorerie dans ce fixture (revue M3 #8) : les deux séries coïncident.
    expect(lastPoint?.tradingEquity.toFixed(2)).toBe('180256.57');
  });

  it('totaux hebdomadaires : la somme des semaines de mars retombe sur le P&L du mois', () => {
    const days = aggregateByTradingDay(startingBalance, trades).filter((d) =>
      d.tradingDay.startsWith('2026-03'),
    );
    const weeks = aggregateByWeek(days, 1);
    const weeklyTotal = weeks.reduce((acc, w) => acc.plus(w.netPnl), new Decimal(0));
    expect(weeklyTotal.toFixed(2)).toBe('-17527.71');
  });
});
