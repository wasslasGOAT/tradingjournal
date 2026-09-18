import { describe, expect, it } from 'vitest';

import { parseSupabaseEnv } from './env';

const VALID_URL = 'https://abcdefghijkl.supabase.co';
const VALID_ANON_KEY = 'sb_publishable_abcdefghijklmnopqrstuvwx';

// Valeurs telles qu'écrites dans apps/app/.env.example : ne doivent jamais être
// acceptées comme configuration valide.
const EXAMPLE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const EXAMPLE_ANON_KEY = 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx';

// Assemblée au runtime (comme dans `scripts/check-secrets.mjs`) pour qu'aucune
// valeur ressemblant à une vraie clé secrète Supabase n'apparaisse telle quelle
// dans le code source : `pnpm check:secrets` scanne le texte des fichiers, pas
// la valeur des chaînes à l'exécution, et signalerait un faux positif sinon.
const FAKE_SECRET_ANON_KEY = ['sb', '_secret_', 'abcdefghijklmnopqrstuvwx'].join('');

describe('parseSupabaseEnv', () => {
  it('accepte une URL et une clé valides', () => {
    expect(parseSupabaseEnv(VALID_URL, VALID_ANON_KEY)).toEqual({
      ok: true,
      env: { url: VALID_URL, anonKey: VALID_ANON_KEY },
    });
  });

  it("recadre les espaces superflus (copier/coller d'un .env)", () => {
    expect(parseSupabaseEnv(` ${VALID_URL} `, ` ${VALID_ANON_KEY}\n`)).toEqual({
      ok: true,
      env: { url: VALID_URL, anonKey: VALID_ANON_KEY },
    });
  });

  it('signale `url` manquante quand la variable est absente', () => {
    expect(parseSupabaseEnv(undefined, VALID_ANON_KEY)).toEqual({
      ok: false,
      missing: ['url'],
    });
  });

  it('signale `anonKey` manquante quand la variable est une chaîne vide', () => {
    expect(parseSupabaseEnv(VALID_URL, '')).toEqual({
      ok: false,
      missing: ['anonKey'],
    });
  });

  it('signale les deux variables manquantes', () => {
    expect(parseSupabaseEnv(undefined, undefined)).toEqual({
      ok: false,
      missing: ['url', 'anonKey'],
    });
  });

  it("rejette les valeurs d'exemple de .env.example (jamais renseignées)", () => {
    expect(parseSupabaseEnv(EXAMPLE_URL, EXAMPLE_ANON_KEY)).toEqual({
      ok: false,
      missing: ['url', 'anonKey'],
    });
  });

  it("rejette une seule valeur d'exemple laissée en place", () => {
    expect(parseSupabaseEnv(EXAMPLE_URL, VALID_ANON_KEY)).toEqual({
      ok: false,
      missing: ['url'],
    });
  });

  // Mineur 9 (revue M0) : une valeur présente mais mal formée doit produire
  // `invalid`, jamais `missing` (message trompeur) ni une exception propagée
  // jusqu'à `createClient`.
  describe('invalid-env (correctif Mineur 9)', () => {
    it('rejette une URL malformée (`new URL()` échoue)', () => {
      expect(parseSupabaseEnv('not-a-url', VALID_ANON_KEY)).toEqual({
        ok: false,
        invalid: [{ field: 'url', code: 'invalid-url' }],
      });
    });

    it('rejette une URL http (non-locale) : https requis', () => {
      expect(parseSupabaseEnv('http://abcdefghijkl.supabase.co', VALID_ANON_KEY)).toEqual({
        ok: false,
        invalid: [{ field: 'url', code: 'invalid-url' }],
      });
    });

    it('accepte une URL http sur localhost (Supabase local)', () => {
      expect(parseSupabaseEnv('http://localhost:54321', VALID_ANON_KEY)).toEqual({
        ok: true,
        env: { url: 'http://localhost:54321', anonKey: VALID_ANON_KEY },
      });
    });

    it('accepte une URL http sur 127.0.0.1 (Supabase local)', () => {
      expect(parseSupabaseEnv('http://127.0.0.1:54321', VALID_ANON_KEY)).toEqual({
        ok: true,
        env: { url: 'http://127.0.0.1:54321', anonKey: VALID_ANON_KEY },
      });
    });

    it('rejette une clé secrète (préfixe interdit) — jamais embarquée côté client', () => {
      expect(parseSupabaseEnv(VALID_URL, FAKE_SECRET_ANON_KEY)).toEqual({
        ok: false,
        invalid: [{ field: 'anonKey', code: 'secret-key' }],
      });
    });

    it('cumule les deux problèmes si URL et clé sont toutes deux invalides', () => {
      expect(parseSupabaseEnv('not-a-url', FAKE_SECRET_ANON_KEY)).toEqual({
        ok: false,
        invalid: [
          { field: 'url', code: 'invalid-url' },
          { field: 'anonKey', code: 'secret-key' },
        ],
      });
    });
  });
});
