import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Configuration ESLint (flat) partagée.
 * Usage dans un package : `export default [...base(import.meta.dirname)]`.
 * @param {string} tsconfigRootDir
 */
export function base(tsconfigRootDir) {
  return tseslint.config(
    {
      ignores: ['**/dist/**', '**/.expo/**', '**/coverage/**', '**/*.d.ts', '**/database.types.ts'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
    { files: ['**/*.js', '**/*.mjs', '**/*.cjs'], ...tseslint.configs.disableTypeChecked },
    prettier,
  );
}

/**
 * Restreint les imports d'un package à une liste blanche (ex. packages/core, ARCHITECTURE §4).
 * @param {string[]} allowed noms de modules autorisés (les imports relatifs le sont toujours)
 * @param {string[]} files globs ciblés
 */
export function restrictImports(allowed, files = ['src/**/*.ts']) {
  const escaped = allowed.map((m) => m.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^(?!\\.|(${escaped.join('|')})(/|$))`,
              message: `Import interdit ici. Autorisés : ${allowed.join(', ')} (ARCHITECTURE §4).`,
            },
          ],
        },
      ],
    },
  };
}

export default base(import.meta.dirname);
