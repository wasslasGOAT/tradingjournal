import { defineConfig } from 'vitest/config';

// Un projet Vitest par package/app qui possède son propre vitest.config.ts.
export default defineConfig({
  test: {
    // Glob tolérant `.ts`/`.mts` : `apps/app/vitest.config.ts` peut être renommé en
    // `.mts` par l'agent app-ui (avertissement Vite ESM/CJS) sans casser ce glob racine.
    projects: ['packages/*/vitest.config.{ts,mts}', 'apps/*/vitest.config.{ts,mts}'],
    passWithNoTests: true,
  },
});
