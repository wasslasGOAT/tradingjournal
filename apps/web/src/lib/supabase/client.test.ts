import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupabaseClientState, resetSupabaseClientStateForTests } from './client';

describe('getSupabaseClientState — accès à `localStorage` refusé (revue sécurité W-10)', () => {
  beforeEach(() => {
    resetSupabaseClientStateForTests();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdefghijkl.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_abcdefghijklmnopqrst');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetSupabaseClientStateForTests();
  });

  it('renvoie `storage-unavailable` (pas `invalid-env`/url) quand `window.localStorage` lève', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });

    try {
      const state = getSupabaseClientState();
      expect(state).toEqual({ status: 'storage-unavailable' });
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('renvoie `ready` quand `localStorage` est accessible', () => {
    const state = getSupabaseClientState();
    expect(state.status).toBe('ready');
  });
});
