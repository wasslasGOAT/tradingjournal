/**
 * Interface de stockage clé/valeur asynchrone commune (T6), utilisée par :
 * - `lib/supabase/authStorage.*` (session Supabase),
 * - `lib/query/storage.*` (cache TanStack Query persisté).
 *
 * Compatible structurellement avec :
 * - `SupportedStorage` de `@supabase/auth-js` (get/set/removeItem, sync ou async) ;
 * - `AsyncStorage<string>` de `@tanstack/query-persist-client-core` ;
 * - `@react-native-async-storage/async-storage` (export par défaut) tel quel.
 *
 * ARCHITECTURE §10 : « TanStack Query persisté derrière une interface de stockage ».
 */
export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Stockage synchrone minimal dont dispose une plateforme (ex. `window.localStorage`).
 * Peut être absent (`null`/`undefined`) — SSR, export statique, WebView Android sans
 * `localStorage` (cf. avertissement `@tanstack/query-async-storage-persister`).
 */
export interface MinimalSyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
