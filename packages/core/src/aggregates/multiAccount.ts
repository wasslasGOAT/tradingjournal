import type { Decimal } from '../money';

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
          balance: (options.convert as ConvertFn)(a.balance, a.currency, options.targetCurrency as string),
          netPnl: (options.convert as ConvertFn)(a.netPnl, a.currency, options.targetCurrency as string),
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
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, totalsForCurrency]) => ({
      currency,
      balance: totalsForCurrency.balance,
      netPnl: totalsForCurrency.netPnl,
      accountIds: [...totalsForCurrency.accountIds].sort((a, b) => a.localeCompare(b)),
    }));
}
