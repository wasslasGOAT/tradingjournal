import { describe, expect, it, vi } from 'vitest';

import { createSafeAsyncStorage } from './safeAsyncStorage';
import type { AsyncKeyValueStorage } from './keyValueStorage.types';

function fakeAsyncStorage(initial: Record<string, string> = {}): AsyncKeyValueStorage {
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

function rejectingAsyncStorage(): AsyncKeyValueStorage {
  return {
    getItem: () => Promise.reject(new Error('disk full')),
    setItem: () => Promise.reject(new Error('disk full')),
    removeItem: () => Promise.reject(new Error('disk full')),
  };
}

describe('createSafeAsyncStorage', () => {
  it('lit et écrit via le stockage fourni', async () => {
    const backing = fakeAsyncStorage({ existing: 'value' });
    const storage = createSafeAsyncStorage(backing);

    await expect(storage.getItem('existing')).resolves.toBe('value');
    await expect(storage.getItem('missing')).resolves.toBeNull();

    await storage.setItem('new', 'hello');
    await expect(storage.getItem('new')).resolves.toBe('hello');
  });

  it('supprime une entrée', async () => {
    const backing = fakeAsyncStorage({ key: 'value' });
    const storage = createSafeAsyncStorage(backing);

    await storage.removeItem('key');

    await expect(storage.getItem('key')).resolves.toBeNull();
  });

  it('ne rejette jamais quand le stockage sous-jacent rejette (getItem)', async () => {
    const storage = createSafeAsyncStorage(rejectingAsyncStorage());

    await expect(storage.getItem('x')).resolves.toBeNull();
  });

  it('ne rejette jamais quand le stockage sous-jacent rejette (setItem, removeItem)', async () => {
    const storage = createSafeAsyncStorage(rejectingAsyncStorage());

    await expect(storage.setItem('x', 'y')).resolves.toBeUndefined();
    await expect(storage.removeItem('x')).resolves.toBeUndefined();
  });

  it('délègue chaque appel au stockage fourni', async () => {
    const backing = fakeAsyncStorage();
    const getItem = vi.spyOn(backing, 'getItem');
    const setItem = vi.spyOn(backing, 'setItem');
    const removeItem = vi.spyOn(backing, 'removeItem');
    const storage = createSafeAsyncStorage(backing);

    await storage.getItem('a');
    await storage.setItem('a', 'b');
    await storage.removeItem('a');

    expect(getItem).toHaveBeenCalledWith('a');
    expect(setItem).toHaveBeenCalledWith('a', 'b');
    expect(removeItem).toHaveBeenCalledWith('a');
  });
});
