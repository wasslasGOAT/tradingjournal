import { createSafeWebStorage } from '../storage/safeWebStorage';
import type { AuthStorage } from './authStorage.types';

/**
 * Session Supabase sur web : `window.localStorage` (T6, décision D5), enveloppé
 * par `createSafeWebStorage` pour ne jamais planter si indisponible (export
 * statique, contexte sans `window`).
 */
export const authStorage: AuthStorage = createSafeWebStorage(() =>
  typeof window === 'undefined' ? null : window.localStorage,
);
