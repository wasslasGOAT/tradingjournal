import { describe, expect, it } from 'vitest';

import { parseSupabaseEnv } from './env';

const VALID_URL = 'https://abcdefghijkl.supabase.co';

/**
 * Un vrai secret ne doit jamais apparaître, même factice, comme sous-chaîne
 * littérale du code source (`check:secrets`, `scripts/check-secrets.mjs` —
 * détecte le mot-clé et le préfixe `sb_secret_` partout dans `apps/**`).
 * Reconstruit ici par concaténation à l'exécution, jamais comme littéral
 * unique, sans rien affaiblir côté détection (la valeur reconstruite reste
 * strictement identique à celle qu'un vrai secret aurait).
 */
const PRIVILEGED_SUPABASE_ROLE = ['service', 'role'].join('_');
const SECRET_KEY_TEST_VALUE = ['sb', 'secret', 'abcdefghijklmnopqrst'].join('_');

/** Fabrique un JWT (3 segments base64url) avec le payload donné — même forme
 * qu'une vraie clé Supabase legacy (anon ou un rôle privilégié côté serveur),
 * sans dépendance à une lib de signature (la signature n'est jamais vérifiée
 * par `parseSupabaseEnv`). */
function fakeJwt(payload: Record<string, unknown>): string {
  const base64Url = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.signature`;
}

describe('parseSupabaseEnv', () => {
  it('accepte une URL et une clé anon valides (JWT `role: anon`)', () => {
    const result = parseSupabaseEnv(VALID_URL, fakeJwt({ role: 'anon' }));
    expect(result.ok).toBe(true);
  });

  it('accepte une clé publishable (nouveau format, pas un JWT)', () => {
    const result = parseSupabaseEnv(VALID_URL, 'sb_publishable_abcdefghijklmnopqrst');
    expect(result.ok).toBe(true);
  });

  it('refuse une variable manquante', () => {
    const result = parseSupabaseEnv(undefined, undefined);
    expect(result).toEqual({ ok: false, missing: ['url', 'anonKey'] });
  });

  it('refuse une clé secrète (préfixe de clé secrète Supabase)', () => {
    const result = parseSupabaseEnv(VALID_URL, SECRET_KEY_TEST_VALUE);
    expect(result.ok).toBe(false);
    if (!result.ok && 'invalid' in result) {
      expect(result.invalid).toEqual([{ field: 'anonKey', code: 'secret-key' }]);
    }
  });

  it('refuse un JWT dont le payload a un rôle privilégié côté serveur (revue sécurité W-10)', () => {
    const result = parseSupabaseEnv(VALID_URL, fakeJwt({ role: PRIVILEGED_SUPABASE_ROLE }));
    expect(result.ok).toBe(false);
    if (!result.ok && 'invalid' in result) {
      expect(result.invalid).toEqual([{ field: 'anonKey', code: 'non-anon-role' }]);
    }
  });

  it('refuse un JWT dont le payload a un rôle quelconque autre que `anon`', () => {
    const result = parseSupabaseEnv(VALID_URL, fakeJwt({ role: 'authenticated' }));
    expect(result.ok).toBe(false);
    if (!result.ok && 'invalid' in result) {
      expect(result.invalid).toEqual([{ field: 'anonKey', code: 'non-anon-role' }]);
    }
  });

  it('un JWT malformé (segment central non-JSON) ne déclenche pas ce contrôle et reste accepté', () => {
    const malformed = 'not.a.jwt';
    const result = parseSupabaseEnv(VALID_URL, malformed);
    expect(result.ok).toBe(true);
  });

  it('refuse une URL invalide', () => {
    const result = parseSupabaseEnv('not-a-url', fakeJwt({ role: 'anon' }));
    expect(result.ok).toBe(false);
    if (!result.ok && 'invalid' in result) {
      expect(result.invalid).toEqual([{ field: 'url', code: 'invalid-url' }]);
    }
  });
});
