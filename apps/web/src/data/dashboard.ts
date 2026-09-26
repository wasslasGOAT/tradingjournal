import {
  aggregateByTradingDay,
  assertSingleCurrency,
  computeLastDayPnl,
  equityCurveByDayMultiAccount,
  parseAmount,
  summarizeAccountsOverPeriod,
} from '@repo/core';
import type { AccountDaySeries, Decimal, MultiAccountEquityPoint, TradingDay } from '@repo/core';

import { resolveAccountIds } from './accounts';
import { dataQueryKeys } from './queryKeys';
import { SAMPLE_ACCOUNTS_META } from './sample/accountsSampleData';
import { sampleTradeRecordsForAccount } from './sample/tradesSampleData';
import type { SampleAccountId } from './sample/accountsSampleData';

/**
 * Couche données du Dashboard (W-6, revue W-10, ADR-016/ADR-023) : lit les
 * trades factices (`sample/tradesSampleData.ts`) filtrés par compte, les
 * agrège via `@repo/core` (`aggregateByTradingDay`, puis composition pure via
 * `summarizeAccountsOverPeriod`/`equityCurveByDayMultiAccount`/`computeLastDayPnl` —
 * **aucun calcul de date ni de montant ici**, seulement lecture, filtrage et
 * assemblage), retourne des `Decimal` prêts à formater par
 * `@repo/core/format`. Aucune dépendance au DOM — remplaçable par une lecture
 * Supabase (M4/M5) sans changer la forme du résultat.
 */
export interface DashboardFilters {
  readonly accountId: string;
  readonly from: TradingDay;
  readonly to: TradingDay;
}

/** Un point de la courbe d'equity (Dashboard) — voir `@repo/core` `MultiAccountEquityPoint`. */
export type DashboardEquityPoint = MultiAccountEquityPoint;

export interface DashboardSummary {
  readonly currency: string;
  readonly balance: Decimal;
  /** P&L net cumulé sur la période sélectionnée (bornes incluses). */
  readonly periodPnl: Decimal;
  /**
   * P&L net du **même** jour de trading pour tous les comptes sélectionnés —
   * le plus récent jour de `[from, to]` où au moins un compte a tradé (voir
   * `computeLastDayPnl`, revue W-10 : corrige le bug précédent qui sommait,
   * en mode « Tous les comptes », le dernier jour tradé *de chaque compte*,
   * potentiellement des jours différents d'un compte à l'autre).
   */
  readonly recentDayPnl: Decimal;
  /** Jour de trading retenu pour {@link recentDayPnl} ; `null` si aucun compte n'a tradé sur la période (tuile affichée sans date). */
  readonly recentDayTradingDay: TradingDay | null;
  /** Rendement (fraction) sur la période sélectionnée — voir `computeReturnRate`. */
  readonly returnRate: Decimal;
  readonly equityPoints: readonly DashboardEquityPoint[];
  /** `false` si aucun trade n'existe pour ce compte sur la période (état vide, ADR-017). */
  readonly hasActivity: boolean;
}

interface PerAccountComputation extends AccountDaySeries {
  readonly startingBalance: Decimal;
  readonly daysInRange: AccountDaySeries['days'];
}

function computeForAccount(
  accountId: SampleAccountId,
  filters: DashboardFilters,
): PerAccountComputation {
  const meta = SAMPLE_ACCOUNTS_META[accountId];
  const startingBalance = parseAmount(meta.startingBalance);
  const trades = sampleTradeRecordsForAccount(accountId);
  const days = aggregateByTradingDay(startingBalance, trades);
  const daysInRange = days.filter(
    (day) => day.tradingDay >= filters.from && day.tradingDay <= filters.to,
  );
  return { accountId, currency: meta.currency, startingBalance, days, daysInRange };
}

/**
 * Résumé du Dashboard pour un compte (ou `'all'`, agrégé — ADR-019 option A :
 * pas de conversion de devise pendant le MVP, les comptes factices partagent
 * `USD`) sur une période. Fonction pure synchrone enveloppée en `Promise`
 * (même forme que le futur appel Supabase, `useQuery` ne voit pas la
 * différence).
 *
 * @throws {MixedCurrencyAggregationError} si les comptes sélectionnés ne
 * partagent pas la même devise (ADR-019 — ne devrait pas arriver avec les
 * comptes factices actuels, tous `USD` ; état d'erreur propre affiché par
 * l'écran sinon, comme toute autre erreur de requête).
 */
export async function getDashboardSummary(filters: DashboardFilters): Promise<DashboardSummary> {
  // `await` volontaire (même s'il ne fait qu'attendre un micro-tick) : `async function` garantit
  // que toute erreur levée ci-dessous (compte inconnu, devises mêlées) devient un rejet de
  // `Promise`, jamais une exception synchrone — cohérent avec le futur appel Supabase réel.
  await Promise.resolve();
  const accountIds = resolveAccountIds(filters.accountId);
  const perAccount = accountIds.map((id) => computeForAccount(id, filters));

  // ADR-019 : pas de conversion pendant le MVP — ne devrait pas arriver avec les comptes factices actuels (tous `USD`).
  assertSingleCurrency(perAccount);
  const currency = perAccount[0]?.currency ?? 'USD';

  const { balance, periodPnl, returnRate } = summarizeAccountsOverPeriod(
    perAccount,
    filters.from,
    filters.to,
  );
  const { tradingDay: recentDayTradingDay, netPnl: recentDayPnl } = computeLastDayPnl(
    perAccount,
    filters.from,
    filters.to,
  );

  const equityPoints = equityCurveByDayMultiAccount(perAccount, filters.from, filters.to);

  const hasActivity = perAccount.some((a) => a.daysInRange.length > 0);

  return {
    currency,
    balance,
    periodPnl,
    recentDayPnl,
    recentDayTradingDay,
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
