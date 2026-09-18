import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import type { QueryClient } from '@tanstack/react-query';

import { ONE_DAY_MS } from './queryClient';
import { queryCacheStorage } from './storage';

/** Espace de nommage du cache persisté (évite une collision avec d'autres clés `localStorage`/`AsyncStorage`). */
const QUERY_CACHE_STORAGE_KEY = 'edgebook-query-cache';

/**
 * Version de la *forme* du cache persisté (correctif revue M0 — Mineur 13),
 * distincte de la version de l'app (`expo-constants` → `Constants.expoConfig.version`) :
 * une mise à jour de l'app ne change pas forcément la forme des données mises en
 * cache (nouveaux champs de requête, `queryKey` restructurée...), et on ne veut
 * invalider le cache que dans ce dernier cas — pas à chaque nouvelle version
 * publiée. `PersistQueryClientProvider` compare ce `buster` à celui stocké lors
 * de la persistance précédente ; s'ils diffèrent, le cache restauré est jeté
 * plutôt que réhydraté (évite de faire lire par l'app un objet dont la forme ne
 * correspond plus à ce qu'attend le code après une mise à jour).
 *
 * À incrémenter manuellement à chaque changement de forme des données mises en
 * cache par TanStack Query (nouvelle clé de requête incompatible, changement de
 * structure des données renvoyées par un `queryFn`...).
 */
export const CACHE_SCHEMA_VERSION = '1';

/** Type du persister renvoyé par `createAsyncStoragePersister` (non ré-exporté par `@tanstack/query-async-storage-persister`). */
type QueryCachePersister = ReturnType<typeof createAsyncStoragePersister>;

/**
 * Clé de stockage du cache persisté, isolée par utilisateur (préparation M2).
 *
 * `null` avant connexion (état actuel, M0 : pas d'auth) ou après déconnexion.
 * Une fois connecté, passer l'id de l'utilisateur isole le cache d'un compte à
 * l'autre sur un même appareil : sans ça, un second utilisateur qui se connecte
 * sur le même téléphone pourrait restaurer au démarrage — avant son premier
 * fetch réseau — des données persistées appartenant encore au compte précédent
 * (ARCHITECTURE §10, ADR-017 : jamais de données périmées/étrangères affichées).
 */
export function persistKeyFor(userId: string | null): string {
  return userId ? `${QUERY_CACHE_STORAGE_KEY}:${userId}` : QUERY_CACHE_STORAGE_KEY;
}

/**
 * Options de persistance passées à `PersistQueryClientProvider` (T6).
 * `maxAge` = durée max pendant laquelle une entrée persistée est restaurée sans
 * être immédiatement jetée (au-delà, TanStack Query la considère trop vieille).
 *
 * `userId` : voir {@link persistKeyFor}. `null` par défaut (M0 : pas d'auth).
 */
export function createPersistOptions(
  userId: string | null = null,
): Omit<PersistQueryClientOptions, 'queryClient'> & { persister: QueryCachePersister } {
  return {
    persister: createAsyncStoragePersister({
      storage: queryCacheStorage,
      key: persistKeyFor(userId),
    }),
    maxAge: ONE_DAY_MS,
    buster: CACHE_SCHEMA_VERSION,
  };
}

/**
 * Vide le cache TanStack Query en mémoire (`queryClient`) et persisté
 * (`persister`).
 *
 * // M2: appeler cette fonction sur l'évènement `SIGNED_OUT` de Supabase Auth
 * (avant d'afficher l'écran de connexion), pour qu'aucune donnée du compte
 * précédent ne reste visible ou restaurable au prochain démarrage sur le même
 * appareil.
 *
 * Prend `queryClient`/`persister` en paramètres plutôt que de lire un singleton
 * de module : cohérent avec `createQueryClient`/`createPersistOptions`
 * (fabriques, pas d'état global partagé entre rendus) et testable sans monter
 * de provider React.
 */
export async function clearPersistedCache(
  queryClient: QueryClient,
  persister: QueryCachePersister,
): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
