/**
 * Comptes factices du header (W-5) : le vrai sélecteur (Supabase + TanStack
 * Query, ADR-016) arrive en M2. Copie web de
 * `apps/app/features/shell/sampleAccounts.ts` (gelé, ADR-023) — mêmes
 * identifiants et clés i18n (`header.accounts.sample.*`), pas d'import direct.
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
