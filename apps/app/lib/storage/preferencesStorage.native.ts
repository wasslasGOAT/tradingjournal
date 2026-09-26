import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSafeAsyncStorage } from './safeAsyncStorage';
import type { AsyncKeyValueStorage } from './keyValueStorage.types';

/**
 * Stockage des préférences (thème, couleurs P&L, masquage des montants,
 * langue — M1-9) sur natif : AsyncStorage, comme `lib/query/storage.native.ts`
 * mais sous des clés dédiées (`preferencesStorage.ts`, `@repo/ui`) — pas le
 * même cycle de vie que le cache TanStack Query (jamais vidé au
 * déconnexion/reconnexion).
 *
 * Enveloppé par `createSafeAsyncStorage` : un rejet d'AsyncStorage (accès
 * disque refusé, stockage corrompu) ne doit jamais bloquer le démarrage sur
 * un écran blanc (revue M1, Bloquant #2).
 */
export const preferencesStorage: AsyncKeyValueStorage = createSafeAsyncStorage(AsyncStorage);
