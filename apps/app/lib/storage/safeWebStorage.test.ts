import { describe, expect, it, vi } from 'vitest';

import { createSafeWebStorage } from './safeWebStorage';
import type { MinimalSyncStorage } from './keyValueStorage.types';

function fakeStorage(initial: Record<string, string> = {}): MinimalSyncStorage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe('createSafeWebStorage', () => {
  it('lit et écrit via le stockage fourni', async () => {
    const backing = fakeStorage({ existing: 'value' });
    const storage = createSafeWebStorage(() => backing);

    await expect(storage.getItem('existing')).resolves.toBe('value');
    await expect(storage.getItem('missing')).resolves.toBeNull();

    await storage.setItem('new', 'hello');
    await expect(storage.getItem('new')).resolves.toBe('hello');
  });

  it('supprime une entrée', async () => {
    const backing = fakeStorage({ key: 'value' });
    const storage = createSafeWebStorage(() => backing);

    await storage.removeItem('key');

    await expect(storage.getItem('key')).resolves.toBeNull();
  });

  it('ne plante pas quand le stockage est indisponible (null/undefined)', async () => {
    const storageNull = createSafeWebStorage(() => null);
    const storageUndefined = createSafeWebStorage(() => undefined);

    await expect(storageNull.getItem('x')).resolves.toBeNull();
    await expect(storageNull.setItem('x', 'y')).resolves.toBeUndefined();
    await expect(storageNull.removeItem('x')).resolves.toBeUndefined();

    await expect(storageUndefined.getItem('x')).resolves.toBeNull();
  });

  it('ne plante pas si le stockage lance une exception (quota dépassé, accès refusé)', async () => {
    const throwing: MinimalSyncStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const storage = createSafeWebStorage(() => throwing);

    await expect(storage.getItem('x')).resolves.toBeNull();
    await expect(storage.setItem('x', 'y')).resolves.toBeUndefined();
    await expect(storage.removeItem('x')).resolves.toBeUndefined();
  });

  it('rappelle le thunk à chaque appel (permet un stockage qui devient disponible plus tard)', async () => {
    const getStorage = vi.fn<() => MinimalSyncStorage | null>().mockReturnValueOnce(null);
    const backing = fakeStorage();
    getStorage.mockReturnValue(backing);

    const storage = createSafeWebStorage(getStorage);

    await expect(storage.getItem('x')).resolves.toBeNull();
    await storage.setItem('x', 'y');
    await expect(storage.getItem('x')).resolves.toBe('y');
    // getItem, setItem, getItem : un appel du thunk par opération.
    expect(getStorage).toHaveBeenCalledTimes(3);
  });
});
