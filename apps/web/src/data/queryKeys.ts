import type { TradingDay, WeekStartsOn } from '@repo/core';

/**
 * Clés de requête TanStack Query (W-6, ADR-017 : « aucune donnée périmée
 * visible ») — incluent systématiquement tous les filtres actifs (compte,
 * période/mois) pour qu'un changement de filtre invalide immédiatement le
 * cache et affiche un squelette plutôt que l'ancienne donnée.
 *
 * `calendarMonth` inclut `weekStartsOn` (corrigé revue W-10) : `queryFn`
 * construit la grille (`buildCalendarGrid`) avec ce paramètre, qui dépend de
 * la locale (FR = lundi, EN = dimanche). Sans lui dans la clé, basculer de
 * langue réutilisait la grille mise en cache d'une autre locale — décalée
 * d'une colonne par rapport aux en-têtes de jour de semaine, y compris sur
 * les mois voisins préchargés.
 */
export const dataQueryKeys = {
  dashboard: (accountId: string, from: TradingDay, to: TradingDay) =>
    ['dashboard', accountId, from, to] as const,
  calendarMonth: (accountId: string, year: number, month: number, weekStartsOn: WeekStartsOn) =>
    ['calendar', accountId, year, month, weekStartsOn] as const,
};
