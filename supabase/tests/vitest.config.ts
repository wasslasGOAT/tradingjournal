import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Config Vitest dédiée aux tests RLS (`pnpm test:rls`), séparée des projets
// `packages/*/vitest.config.ts` / `apps/*/vitest.config.ts` agrégés par le
// `vitest.config.ts` racine : ces tests parlent à un vrai projet Supabase
// (local en CI, cloud « dev » sur le poste, ADR-020) avec deux clients
// authentifiés par la clé anon, jamais `service_role` (CLAUDE.md, ARCHITECTURE §9).
//
// Variables d'environnement : supabase/tests/.env (voir supabase/tests/README.md).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode || 'test', import.meta.dirname, '');
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    test: {
      name: 'rls',
      include: ['supabase/tests/**/*.test.ts'],
      environment: 'node',
      // Ces tests parlent à un vrai réseau (Supabase local ou cloud « dev ») :
      // signUp/signIn de deux utilisateurs + plusieurs requêtes PostgREST par
      // test peuvent dépasser le timeout par défaut de Vitest (5s), en
      // particulier contre un projet cloud. `hookTimeout` couvre `beforeAll`
      // (création des utilisateurs A et B).
      testTimeout: 20_000,
      hookTimeout: 20_000,
    },
  };
});
