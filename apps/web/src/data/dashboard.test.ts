import {
  aggregateByTradingDay,
  computeMonthStats,
  computeReturnRate,
  parseAmount,
  toTradingDay,
} from '@repo/core';
import { describe, expect, it } from 'vitest';

import { getDashboardSummary } from './dashboard';
import { SAMPLE_ACCOUNTS_META } from './sample/accountsSampleData';
import { sampleTradeRecordsForAccount } from './sample/tradesSampleData';

const SEPTEMBER_RANGE = { from: toTradingDay('2026-09-01'), to: toTradingDay('2026-09-19') };

describe('getDashboardSummary — filtre compte', () => {
  it("un compte précis n'agrège que ses propres trades", async () => {
    const [main, all] = await Promise.all([
      getDashboardSummary({ accountId: 'acc-demo-main', ...SEPTEMBER_RANGE }),
      getDashboardSummary({ accountId: 'all', ...SEPTEMBER_RANGE }),
    ]);

    expect(main.periodPnl.toFixed(2)).toBe('1167.00');
    // 'all' inclut le compte prop (netPnl > 0 sur la même période) : strictement supérieur.
    expect(all.periodPnl.greaterThan(main.periodPnl)).toBe(true);
  });

  it('compte inconnu : rejette (état erreur, jamais de donnée silencieusement vide)', async () => {
    await expect(
      getDashboardSummary({ accountId: 'acc-inconnu', ...SEPTEMBER_RANGE }),
    ).rejects.toThrow(/Compte inconnu/);
  });
});

describe('getDashboardSummary — filtre période', () => {
  it("changer la période change le P&L de période et le nombre de points d'equity", async () => {
    const week = await getDashboardSummary({
      accountId: 'acc-demo-main',
      from: toTradingDay('2026-09-01'),
      to: toTradingDay('2026-09-07'),
    });
    const month = await getDashboardSummary({
      accountId: 'acc-demo-main',
      ...SEPTEMBER_RANGE,
    });

    expect(week.equityPoints).toHaveLength(7);
    expect(month.equityPoints).toHaveLength(19);
    expect(week.periodPnl.equals(month.periodPnl)).toBe(false);
  });

  it('aucune activité sur la période -> hasActivity = false (état vide)', async () => {
    const summary = await getDashboardSummary({
      accountId: 'acc-demo-main',
      from: toTradingDay('2020-01-01'),
      to: toTradingDay('2020-01-05'),
    });
    expect(summary.hasActivity).toBe(false);
  });
});

describe('getDashboardSummary — P&L du jour en mode « Tous les comptes » (revue W-10)', () => {
  it('prend le netPnl du même jour civil pour tous les comptes, pas le dernier jour tradé de chaque compte séparément', async () => {
    // `acc-demo-prop` n'a aucun trade le 2026-09-10 (seul `acc-demo-main` en a
    // un) : avant la correction, `recentDayPnl` sommait le dernier jour tradé
    // *de chaque compte* dans la période — ici 09-10 pour `acc-demo-main` et
    // 09-09 pour `acc-demo-prop` (son dernier jour tradé <= 09-10) — un total
    // qui ne correspondait à aucun jour réel. `computeLastDayPnl` retient un
    // seul jour (le plus récent où au moins un compte a tradé, 09-10) et
    // somme le netPnl de ce même jour pour tous les comptes (`0` pour
    // `acc-demo-prop`, qui n'a pas tradé ce jour-là).
    const range = { from: toTradingDay('2026-09-01'), to: toTradingDay('2026-09-10') };
    const all = await getDashboardSummary({ accountId: 'all', ...range });
    const main = await getDashboardSummary({ accountId: 'acc-demo-main', ...range });

    expect(all.recentDayTradingDay).toBe(toTradingDay('2026-09-10'));
    expect(all.recentDayPnl.equals(main.recentDayPnl)).toBe(true);
    expect(all.recentDayPnl.toFixed(2)).toBe('156.60');
  });

  it('aucun trade sur la période -> `recentDayTradingDay` est `null` et `recentDayPnl` est `0`', async () => {
    const summary = await getDashboardSummary({
      accountId: 'acc-demo-main',
      from: toTradingDay('2020-01-01'),
      to: toTradingDay('2020-01-05'),
    });
    expect(summary.recentDayTradingDay).toBeNull();
    expect(summary.recentDayPnl.toFixed(2)).toBe('0.00');
  });
});

describe("getDashboardSummary — cohérence avec @repo/core (aucun recalcul dans l'écran)", () => {
  it('le P&L de période et le rendement affichés égalent ceux calculés directement par @repo/core sur les mêmes trades', async () => {
    const meta = SAMPLE_ACCOUNTS_META['acc-demo-main'];
    const startingBalance = parseAmount(meta.startingBalance);
    const trades = sampleTradeRecordsForAccount('acc-demo-main');
    const days = aggregateByTradingDay(startingBalance, trades).filter(
      (day) => day.tradingDay >= SEPTEMBER_RANGE.from && day.tradingDay <= SEPTEMBER_RANGE.to,
    );
    const expectedPeriodPnl = computeMonthStats(days).netPnl;
    const expectedReturnRate = computeReturnRate(startingBalance, [expectedPeriodPnl]);

    const summary = await getDashboardSummary({ accountId: 'acc-demo-main', ...SEPTEMBER_RANGE });

    expect(summary.periodPnl.equals(expectedPeriodPnl)).toBe(true);
    expect(summary.returnRate.equals(expectedReturnRate)).toBe(true);
  });
});
