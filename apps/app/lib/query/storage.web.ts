import { createSafeWebStorage } from '../storage/safeWebStorage';
import type { AsyncKeyValueStorage } from '../storage/keyValueStorage.types';

/**
 * Cache TanStack Query persisté sur web : `window.localStorage` (ARCHITECTURE §10 —
 * cible ultérieure IndexedDB, sans changer cette interface).
 */
export const queryCacheStorage: AsyncKeyValueStorage = createSafeWebStorage(() =>
  typeof window === 'undefined' ? null : window.localStorage,
);
