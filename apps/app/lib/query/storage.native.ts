import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AsyncKeyValueStorage } from '../storage/keyValueStorage.types';

/**
 * Cache TanStack Query persisté sur natif : AsyncStorage (ARCHITECTURE §10 —
 * cible ultérieure MMKV, sans changer cette interface).
 */
export const queryCacheStorage: AsyncKeyValueStorage = AsyncStorage;
