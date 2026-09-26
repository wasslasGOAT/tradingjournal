import {
  aggregateByTradingDay,
  computeMonthStats,
  computeReturnRate,
  Decimal,
  parseAmount,
  toTradingDay,
} from '@repo/core';
import type { DayAggregate, TradingDay } from '@repo/core';

import { SAMPLE_ACCOUNTS_META } from './sample/accountsSampleData';
import { sampleTradeRecordsForAccount } from './sample/tradesSampleData';
import type { SampleAccountId } from './sample/accountsSampleData';
import { resolveAccountIds } from './accounts';
import { dataQueryKeys } from './queryKeys';

/**
 * Couche données du Dashboard (W-6, ADR-016/ADR-023) : lit les trades
 * factices (`sample/tradesSampleData.ts`) filtrés par compte, les agrège via
 * `@repo/core` (jamais de calcul métier ici au-delà de la composition
 * d'agrégats déjà purs), retourne des `Decimal` prêts à formater par
 * `@repo/core/format`. Aucune dépendance au DOM — remplaçable par une lecture
 * Supabase (M4/M5) sans changer la forme du résultat.
 */
export interface DashboardFilters {
  readonly accountId: string;
  readonly from: TradingDay;
  readonly to: TradingDay;
}

export interface DashboardEquityPoint {
  readonly tradingDay: TradingDay;
  readonly balance: Decimal;
}

export interface DashboardSummary {
  readonly currency: string;
  readonly balance: Decimal;
  /** P&L net cumulé sur la période sélectionnée (bornes incluses). */
  readonly periodPnl: Decimal;
  /**
   * P&L net du jour de trading le plus récent **dans la période sélectionnée**
   * (et non du jour civil réel) : ancré sur la période plutôt que sur
   * l'horloge système pour rester déterministe (données factices figées en
   * 2026) — le vrai Dashboard (M4/M5) ancrera cette tuile sur le jour de
   * trading réel du compte (`tradingDayOf`, fuseau + heure de bascule).
   */
  readonly recentDayPnl: Decimal;
  /** Rendement (fraction) sur la période sélectionnée — voir `computeReturnRate`. */
  readonly returnRate: Decimal;
  readonly equityPoints: readonly DashboardEquityPoint[];
  /** `false` si aucun trade n'existe pour ce compte sur la période (état vide, ADR-017). */
  readonly hasActivity: boolean;
}

/** Solde de clôture d'un compte au jour `day` inclus (dernier `endBalance` connu, sinon le solde initial). `daysAll` doit être trié par `tradingDay` croissant (voir `aggregateByTradingDay`). */
function balanceAtOrBefore(
  daysAll: readonly DayAggregate[],
  startingBalance: Decimal,
  day: TradingDay,
): Decimal {
  let result = startingBalance;
  for (const entry of daysAll) {
    if (entry.tradingDay > day) break;
    result = entry.endBalance;
  }
  return result;
}

/** Énumère les jours civils de `[from, to]` (bornes incluses) en `TradingDay`, arithmétique `Date` UTC pure. */
function enumerateTradingDays(from: TradingDay, to: TradingDay): TradingDay[] {
  const [fromYear = 0, fromMonth = 1, fromDay = 1] = from.split('-').map(Number);
  const start = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const days: TradingDay[] = [];
  const cursor = new Date(start);
  while (true) {
    const y = String(cursor.getUTCFullYear()).padStart(4, '0');
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cursor.getUTCDate()).padStart(2, '0');
    const tradingDay = toTradingDay(`${y}-${m}-${d}`);
    days.push(tradingDay);
    if (tradingDay >= to) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

interface PerAccountComputation {
  readonly meta: (typeof SAMPLE_ACCOUNTS_META)[SampleAccountId];
  readonly startingBalance: Decimal;
  readonly daysAll: readonly DayAggregate[];
  readonly daysInRange: readonly DayAggregate[];
}

function computeForAccount(
  accountId: SampleAccountId,
  filters: DashboardFilters,
): PerAccountComputation {
  const meta = SAMPLE_ACCOUNTS_META[accountId];
  const startingBalance = parseAmount(meta.startingBalance);
  const trades = sampleTradeRecordsForAccount(accountId);
  const daysAll = aggregateByTradingDay(startingBalance, trades);
  const daysInRange = daysAll.filter(
    (day) => day.tradingDay >= filters.from && day.tradingDay <= filters.to,
  );
  return { meta, startingBalance, daysAll, daysInRange };
}

/**
 * Résumé du Dashboard pour un compte (ou `'all'`, agrégé — ADR-019 option A :
 * pas de conversion de devise pendant le MVP, les comptes factices partagent
 * `USD`) sur une période. Fonction pure synchrone enveloppée en `Promise`
 * (même forme que le futur appel Supabase, `useQuery` ne voit pas la
 * différence).
 */
export async function getDashboardSummary(filters: DashboardFilters): Promise<DashboardSummary> {
  // `await` volontaire (même s'il ne fait qu'attendre un micro-tick) : `async function` garantit
  // que toute erreur levée ci-dessous (compte inconnu, devises mêlées) devient un rejet de
  // `Promise`, jamais une exception synchrone — cohérent avec le futur appel Supabase réel.
  await Promise.resolve();
  const accountIds = resolveAccountIds(filters.accountId);
  const perAccount = accountIds.map((id) => computeForAccount(id, filters));

  const currencies = new Set(perAccount.map((a) => a.meta.currency));
  if (currencies.size > 1) {
    // ADR-019 : pas de conversion pendant le MVP — ne devrait pas arriver avec les comptes factices actuels (tous `USD`).
    throw new Error('Agrégation multi-devises non prise en charge pendant le MVP (ADR-019).');
  }
  const currency = [...currencies][0] ?? 'USD';

  const balance = perAccount.reduce(
    (acc, a) => acc.plus(balanceAtOrBefore(a.daysAll, a.startingBalance, filters.to)),
    new Decimal(0),
  );
  const totalStartingBalance = perAccount.reduce(
    (acc, a) => acc.plus(a.startingBalance),
    new Decimal(0),
  );
  const periodPnl = perAccount.reduce(
    (acc, a) => acc.plus(computeMonthStats(a.daysInRange).netPnl),
    new Decimal(0),
  );
  const recentDayPnl = perAccount.reduce((acc, a) => {
    const lastDay = a.daysInRange[a.daysInRange.length - 1];
    return acc.plus(lastDay ? lastDay.netPnl : new Decimal(0));
  }, new Decimal(0));
  const returnRate = totalStartingBalance.greaterThan(0)
    ? computeReturnRate(totalStartingBalance, [periodPnl])
    : new Decimal(0);

  const equityPoints: DashboardEquityPoint[] = enumerateTradingDays(filters.from, filters.to).map(
    (tradingDay) => ({
      tradingDay,
      balance: perAccount.reduce(
        (acc, a) => acc.plus(balanceAtOrBefore(a.daysAll, a.startingBalance, tradingDay)),
        new Decimal(0),
      ),
    }),
  );

  const hasActivity = perAccount.some((a) => a.daysInRange.length > 0);

  return {
    currency,
    balance,
    periodPnl,
    recentDayPnl,
    returnRate,
    equityPoints,
    hasActivity,
  };
}

export function dashboardQueryOptions(filters: DashboardFilters) {
  return {
    queryKey: dataQueryKeys.dashboard(filters.accountId, filters.from, filters.to),
    queryFn: () => getDashboardSummary(filters),
  };
}
