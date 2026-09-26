import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

// `defineConfig` (pas `defineProject`) : ce fichier sert à la fois de config
// racine quand Vitest est lancé depuis `apps/web` et de config de projet
// quand il est chargé via la liste `projects` du `vitest.config.ts` racine
// du monorepo (même convention que `packages/core/vitest.config.ts`).
export default defineConfig({
  resolve: {
    // Même alias que `vite.config.ts` (W-4) : les tests (`src/**/*.test.ts`)
    // importent aussi via `@/...` (ex. `components/chart/*.test.ts`).
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    passWithNoTests: true,
  },
});
