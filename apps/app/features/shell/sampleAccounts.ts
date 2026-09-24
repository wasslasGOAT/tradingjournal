/**
 * Comptes factices du header (M1-8) : le vrai `useAccounts` (Supabase +
 * TanStack Query, ADR-016) arrive avec M2. Noms via i18n (`header.accounts.sample`) —
 * ce sont des libellés de démonstration, pas des données saisies par
 * l'utilisateur, donc traduits comme le reste de l'UI (contrairement à un vrai
 * nom de compte, qui ne serait pas traduit).
 */
export interface SampleAccount {
  readonly id: string;
  /** Clé i18n (`header.accounts.sample.<key>`) plutôt qu'un libellé en dur. */
  readonly nameKey: 'main' | 'prop';
  readonly currency: string;
}

export const SAMPLE_ACCOUNTS: readonly SampleAccount[] = [
  { id: 'acc-demo-main', nameKey: 'main', currency: 'USD' },
  { id: 'acc-demo-prop', nameKey: 'prop', currency: 'USD' },
];
