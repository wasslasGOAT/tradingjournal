import { createSafeWebStorage } from './safeWebStorage';
import type { AsyncKeyValueStorage } from './keyValueStorage.types';

/**
 * Stockage des préférences (thème, couleurs P&L, masquage des montants,
 * langue — M1-9) sur web : `window.localStorage`, comme
 * `lib/query/storage.web.ts` mais sous des clés dédiées
 * (`preferencesStorage.ts`, `@repo/ui`).
 */
export const preferencesStorage: AsyncKeyValueStorage = createSafeWebStorage(() =>
  typeof window === 'undefined' ? null : window.localStorage,
);
