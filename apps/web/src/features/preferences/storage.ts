/**
 * Interface minimale de stockage clé/valeur pour les préférences (thème,
 * langue, masquage des montants…). Volontairement réduite (comme
 * `packages/ui/src/theme/preferencesStorage.ts` côté Expo, gelé — non
 * importable ici, ADR-023) : ce qui deviendra natif avec Capacitor
 * (`@capacitor/preferences`) passera derrière cette même interface, en
 * remplaçant uniquement `webLocalStorage` (règle CLAUDE.md « interface +
 * implémentation web »).
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Implémentation web (`localStorage`), enveloppée de `try/catch` : peut lever
 * (mode privé de certains navigateurs, quota dépassé, contexte non
 * navigateur) — une préférence non lue/écrite ne doit jamais faire planter
 * l'app (retombe silencieusement sur la valeur par défaut de l'appelant).
 */
export const webLocalStorage: KeyValueStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignoré volontairement : préférence non persistée, l'app reste utilisable.
    }
  },
};
