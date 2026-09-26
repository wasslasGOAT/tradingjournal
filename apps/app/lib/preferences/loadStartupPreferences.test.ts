import { describe, expect, it } from 'vitest';

import { loadStartupPreferences } from './loadStartupPreferences';
import type { AsyncKeyValueStorage } from '../storage/keyValueStorage.types';

function fakeStorage(initial: Record<string, string> = {}): AsyncKeyValueStorage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => Promise.resolve(store.get(key) ?? null),
    setItem: (key, value) => {
      store.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      store.delete(key);
      return Promise.resolve();
    },
  };
}

function rejectingStorage(): AsyncKeyValueStorage {
  return {
    getItem: () => Promise.reject(new Error('disk full')),
    setItem: () => Promise.reject(new Error('disk full')),
    removeItem: () => Promise.reject(new Error('disk full')),
  };
}

describe('loadStartupPreferences', () => {
  it('lit les préférences persistées et la langue', async () => {
    const storage = fakeStorage({
      'edgebook.preferences.themePreference': 'dark',
      'edgebook.preferences.pnlColorScheme': 'greenRed',
      'edgebook.preferences.hideAmounts': 'true',
      'edgebook.preferences.language': 'fr',
    });

    const result = await loadStartupPreferences(storage);

    expect(result).toEqual({
      preferences: { preference: 'dark', pnlColorScheme: 'greenRed', hideAmounts: true },
      languagePreference: 'fr',
    });
  });

  it('revient aux valeurs par défaut quand le stockage est vide', async () => {
    const result = await loadStartupPreferences(fakeStorage());

    expect(result).toEqual({
      preferences: { preference: 'system', pnlColorScheme: 'blueGray', hideAmounts: false },
      languagePreference: 'system',
    });
  });

  it('ne rejette jamais et revient aux valeurs par défaut quand le stockage échoue (Bloquant #2)', async () => {
    const result = await loadStartupPreferences(rejectingStorage());

    expect(result).toEqual({
      preferences: { preference: 'system', pnlColorScheme: 'blueGray', hideAmounts: false },
      languagePreference: 'system',
    });
  });
});
