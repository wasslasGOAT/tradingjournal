import { describe, expect, it, vi } from 'vitest';

import { defaultPnlColorScheme } from '../tokens';
import {
  PREFERENCES_STORAGE_KEYS,
  loadPersistedPreferences,
  parseHideAmounts,
  parsePnlColorScheme,
  parseThemePreference,
  persistHideAmounts,
  persistPnlColorScheme,
  persistThemePreference,
} from './preferencesStorage';
import type { PreferencesStorage } from './preferencesStorage';

/** Stockage en mémoire conforme à `PreferencesStorage`, pour les tests. */
function createMemoryStorage(initial: Record<string, string> = {}): PreferencesStorage & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key) => Promise.resolve(data[key] ?? null),
    setItem: (key, value) => {
      data[key] = value;
      return Promise.resolve();
    },
  };
}

describe('parseThemePreference', () => {
  it('lit une valeur valide', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('system')).toBe('system');
  });

  it('retombe sur "system" par défaut (absent)', () => {
    expect(parseThemePreference(null)).toBe('system');
  });

  it('retombe sur "system" si la valeur est invalide', () => {
    expect(parseThemePreference('sombre')).toBe('system');
    expect(parseThemePreference('')).toBe('system');
  });
});

describe('parsePnlColorScheme', () => {
  it('lit une valeur valide', () => {
    expect(parsePnlColorScheme('blueGray')).toBe('blueGray');
    expect(parsePnlColorScheme('greenRed')).toBe('greenRed');
  });

  it('retombe sur la valeur par défaut si absente ou invalide', () => {
    expect(parsePnlColorScheme(null)).toBe(defaultPnlColorScheme);
    expect(parsePnlColorScheme('violet')).toBe(defaultPnlColorScheme);
  });
});

describe('parseHideAmounts', () => {
  it('lit "true" comme activé', () => {
    expect(parseHideAmounts('true')).toBe(true);
  });

  it('retombe sur false par défaut, y compris pour une valeur invalide', () => {
    expect(parseHideAmounts(null)).toBe(false);
    expect(parseHideAmounts('false')).toBe(false);
    expect(parseHideAmounts('oui')).toBe(false);
  });
});

describe('loadPersistedPreferences', () => {
  it('restaure les trois préférences stockées', async () => {
    const storage = createMemoryStorage({
      [PREFERENCES_STORAGE_KEYS.themePreference]: 'light',
      [PREFERENCES_STORAGE_KEYS.pnlColorScheme]: 'greenRed',
      [PREFERENCES_STORAGE_KEYS.hideAmounts]: 'true',
    });

    await expect(loadPersistedPreferences(storage)).resolves.toEqual({
      preference: 'light',
      pnlColorScheme: 'greenRed',
      hideAmounts: true,
    });
  });

  it('renvoie les valeurs par défaut quand rien n’est stocké', async () => {
    const storage = createMemoryStorage();

    await expect(loadPersistedPreferences(storage)).resolves.toEqual({
      preference: 'system',
      pnlColorScheme: defaultPnlColorScheme,
      hideAmounts: false,
    });
  });

  it('renvoie les valeurs par défaut quand le contenu stocké est invalide', async () => {
    const storage = createMemoryStorage({
      [PREFERENCES_STORAGE_KEYS.themePreference]: 'nuit',
      [PREFERENCES_STORAGE_KEYS.pnlColorScheme]: 'rose',
      [PREFERENCES_STORAGE_KEYS.hideAmounts]: 'peut-être',
    });

    await expect(loadPersistedPreferences(storage)).resolves.toEqual({
      preference: 'system',
      pnlColorScheme: defaultPnlColorScheme,
      hideAmounts: false,
    });
  });
});

describe('persist*', () => {
  it('écrit chaque préférence sous sa clé dédiée', async () => {
    const storage = createMemoryStorage();

    await persistThemePreference(storage, 'dark');
    await persistPnlColorScheme(storage, 'greenRed');
    await persistHideAmounts(storage, true);

    expect(storage.data[PREFERENCES_STORAGE_KEYS.themePreference]).toBe('dark');
    expect(storage.data[PREFERENCES_STORAGE_KEYS.pnlColorScheme]).toBe('greenRed');
    expect(storage.data[PREFERENCES_STORAGE_KEYS.hideAmounts]).toBe('true');
  });

  it('sérialise hideAmounts=false en "false" (round-trip avec parseHideAmounts)', async () => {
    const storage = createMemoryStorage();

    await persistHideAmounts(storage, false);

    expect(parseHideAmounts(storage.data[PREFERENCES_STORAGE_KEYS.hideAmounts] ?? null)).toBe(
      false,
    );
  });

  it('délègue à `storage.setItem` (comportement injecté, aucune écriture directe)', async () => {
    const setItem = vi.fn().mockResolvedValue(undefined);
    const storage: PreferencesStorage = { getItem: vi.fn(), setItem };

    await persistThemePreference(storage, 'system');

    expect(setItem).toHaveBeenCalledWith(PREFERENCES_STORAGE_KEYS.themePreference, 'system');
  });
});
