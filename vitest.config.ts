import { defineConfig } from 'vitest/config';

// Un projet Vitest par package/app qui possède son propre vitest.config.ts.
export default defineConfig({
  test: {
    // `apps/app` est gelé depuis ADR-023 : exclu explicitement (pas de wildcard
    // `apps/*`) pour que ses tests ne tournent plus jamais depuis la racine.
    // Glob tolérant `.ts`/`.mts` : `apps/web/vitest.config.ts` peut être renommé en
    // `.mts` (avertissement Vite ESM/CJS) sans casser ce glob racine. Le glob ne
    // casse pas tant qu'`apps/web` n'existe pas encore (W-2) : un projet Vitest sans
    // fichier correspondant est simplement ignoré.
    projects: ['packages/*/vitest.config.{ts,mts}', 'apps/web/vitest.config.{ts,mts}'],
    passWithNoTests: true,
  },
});
