import type { AsyncKeyValueStorage, MinimalSyncStorage } from './keyValueStorage.types';

/**
 * Adapte un stockage synchrone (typiquement `window.localStorage`) à l'interface
 * `AsyncKeyValueStorage` commune, sans jamais planter : si le stockage n'est pas
 * disponible (export statique web hors navigateur, WebView Android sans
 * `localStorage`), les lectures renvoient `null` et les écritures sont ignorées
 * plutôt que de lancer une exception — l'app ne doit jamais planter en écran
 * blanc pour une raison de stockage (CLAUDE.md, ADR-017).
 *
 * `getStorage` est un thunk (jamais un accès direct à `window` en haut de
 * module) : cette fonction est pure et testable côté Node sans DOM.
 */
export function createSafeWebStorage(
  getStorage: () => MinimalSyncStorage | null | undefined,
): AsyncKeyValueStorage {
  return {
    // Pas de `await` : l'opération est synchrone (thunk + `Storage` sync). `Promise.resolve`
    // suffit à respecter l'interface asynchrone commune sans déclencher `require-await`.
    getItem(key) {
      const storage = getStorage();
      if (!storage) return Promise.resolve(null);
      try {
        return Promise.resolve(storage.getItem(key));
      } catch {
        return Promise.resolve(null);
      }
    },
    setItem(key, value) {
      const storage = getStorage();
      if (storage) {
        try {
          storage.setItem(key, value);
        } catch {
          // Quota dépassé ou stockage refusé : on ignore plutôt que de planter.
        }
      }
      return Promise.resolve();
    },
    removeItem(key) {
      const storage = getStorage();
      if (storage) {
        try {
          storage.removeItem(key);
        } catch {
          // Idem.
        }
      }
      return Promise.resolve();
    },
  };
}
