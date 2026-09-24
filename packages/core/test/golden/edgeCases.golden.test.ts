/**
 * Second fixture golden « cas limites » (revue M3 #13) — complète
 * `golden.test.ts`/ROADMAP M3-8 (round-trips simples, un seul jour de
 * grouping_method) sans y toucher : sorties partielles, inversion, trade
 * ouvert, trade à 0 (FIFO et moyenne pondérée), R multiple, dépôt/retrait,
 * trade traversant une bascule non-minuit, deux exécutions à la même
 * seconde.
 *
 * Comme `golden.test.ts`, tout est recalculé ici depuis les exécutions
 * brutes via les fonctions publiques de `@repo/core` — mais ici, **chaque
 * valeur attendue est calculée à la main ci-dessous (commentée), jamais
 * recopiée du fixture ni du code de `packages/core`** (revue M3 #13).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  aggregateByTradingDay,
  computeBalance,
  computeMonthStats,
  computeNetPnl,
  computeRMultiple,
  computeReturnRate,
  Decimal,
  equityCurveByDay,
  groupExecutionsIntoTrades,
  parseAmount,
  signedCashMovementAmount,
  tradingDayOf,
} from '../../src/index';
import type {
  CashMovementInput,
  ExecutionInput,
  InstrumentContractInfo,
  TradeRecord,
} from '../../src/index';
import type { ResolvedCashMovement } from '../../src/aggregates/day';
import { classifySession } from '../../src/time';

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
  readonly sequence?: number;
}

interface FixtureCashMovement {
  readonly account_id: string;
  readonly type: 'deposit' | 'withdrawal' | 'payout' | 'fee' | 'adjustment';
  readonly amount: string;
  readonly occurred_at: string;
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
  readonly cash_movements: readonly FixtureCashMovement[];
}

const fixturePath = fileURLToPath(new URL('./edgeCases.fixture.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as Fixture;

const startingBalance = parseAmount(fixture.account.starting_balance); // 50000

const instruments = new Map<string, InstrumentContractInfo>(
  fixture.instruments.map((i) => [
    i.id,
    { contractMultiplier: parseAmount(i.contract_multiplier), quoteCurrency: i.quote_ccy },
  ]),
);
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

/** R multiple : renseigné seulement sur le trade A (« partial-exits »), risque initial choisi à la main = 2000. */
const INITIAL_RISK_BY_SYMBOL_AND_OPEN_HOUR: Record<string, string> = {
  'EURUSD|2026-02-02T14:00:00.000Z': '2000',
};

const trades: TradeRecord[] = groupedTrades.map((g, index) => {
  const symbol = symbolByInstrumentId.get(g.instrumentId) ?? g.instrumentId;
  const netPnl = computeNetPnl(g.grossPnl, g.commission, g.fees);
  const referenceInstant = g.closedAt ?? g.openedAt;
  const riskKey = `${symbol}|${g.openedAt.toISOString()}`;
  const initialRisk = INITIAL_RISK_BY_SYMBOL_AND_OPEN_HOUR[riskKey];
  return {
    id: `edge-trade-${index}`,
    accountId: g.accountId,
    currency: fixture.account.currency,
    symbol,
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
    rMultiple: initialRisk ? computeRMultiple(netPnl, new Decimal(initialRisk)) : null,
    commission: g.commission,
    fees: g.fees,
    quantity: g.quantity,
    session: classifySession(g.openedAt),
  };
});

function findTrade(symbol: string, openedAtIso: string): TradeRecord {
  const trade = trades.find((t) => t.symbol === symbol && t.openedAt.toISOString() === openedAtIso);
  if (!trade) throw new Error(`Trade introuvable pour l'assertion (${symbol} @ ${openedAtIso}).`);
  return trade;
}

/** `avgEntry`/`avgExit` ne vivent que sur {@link GroupedTrade} (pas {@link TradeRecord}, plus proche de DATA_MODEL `trades`). */
function findGroupedTrade(symbol: string, openedAtIso: string) {
  const trade = groupedTrades.find(
    (g) =>
      (symbolByInstrumentId.get(g.instrumentId) ?? g.instrumentId) === symbol &&
      g.openedAt.toISOString() === openedAtIso,
  );
  if (!trade)
    throw new Error(`GroupedTrade introuvable pour l'assertion (${symbol} @ ${openedAtIso}).`);
  return trade;
}

describe('fixture golden « cas limites » — regroupement', () => {
  it('7 GroupedTrades au total : 6 clos + 1 ouvert', () => {
    expect(groupedTrades).toHaveLength(7);
    expect(groupedTrades.filter((g) => g.status === 'closed')).toHaveLength(6);
    expect(groupedTrades.filter((g) => g.status === 'open')).toHaveLength(1);
  });

  it('A. sorties partielles (EURUSD) : grossPnl = 4*(1.105-1.10)*100000 + 6*(1.11-1.10)*100000 = 2000 + 6000 = 8000', () => {
    const trade = findTrade('EURUSD', '2026-02-02T14:00:00.000Z');
    const grouped = findGroupedTrade('EURUSD', '2026-02-02T14:00:00.000Z');
    expect(trade.status).toBe('closed');
    expect(trade.quantity.toString()).toBe('10');
    expect(grouped.avgEntry.toString()).toBe('1.1'); // (10*1.10000)/10
    expect(grouped.avgExit?.toString()).toBe('1.108'); // (4*1.105+6*1.11)/10 = 11.08/10
    expect(trade.grossPnl.toString()).toBe('8000');
    expect(trade.netPnl.toString()).toBe('8000'); // pas de commission/frais
  });

  it('A. R multiple = netPnl / risque initial = 8000 / 2000 = 4', () => {
    const trade = findTrade('EURUSD', '2026-02-02T14:00:00.000Z');
    expect(trade.rMultiple?.toString()).toBe('4');
  });

  it('B. inversion (GBPUSD) : 2 trades, chacun +10000', () => {
    // Long : entrée 10@1.20000, sortie 10@1.21000 (les 10 premiers des 15 vendus) -> 10*(1.21-1.20)*100000 = 10000.
    const long = findTrade('GBPUSD', '2026-02-03T14:00:00.000Z');
    expect(long.status).toBe('closed');
    expect(long.direction).toBe('long');
    expect(long.quantity.toString()).toBe('10');
    expect(long.grossPnl.toString()).toBe('10000');

    // Short : ouvert par le reliquat de la vente de 15 (5 unités @1.21000), clôturé par l'achat de 5@1.19000.
    // gross = 5 * (entrée 1.21000 - sortie 1.19000) * 100000 = 5 * 0.02 * 100000 = 10000.
    const short = findTrade('GBPUSD', '2026-02-03T15:00:00.000Z');
    const shortGrouped = findGroupedTrade('GBPUSD', '2026-02-03T15:00:00.000Z');
    expect(short.status).toBe('closed');
    expect(short.direction).toBe('short');
    expect(short.quantity.toString()).toBe('5');
    expect(shortGrouped.avgEntry.toString()).toBe('1.21');
    expect(shortGrouped.avgExit?.toString()).toBe('1.19');
    expect(short.grossPnl.toString()).toBe('10000');
  });

  it('C. trade ouvert (XAUUSD) avec commission : status open, netPnl = 0 - 15 = -15', () => {
    const trade = findTrade('XAUUSD', '2026-02-04T14:00:00.000Z');
    expect(trade.status).toBe('open');
    expect(trade.quantity.toString()).toBe('3');
    expect(trade.commission.toString()).toBe('15');
    expect(trade.grossPnl.toString()).toBe('0'); // pas de sortie
    expect(trade.netPnl.toString()).toBe('-15');
  });

  it('D. trade à 0 net, FIFO (AUDUSD) : achat 2@0.65000, vente 2@0.65000 -> grossPnl = 0 exactement', () => {
    const trade = findTrade('AUDUSD', '2026-02-05T14:00:00.000Z');
    expect(trade.status).toBe('closed');
    expect(trade.grossPnl.toString()).toBe('0');
    expect(trade.netPnl.toString()).toBe('0');
  });

  it('D bis. le même trade à 0 net EN MOYENNE PONDÉRÉE (appel direct, hors fixture — grouping_method de ce compte est fifo)', () => {
    // Achat 1@10, achat 1@11 (prix moyen mélangé = (10+11)/2 = 10.5), vente 1@10, vente 1@11.
    // Notionnels : entrée totale = 10 + 11 = 21 ; sortie totale = 10 + 11 = 21.
    // grossPnl clôturé = (sortie - entrée) * signe * multiplicateur = (21 - 21) * 1 * 1 = 0, EXACTEMENT
    // (et non un résidu d'arrondi type "-1e-38" : voir revue M3 #1, `groupExecutions.ts` `finalizeTrade`).
    const instrumentId = 'zero-avg-instrument';
    const avgInstruments = new Map<string, InstrumentContractInfo>([
      [instrumentId, { contractMultiplier: new Decimal(1), quoteCurrency: 'USD' }],
    ]);
    const avgExecutions: ExecutionInput[] = [
      {
        id: 'e1',
        accountId: 'a',
        instrumentId,
        side: 'buy',
        quantity: new Decimal(1),
        price: new Decimal(10),
        commission: new Decimal(0),
        fees: new Decimal(0),
        executedAt: new Date('2026-01-01T09:00:00Z'),
      },
      {
        id: 'e2',
        accountId: 'a',
        instrumentId,
        side: 'buy',
        quantity: new Decimal(1),
        price: new Decimal(11),
        commission: new Decimal(0),
        fees: new Decimal(0),
        executedAt: new Date('2026-01-01T09:05:00Z'),
      },
      {
        id: 'e3',
        accountId: 'a',
        instrumentId,
        side: 'sell',
        quantity: new Decimal(1),
        price: new Decimal(10),
        commission: new Decimal(0),
        fees: new Decimal(0),
        executedAt: new Date('2026-01-01T09:10:00Z'),
      },
      {
        id: 'e4',
        accountId: 'a',
        instrumentId,
        side: 'sell',
        quantity: new Decimal(1),
        price: new Decimal(11),
        commission: new Decimal(0),
        fees: new Decimal(0),
        executedAt: new Date('2026-01-01T09:15:00Z'),
      },
    ];
    const [avgTrade] = groupExecutionsIntoTrades(avgExecutions, avgInstruments, 'average', 'USD');
    expect(avgTrade?.status).toBe('closed');
    expect(avgTrade?.avgEntry.toString()).toBe('10.5'); // (1*10 + 1*11) / 2
    expect(avgTrade?.grossPnl.toString()).toBe('0');
  });

  it("E. trade traversant une bascule non-minuit (17:00 America/New_York) : trading_day différent du jour civil d'ouverture", () => {
    const trade = findTrade('EURUSD', '2026-02-09T21:30:00.000Z');
    expect(trade.status).toBe('closed');
    // Ouverture 21:30 UTC = 16:30 local (avant la bascule 17:00) : jour civil 2026-02-09.
    // Clôture 22:30 UTC = 17:30 local (APRÈS la bascule 17:00) : trading_day = jour civil + 1 = 2026-02-10.
    expect(trade.tradingDay).toBe('2026-02-10');
    expect(trade.grossPnl.toString()).toBe('1000'); // 1 * (1.11 - 1.10) * 100000
  });

  it('F. deux exécutions à la même seconde, sans sequence : grossPnl final indépendant de leur ordre interne (notionnels exacts)', () => {
    // Notionnel d'entrée total = 8@1.05000 + 2@1.06000 = 8.4 + 2.12 = 10.52.
    // Notionnel de sortie total = 5@1.07000 + 5@1.08000 = 5.35 + 5.40 = 10.75.
    // grossPnl = (10.75 - 10.52) * 1 * 100000 = 0.23 * 100000 = 23000.
    const trade = findTrade('NZDUSD', '2026-02-11T14:00:00.000Z');
    expect(trade.status).toBe('closed');
    expect(trade.quantity.toString()).toBe('10');
    expect(trade.grossPnl.toString()).toBe('23000');
  });
});

describe('fixture golden « cas limites » — solde, rendement, agrégats (revue M3 #5, #6, #7, #8)', () => {
  // P&L net des 6 trades CLOS uniquement (le trade ouvert C est exclu, revue M3 #5) :
  // A 8000 + B_long 10000 + B_short 10000 + D 0 + E 1000 + F 23000 = 52000.
  const closedNetPnls = trades.filter((t) => t.status === 'closed').map((t) => t.netPnl);

  it('Σ netPnl des trades clos = 52000', () => {
    const total = closedNetPnls.reduce((acc, p) => acc.plus(p), new Decimal(0));
    expect(total.toString()).toBe('52000');
  });

  const cashMovementInputs: CashMovementInput[] = fixture.cash_movements.map((m) => ({
    type: m.type,
    amount: parseAmount(m.amount),
    occurredAt: new Date(m.occurred_at),
  }));

  it('solde = 50000 (initial) + 52000 (P&L clos) + 5000 (dépôt) - 2000 (retrait) = 105000', () => {
    const balance = computeBalance(startingBalance, closedNetPnls, cashMovementInputs);
    expect(balance.toString()).toBe('105000');
  });

  it('revue M3 #7 : rendement = Σ netPnl clos / solde initial = 52000 / 50000 = 1.04 (104 %), PAS (balance - solde initial) / solde initial (qui inclurait le dépôt/retrait)', () => {
    const returnRate = computeReturnRate(startingBalance, closedNetPnls);
    expect(returnRate.toString()).toBe('1.04');
  });

  const resolvedCashMovements: ResolvedCashMovement[] = fixture.cash_movements.map((m) => ({
    tradingDay: tradingDayOf(
      new Date(m.occurred_at),
      fixture.account.timezone,
      fixture.account.day_rollover_time,
    ),
    signedAmount: signedCashMovementAmount({
      type: m.type,
      amount: parseAmount(m.amount),
      occurredAt: new Date(m.occurred_at),
    }),
  }));

  it('revue M3 #8 : tradingEquity (52000 de P&L, sans trésorerie) diverge de balance (avec le dépôt/retrait)', () => {
    const days = aggregateByTradingDay(startingBalance, trades, resolvedCashMovements);
    const curve = equityCurveByDay(startingBalance, days);
    const last = curve[curve.length - 1];
    expect(last?.tradingEquity.toString()).toBe('102000'); // 50000 + 52000, sans le dépôt/retrait
    expect(last?.balance.toString()).toBe('105000'); // 50000 + 52000 + 5000 - 2000
  });

  it('revue M3 #6 : les jours cash-only (dépôt/retrait sans trade) sont ignorés du meilleur/pire jour et des compteurs winning/losing/breakevenDays', () => {
    const days = aggregateByTradingDay(startingBalance, trades, resolvedCashMovements);
    // Jours attendus (voir calcul de trading_day à la main, un par ligne) :
    // 2026-02-01 (dépôt seul, tradesCount 0), 2026-02-02 (A, +8000), 2026-02-03 (B x2, +20000),
    // 2026-02-05 (D, 0, VRAI breakeven), 2026-02-10 (E, +1000), 2026-02-11 (F, +23000),
    // 2026-02-15 (retrait seul, tradesCount 0).
    expect(days.map((d) => d.tradingDay)).toEqual([
      '2026-02-01',
      '2026-02-02',
      '2026-02-03',
      '2026-02-05',
      '2026-02-10',
      '2026-02-11',
      '2026-02-15',
    ]);
    const cashOnlyDays = days.filter(
      (d) => d.tradingDay === '2026-02-01' || d.tradingDay === '2026-02-15',
    );
    expect(cashOnlyDays.every((d) => d.tradesCount === 0 && d.netPnl.isZero())).toBe(true);

    const monthStats = computeMonthStats(days);
    // tradesCount total = 1(A) + 2(B) + 1(D) + 1(E) + 1(F) = 6 (le trade ouvert C n'y figure jamais, revue M3 #5).
    expect(monthStats.tradesCount).toBe(6);
    // SEUL 2026-02-05 (D, vrai trade à 0) doit compter en breakeven — pas les 2 jours cash-only,
    // qui ont aussi netPnl = 0 mais tradesCount = 0 (sans ce filtre, breakevenDays vaudrait 3).
    expect(monthStats.breakevenDays).toBe(1);
    expect(monthStats.winningDays).toBe(4); // 02-02, 02-03, 02-10, 02-11
    expect(monthStats.losingDays).toBe(0);
    // Pire jour = 2026-02-05 (0, vrai trade) — pas un jour cash-only, malgré le même netPnl.
    expect(monthStats.worstDay?.tradingDay).toBe('2026-02-05');
    expect(monthStats.worstDay?.netPnl.toString()).toBe('0');
    expect(monthStats.bestDay?.tradingDay).toBe('2026-02-11');
    expect(monthStats.bestDay?.netPnl.toString()).toBe('23000');
  });
});
