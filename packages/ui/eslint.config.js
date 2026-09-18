import { base } from '@repo/config/eslint';
import i18next from 'eslint-plugin-i18next';

export default [
  ...base(import.meta.dirname),
  {
    // Modules CommonJS volontaires (chargés par Node/Tailwind hors bundler, ARCHITECTURE §6.2).
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Aucun texte UI en dur hors fichiers i18n (CLAUDE.md, ADR-013) ; pas encore de composants (M1).
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: { 'i18next/no-literal-string': 'error' },
  },
];
