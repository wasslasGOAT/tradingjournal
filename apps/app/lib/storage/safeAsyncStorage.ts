import type { AsyncKeyValueStorage } from './keyValueStorage.types';

/**
 * Adapte un stockage déjà asynchrone (typiquement `AsyncStorage` sur natif) à
 * l'interface `AsyncKeyValueStorage` commune, sans jamais rejeter : si l'opération
 * sous-jacente échoue (accès disque refusé, stockage corrompu, quota dépassé...),
 * les lectures renvoient `null` et les écritures/suppressions sont ignorées plutôt
 * que de rejeter — l'app ne doit jamais rester bloquée en écran blanc (splash
 * jamais masqué faute de `.catch` en amont) pour une raison de stockage
 * (CLAUDE.md, ADR-017 ; revue M1, Bloquant #2). Pendant natif de
 * `createSafeWebStorage` (web).
 */
export function createSafeAsyncStorage(storage: AsyncKeyValueStorage): AsyncKeyValueStorage {
  return {
    async getItem(key) {
      try {
        return await storage.getItem(key);
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      try {
        await storage.setItem(key, value);
      } catch {
        // Écriture perdue plutôt qu'un plantage : voir commentaire ci-dessus.
      }
    },
    async removeItem(key) {
      try {
        await storage.removeItem(key);
      } catch {
        // Idem.
      }
    },
  };
}
