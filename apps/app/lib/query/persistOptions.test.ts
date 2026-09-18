import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  CACHE_SCHEMA_VERSION,
  clearPersistedCache,
  createPersistOptions,
  persistKeyFor,
} from './persistOptions';

describe('persistKeyFor', () => {
  it('renvoie la clé partagée quand aucun utilisateur n’est connecté', () => {
    expect(persistKeyFor(null)).toBe('edgebook-query-cache');
  });

  it('isole la clé par utilisateur', () => {
    expect(persistKeyFor('user-1')).toBe('edgebook-query-cache:user-1');
    expect(persistKeyFor('user-2')).toBe('edgebook-query-cache:user-2');
    expect(persistKeyFor('user-1')).not.toBe(persistKeyFor('user-2'));
  });
});

describe('createPersistOptions', () => {
  it('utilise la clé partagée par défaut (pas d’utilisateur)', () => {
    const options = createPersistOptions();

    expect(options.persister).toBeDefined();
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it('accepte un identifiant d’utilisateur explicite sans lancer', () => {
    expect(() => createPersistOptions('user-1')).not.toThrow();
  });

  it('inclut le buster de version du schéma de cache (Mineur 13, invalidation après mise à jour)', () => {
    const options = createPersistOptions();

    expect(options.buster).toBe(CACHE_SCHEMA_VERSION);
    expect(CACHE_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});

describe('clearPersistedCache', () => {
  it('vide le queryClient en mémoire et le persister', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['some-key'], 'value');
    const removeClient = vi.fn().mockResolvedValue(undefined);
    const persister = {
      persistClient: vi.fn(),
      restoreClient: vi.fn(),
      removeClient,
    };

    await clearPersistedCache(queryClient, persister);

    expect(queryClient.getQueryData(['some-key'])).toBeUndefined();
    expect(removeClient).toHaveBeenCalledTimes(1);
  });
});
