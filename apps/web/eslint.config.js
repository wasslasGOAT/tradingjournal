import { restrictImportsWeb, webBase } from '@repo/config/eslint';
import i18next from 'eslint-plugin-i18next';

export default [
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'playwright-report/**',
      'test-results/**',
      'src/routeTree.gen.ts',
      'src/styles/theme.generated.css',
    ],
  },
  ...webBase(import.meta.dirname),
  restrictImportsWeb(),
  {
    // Config/tests Node (pas de globals `browser` requis ici, `webBase` les
    // ajoute déjà en plus de `node` — bloc gardé pour le mode `project`
    // classique attendu par `tsconfig.node.json`, voir apps/app/eslint.config.js).
    files: ['*.config.ts', 'e2e/**/*.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Aucun texte UI en dur hors fichiers i18n (CLAUDE.md, ADR-013).
    files: ['src/routes/**/*.tsx', 'src/components/**/*.tsx', 'src/features/**/*.tsx'],
    plugins: { i18next },
    rules: { 'i18next/no-literal-string': 'error' },
  },
];
