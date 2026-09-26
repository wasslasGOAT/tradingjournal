import { defineConfig } from 'vitest/config';

// `defineConfig` (pas `defineProject`) : ce fichier sert à la fois de config
// racine quand Vitest est lancé depuis `packages/core` (`test:coverage`,
// ROADMAP M3 — seuil de couverture bloquant, uniquement valide dans un
// schéma de config racine, `coverage` n'existe pas dans le schéma restreint
// `ProjectConfig`) et de config de projet quand il est chargé via la liste
// `projects` du `vitest.config.ts` racine du monorepo.
export default defineConfig({
  test: {
    name: 'core',
    // `test/golden/**` : tests golden (ROADMAP M3-8) lisant `fixture.json`,
    // séparés de `src/` pour ne pas mélanger fixture + script de génération
    // (`build.mjs`, non testé, exécuté une seule fois à la main) avec le
    // code source.
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // `testHelpers.ts` : utilitaire de test partagé (pas de code métier,
      // pas testé pour lui-même — exercé indirectement par les tests qui
      // l'utilisent).
      exclude: ['src/**/*.test.ts', 'src/**/testHelpers.ts'],
      // Seuil bloquant (ROADMAP M3, critère de fin) : `test:coverage` échoue
      // si la couverture de `@repo/core` descend sous 90 %.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
