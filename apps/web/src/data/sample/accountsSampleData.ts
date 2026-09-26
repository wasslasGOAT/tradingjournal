/**
 * Métadonnées factices des comptes (W-6, ADR-023) : solde initial, devise et
 * réglages de jour de trading — utilisées par `dashboard.ts`/`calendar.ts`
 * pour convertir les trades factices (`tradesSampleData.ts`) en agrégats via
 * `@repo/core`. Mêmes identifiants que
 * `apps/web/src/features/shell/sampleAccounts.ts` (comptes affichés dans le
 * sélecteur du header) — fichier séparé pour ne pas mélanger « ce qui
 * s'affiche dans le sélecteur » et « ce qui nourrit les calculs ».
 *
 * Le vrai solde initial (`accounts.starting_balance`, `accounts.timezone`,
 * `accounts.day_rollover_time`) sera lu depuis Supabase en M2/M4 — cette
 * table factice n'est qu'un point de départ pour les calculs
 * `packages/core` (ADR-016 : calcul à la volée côté app pendant le MVP).
 */
export interface SampleAccountMeta {
  readonly startingBalance: string;
  readonly currency: string;
  /** Fuseau IANA utilisé pour résoudre le jour de trading des trades factices (`tradingDayOf`). */
  readonly timezone: string;
  /** Heure de bascule locale (`HH:mm`) — `"00:00"` : aucune bascule, jour de trading = date civile. */
  readonly dayRolloverTime: string;
}

export const SAMPLE_ACCOUNTS_META = {
  'acc-demo-main': {
    startingBalance: '23200.00',
    currency: 'USD',
    timezone: 'UTC',
    dayRolloverTime: '00:00',
  },
  'acc-demo-prop': {
    startingBalance: '50000.00',
    currency: 'USD',
    timezone: 'UTC',
    dayRolloverTime: '00:00',
  },
} as const satisfies Record<string, SampleAccountMeta>;

export type SampleAccountId = keyof typeof SAMPLE_ACCOUNTS_META;
