import type { AsyncKeyValueStorage } from '../storage/keyValueStorage.types';

/**
 * Stockage de la session Supabase (T6, décision D5) : re-export du type commun,
 * pour un nom explicite côté appelants (`lib/supabase/client.ts`).
 * Implémentations : `authStorage.native.ts` (SecureStore + AsyncStorage chiffré) et
 * `authStorage.web.ts` (`localStorage`) — résolues par Metro selon la plateforme
 * (ARCHITECTURE §4 : « code spécifique plateforme via .web.tsx / .native.tsx »).
 */
export type AuthStorage = AsyncKeyValueStorage;
