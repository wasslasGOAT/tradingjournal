import type { TradingDay } from "@repo/core"

/**
 * Clés de requête TanStack Query (W-6, ADR-017 : « aucune donnée périmée
 * visible ») — incluent systématiquement tous les filtres actifs (compte,
 * période/mois) pour qu'un changement de filtre invalide immédiatement le
 * cache et affiche un squelette plutôt que l'ancienne donnée.
 */
export const dataQueryKeys = {
  dashboard: (accountId: string, from: TradingDay, to: TradingDay) =>
    ["dashboard", accountId, from, to] as const,
  calendarMonth: (accountId: string, year: number, month: number) =>
    ["calendar", accountId, year, month] as const,
}
