import { base } from '@repo/config/eslint';
import expoConfig from 'eslint-config-expo/flat.js';
import i18next from 'eslint-plugin-i18next';

export default [
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'ios/**',
      'android/**',
      'expo-env.d.ts',
      'nativewind-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...expoConfig,
  ...base(import.meta.dirname),
  {
    // Chargés en CommonJS par Metro/Tailwind (hors bundler), require() y est requis.
    files: ['metro.config.js', 'babel.config.js', 'tailwind.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Correctif revue M0 boucle 2 — Mineur 5 : ces fichiers sont exclus de `tsconfig.json`
    // (vérifiés séparément par `tsconfig.test.json`, voir ce fichier). Le project service
    // ESLint (`base()`, `packages/config/eslint.config.js`) ne recherche que
    // `tsconfig.json` par nom lors de la découverte automatique — sans cette
    // surcharge, ces fichiers échouent au lint avec « was not found by the project
    // service ». Bascule sur le mode `project` classique (tableau d'un seul tsconfig),
    // supporté par `typescript-eslint` indépendamment du project service utilisé pour
    // le reste du package.
    files: ['**/*.test.ts', 'e2e/**/*.ts', 'vitest.config.mts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Aucun texte UI en dur hors fichiers i18n (CLAUDE.md, ADR-013).
    files: ['app/**/*.tsx', 'components/**/*.tsx', 'features/**/*.tsx'],
    plugins: { i18next },
    rules: { 'i18next/no-literal-string': 'error' },
  },
];
