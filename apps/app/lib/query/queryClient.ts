import { QueryClient } from '@tanstack/react-query';

/** Durée de rétention du cache persisté (ARCHITECTURE §10 : lecture hors-ligne). */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Délai avant qu'une donnée soit considérée périmée et re-fetchée au prochain montage. */
const DEFAULT_STALE_TIME_MS = 30 * 1000;

/**
 * Fabrique du `QueryClient` de l'app (T6). Une fabrique plutôt qu'un singleton
 * exporté : `QueryProvider` en crée une instance par arbre React monté (tests,
 * Fast Refresh), au lieu de partager un état global entre rendus.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: ONE_DAY_MS,
        retry: 2,
        // Pas de fenêtre "focus" fiable sur mobile ; le web n'a pas besoin de
        // re-fetch agressif pour un MVP à faible fréquence d'écriture.
        refetchOnWindowFocus: false,
      },
    },
  });
}
