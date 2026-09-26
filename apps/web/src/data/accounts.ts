import { SAMPLE_ACCOUNT_IDS, isSampleAccountId } from './sample/tradesSampleData';
import type { SampleAccountId } from './sample/accountsSampleData';

/**
 * Résolution du filtre compte (W-6) partagée par `dashboard.ts`/`calendar.ts` :
 * `'all'` (valeur par défaut de `features/shell/filters.ts`) résout vers tous
 * les comptes factices connus, un identifiant précis vers lui seul.
 */
export class UnknownAccountError extends Error {
  constructor(accountId: string) {
    super(`Compte inconnu : ${accountId}`);
    this.name = 'UnknownAccountError';
  }
}

export function resolveAccountIds(accountId: string): SampleAccountId[] {
  if (accountId === 'all') return [...SAMPLE_ACCOUNT_IDS];
  if (!isSampleAccountId(accountId)) throw new UnknownAccountError(accountId);
  return [accountId];
}
