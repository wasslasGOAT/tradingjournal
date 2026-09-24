import { create } from 'zustand';

/**
 * Filtres globaux du header (M1-8, ARCHITECTURE §6.1) : compte sélectionné
 * (`'all'` = « Tous les comptes ») et période (jour/semaine/mois/année),
 * partagés par tous les écrans de données (dashboard, calendrier, trades…).
 *
 * État en mémoire uniquement pour l'instant (persistance réelle + reflet
 * dans les préférences utilisateur : M2). Le reflet dans l'URL sur le web est
 * géré séparément par `useSyncFiltersWithUrl` (`(app)/_layout.tsx`), pas ici :
 * ce store reste la source de vérité unique, lue aussi bien par le header que
 * par les futures clés de requête TanStack Query (compte + période + mois,
 * ADR-017 : « aucune donnée périmée visible »).
 */
export type FilterPeriod = 'day' | 'week' | 'month' | 'year';

export const FILTER_PERIODS: readonly FilterPeriod[] = ['day', 'week', 'month', 'year'];

/** `'all'` (Tous les comptes) ou l'identifiant d'un compte (`sampleAccounts`, M2 : `accounts.id`). */
export type FilterAccountId = string;

interface FilterState {
  accountId: FilterAccountId;
  period: FilterPeriod;
  setAccountId: (accountId: FilterAccountId) => void;
  setPeriod: (period: FilterPeriod) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  accountId: 'all',
  period: 'month',
  setAccountId: (accountId) => set({ accountId }),
  setPeriod: (period) => set({ period }),
}));
