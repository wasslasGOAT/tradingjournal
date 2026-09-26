import { Decimal } from '../money';
import { compareOrdinal } from '../stats';
import { computeReturnRate } from '../trading';
import { enumerateTradingDays } from '../time';
import type { TradingDay } from '../time';
import { balanceAtDay } from './equity';
import { computeMonthStats } from './month';
import type { DayAggregate } from './day';

/**
 * Erreur typée levée quand une agrégation multi-comptes reçoit des comptes de
 * devises différentes sans fonction de conversion (ADR-019, option A : pas de
 * conversion pendant le MVP — « Tous les comptes » doit rester groupé par
 * devise). Contrairement à {@link aggregateAccountsByCurrency} (qui *groupe*
 * par devise sans jamais sommer entre devises), {@link equityCurveByDayMultiAccount}
 * et {@link computeLastDayPnl} produisent **une seule série** par construction
 * (un point par jour, un P&L par jour) : elles ne peuvent pas répartir leur
 * résultat par devise sans changer leur forme de retour. Tant qu'aucune
 * sémantique de regroupement par devise n'a été actée pour ces deux fonctions
 * (à trancher par l'agent `architect` si des comptes factices/réels de
 * devises différentes doivent un jour être combinés dans une même vue), elles
 * lèvent plutôt qu'elles ne produisent un chiffre faux — même choix que
 * `apps/web/src/data/dashboard.ts`/`calendar.ts` avant leur composition sur
 * `packages/core`.
 */
export class MixedCurrencyAggregationError extends Error {
  constructor(readonly currencies: readonly string[]) {
    super(
      `Agrégation multi-comptes impossible : devises mélangées (${currencies.join(', ')}) — ADR-019, pas de conversion pendant le MVP.`,
    );
    this.name = 'MixedCurrencyAggregationError';
  }
}

/**
 * Vérifie que tous les `accounts` partagent la même devise (ADR-019, option
 * A) — utilisée par toute agrégation multi-comptes de `packages/core` qui
 * somme des montants entre comptes ({@link equityCurveByDayMultiAccount},
 * {@link computeLastDayPnl}, {@link summarizeAccountsOverPeriod}). Exportée
 * pour que la couche web n'ait plus à dupliquer ce contrôle à la main (avant :
 * `apps/web/src/data/dashboard.ts`/`calendar.ts`).
 *
 * @throws {MixedCurrencyAggregationError} si `accounts` contient plus d'une devise distincte.
 */
export function assertSingleCurrency(accounts: readonly { readonly currency: string }[]): void {
  const currencies = [...new Set(accounts.map((a) => a.currency))].sort(compareOrdinal);
  if (currencies.length > 1) {
    throw new MixedCurrencyAggregationError(currencies);
  }
}

/**
 * Série journalière d'un compte, entrée de {@link equityCurveByDayMultiAccount}
 * et {@link computeLastDayPnl}.
 */
export interface AccountDaySeries {
  readonly accountId: string;
  readonly currency: string;
  readonly startingBalance: Decimal;
  /** Agrégats journaliers du compte (voir {@link aggregateByTradingDay}), triés par `tradingDay` croissant. */
  readonly days: readonly DayAggregate[];
}

/** Point de la courbe d'equity multi-comptes — un point par jour de la période, voir {@link equityCurveByDayMultiAccount}. */
export interface MultiAccountEquityPoint {
  readonly tradingDay: TradingDay;
  /** Somme des soldes de tous les comptes à ce jour (voir {@link balanceAtDay}), même devise pour tous (voir {@link MixedCurrencyAggregationError}). */
  readonly balance: Decimal;
}

/**
 * Courbe d'equity multi-comptes (Dashboard, ARCHITECTURE §5.4/§5.7) : **un
 * point par jour civil de `[from, to]`** (bornes incluses, voir
 * {@link enumerateTradingDays} — contrairement à {@link equityCurveByDay} qui
 * n'a un point que pour les jours où au moins un trade a eu lieu), `balance`
 * étant la somme des soldes de chaque compte à ce jour ({@link balanceAtDay}).
 *
 * Tous les comptes doivent partager la même devise (ADR-019, option A) :
 * lève sinon plutôt que de sommer des devises différentes.
 *
 * @param accounts comptes à agréger (voir {@link AccountDaySeries}) ; `[]` renvoie un point à `0` par jour de la période
 * @param from premier jour de la période (inclus)
 * @param to dernier jour de la période (inclus)
 * @throws {MixedCurrencyAggregationError} si `accounts` mélange plusieurs devises
 */
export function equityCurveByDayMultiAccount(
  accounts: readonly AccountDaySeries[],
  from: TradingDay,
  to: TradingDay,
): MultiAccountEquityPoint[] {
  assertSingleCurrency(accounts);
  return enumerateTradingDays(from, to).map((tradingDay) => ({
    tradingDay,
    balance: accounts.reduce(
      (acc, account) => acc.plus(balanceAtDay(account.startingBalance, account.days, tradingDay)),
      new Decimal(0),
    ),
  }));
}

/** Résultat de {@link computeLastDayPnl}. */
export interface LastDayPnlResult {
  /** Dernier jour de trading ayant des trades dans la période, tous comptes confondus ; `null` si aucun compte n'a de trade dans `[from, to]`. */
  readonly tradingDay: TradingDay | null;
  /** Somme du `netPnl` de {@link tradingDay} sur tous les comptes (`0` si `tradingDay` est `null`). */
  readonly netPnl: Decimal;
}

/**
 * P&L du **dernier jour de trading ayant des trades dans `[from, to]`, tous
 * comptes confondus** (Dashboard, tuile « P&L du jour »).
 *
 * Sémantique multi-comptes (revue W-10, correction du bug `recentDayPnl`
 * précédent qui sommait *le dernier jour de chaque compte*, potentiellement
 * des jours différents d'un compte à l'autre, ce qui ne correspondait à
 * aucun jour réel) : on détermine d'abord **un seul** jour — le plus récent
 * de `[from, to]` où **au moins un compte** a `tradesCount > 0` — puis on
 * additionne le `netPnl` de *ce même jour* pour chaque compte (`0` pour un
 * compte qui n'a pas tradé ce jour-là). En mode un seul compte, ce jour est
 * simplement le dernier jour tradé de ce compte dans la période ; en
 * multi-comptes, c'est le même jour civil pour tous.
 *
 * Tous les comptes doivent partager la même devise (ADR-019, option A) :
 * lève sinon plutôt que de sommer des devises différentes.
 *
 * @param accounts comptes à considérer (voir {@link AccountDaySeries})
 * @param from premier jour de la période (inclus)
 * @param to dernier jour de la période (inclus)
 * @throws {MixedCurrencyAggregationError} si `accounts` mélange plusieurs devises
 */
export function computeLastDayPnl(
  accounts: readonly AccountDaySeries[],
  from: TradingDay,
  to: TradingDay,
): LastDayPnlResult {
  assertSingleCurrency(accounts);

  let lastTradingDay: string | null = null;
  for (const account of accounts) {
    for (const day of account.days) {
      if (day.tradesCount === 0) continue;
      if (day.tradingDay < from || day.tradingDay > to) continue;
      if (lastTradingDay === null || day.tradingDay > lastTradingDay) {
        lastTradingDay = day.tradingDay;
      }
    }
  }

  if (lastTradingDay === null) {
    return { tradingDay: null, netPnl: new Decimal(0) };
  }

  const netPnl = accounts.reduce((acc, account) => {
    const match = account.days.find((day) => day.tradingDay === lastTradingDay);
    return acc.plus(match ? match.netPnl : new Decimal(0));
  }, new Decimal(0));

  return { tradingDay: lastTradingDay as TradingDay, netPnl };
}

/** Valeurs monétaires d'un compte à agréger (voir {@link aggregateAccountsByCurrency}). */
export interface AccountMoneyValues {
  readonly accountId: string;
  readonly currency: string;
  readonly balance: Decimal;
  readonly netPnl: Decimal;
}

/** Total par devise (ou total unique converti, voir `options.convert`). */
export interface CurrencyTotal {
  readonly currency: string;
  readonly balance: Decimal;
  readonly netPnl: Decimal;
  /** Comptes ayant contribué à ce total, triés par `accountId`. */
  readonly accountIds: readonly string[];
}

/**
 * Fonction de conversion `amount` (dans `fromCurrency`) -> montant équivalent
 * dans `toCurrency`. Non fournie pendant le MVP (ADR-019, option A : « Tous
 * les comptes » affiche un total par devise, sans conversion) — le paramètre
 * existe pour qu'un taux de change réel (post-MVP, table `fx_rates`) puisse
 * être branché sans changer la signature de {@link aggregateAccountsByCurrency}
 * ni le type de son retour.
 */
export type ConvertFn = (amount: Decimal, fromCurrency: string, toCurrency: string) => Decimal;

export interface AggregateMultiAccountOptions {
  /** Fonction de conversion, voir {@link ConvertFn}. Ignorée si `targetCurrency` n'est pas fourni. */
  readonly convert?: ConvertFn;
  /** Devise cible : si fournie avec `convert`, tous les comptes sont convertis et regroupés en un seul total. */
  readonly targetCurrency?: string;
}

/**
 * Agrège les soldes/P&L net de plusieurs comptes.
 *
 * Par défaut (`options` absent ou `convert`/`targetCurrency` non fournis) :
 * **un total par devise, sans conversion** (ADR-019, option A — le choix
 * actuel du MVP, aucun taux de change à maintenir), regroupement identique à
 * `packages/core/money` `sumMoneyByCurrency`, trié par code devise.
 *
 * Si `options.convert` **et** `options.targetCurrency` sont fournis, chaque
 * compte est d'abord converti dans `targetCurrency`, puis tout est regroupé
 * en un **seul** total (même forme de retour — un tableau à une entrée — pour
 * que les appelants n'aient pas à distinguer les deux modes).
 *
 * @param accounts valeurs par compte à agréger
 * @param options conversion optionnelle (non implémentée pendant le MVP, voir {@link ConvertFn})
 * @returns un {@link CurrencyTotal} par devise (ou un seul si converti), trié par `currency`
 */
export function aggregateAccountsByCurrency(
  accounts: readonly AccountMoneyValues[],
  options?: AggregateMultiAccountOptions,
): CurrencyTotal[] {
  const normalized =
    options?.convert && options.targetCurrency
      ? accounts.map((a) => ({
          accountId: a.accountId,
          currency: options.targetCurrency as string,
          balance: (options.convert as ConvertFn)(
            a.balance,
            a.currency,
            options.targetCurrency as string,
          ),
          netPnl: (options.convert as ConvertFn)(
            a.netPnl,
            a.currency,
            options.targetCurrency as string,
          ),
        }))
      : accounts;

  const totals = new Map<string, { balance: Decimal; netPnl: Decimal; accountIds: string[] }>();
  for (const a of normalized) {
    const existing = totals.get(a.currency);
    if (existing) {
      existing.balance = existing.balance.plus(a.balance);
      existing.netPnl = existing.netPnl.plus(a.netPnl);
      existing.accountIds.push(a.accountId);
    } else {
      totals.set(a.currency, { balance: a.balance, netPnl: a.netPnl, accountIds: [a.accountId] });
    }
  }

  return [...totals.entries()]
    .sort(([a], [b]) => compareOrdinal(a, b))
    .map(([currency, totalsForCurrency]) => ({
      currency,
      balance: totalsForCurrency.balance,
      netPnl: totalsForCurrency.netPnl,
      accountIds: [...totalsForCurrency.accountIds].sort(compareOrdinal),
    }));
}

/** Résultat de {@link summarizeAccountsOverPeriod}. */
export interface AccountsPeriodSummary {
  /** Somme des soldes initiaux de tous les comptes (`accounts[].startingBalance`). */
  readonly startingBalance: Decimal;
  /** Somme des soldes de clôture de tous les comptes à `to` inclus (voir {@link balanceAtDay}). */
  readonly balance: Decimal;
  /** Somme du P&L net de tous les comptes sur `[from, to]` (bornes incluses, voir {@link computeMonthStats}). */
  readonly periodPnl: Decimal;
  /**
   * Rendement (fraction, voir {@link computeReturnRate}) sur `startingBalance`/`periodPnl` —
   * **`0` si `startingBalance <= 0`** (règle Dashboard : un total de soldes
   * initiaux nul ou négatif ne peut pas servir de dénominateur, `computeReturnRate`
   * lève dans ce cas plutôt que de renvoyer un chiffre ; `0` communique
   * « rendement non significatif » sans faire échouer l'écran — même choix
   * que faisait `apps/web/src/data/dashboard.ts` avant sa composition ici).
   */
  readonly returnRate: Decimal;
}

/**
 * Résumé Dashboard (ARCHITECTURE §5.4/§5.7) d'un ensemble de comptes sur une
 * période `[from, to]` (bornes incluses) : solde initial total, solde de
 * clôture total, P&L net total de la période, et rendement associé.
 *
 * Remplace les `reduce` faits à la main dans `apps/web/src/data/dashboard.ts`
 * (`balance`, `totalStartingBalance`, `periodPnl`, règle « rendement à `0` si
 * solde initial `<= 0` ») par une seule fonction pure et testée de
 * `packages/core` — composition de {@link balanceAtDay} (solde à `to`) et
 * {@link computeMonthStats} (P&L net de `[from, to]`, filtré par l'appelant
 * en interne), même formule de rendement que {@link computeReturnRate}.
 *
 * Tous les comptes doivent partager la même devise (ADR-019, option A) : lève
 * sinon plutôt que de sommer des devises différentes.
 *
 * @param accounts comptes à agréger (voir {@link AccountDaySeries})
 * @param from premier jour de la période (inclus) — sert à filtrer `periodPnl`, pas `balance` (voir {@link balanceAtDay})
 * @param to dernier jour de la période (inclus)
 * @throws {MixedCurrencyAggregationError} si `accounts` mélange plusieurs devises
 */
export function summarizeAccountsOverPeriod(
  accounts: readonly AccountDaySeries[],
  from: TradingDay,
  to: TradingDay,
): AccountsPeriodSummary {
  assertSingleCurrency(accounts);

  const startingBalance = accounts.reduce(
    (acc, account) => acc.plus(account.startingBalance),
    new Decimal(0),
  );
  const balance = accounts.reduce(
    (acc, account) => acc.plus(balanceAtDay(account.startingBalance, account.days, to)),
    new Decimal(0),
  );
  const periodPnl = accounts.reduce((acc, account) => {
    const daysInRange = account.days.filter(
      (day) => day.tradingDay >= from && day.tradingDay <= to,
    );
    return acc.plus(computeMonthStats(daysInRange).netPnl);
  }, new Decimal(0));
  const returnRate = startingBalance.greaterThan(0)
    ? computeReturnRate(startingBalance, [periodPnl])
    : new Decimal(0);

  return { startingBalance, balance, periodPnl, returnRate };
}
