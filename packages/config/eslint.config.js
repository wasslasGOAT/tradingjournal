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

/**
 * Préréglage navigateur (ADR-023) : mêmes règles que `base()`, mais avec les
 * globals `browser` (le code de `apps/web` tourne dans un onglet, pas sous
 * Node) en plus des globals `node` (config Vite, scripts locaux). Ignore en
 * plus `dev-dist` (précache de `vite-plugin-pwa` en dev).
 * @param {string} tsconfigRootDir
 */
export function webBase(tsconfigRootDir) {
  return tseslint.config(...base(tsconfigRootDir), {
    ignores: ['**/dev-dist/**'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  });
}

/**
 * `apps/web` est une app navigateur (ADR-023/024) : pas de React Native, pas
 * d'Expo (gelés avec `apps/app`), pas de barrel `@repo/ui` (gelé — seul le
 * sous-chemin `@repo/ui/tokens-data` reste autorisé), pas d'import direct
 * d'une autre app.
 * @param {string[]} files globs ciblés (défaut : le code source d'`apps/web`)
 */
export function restrictImportsWeb(files = ['src/**/*.{ts,tsx}']) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react-native', 'react-native/**', 'react-native-*', 'react-native-*/**'],
              message: 'apps/web est une app navigateur (ADR-023) : pas de React Native.',
            },
            {
              group: ['expo', 'expo/**', 'expo-*', 'expo-*/**', '@expo/*', '@expo/*/**'],
              message: 'apps/web est une app navigateur (ADR-023) : pas de dépendances Expo.',
            },
            {
              // `regex` plutôt que `group` : `group` s'appuie sur `ignore` (syntaxe
              // gitignore), où un motif de dossier comme `@repo/ui` ignore aussi tout
              // ce qu'il contient sans qu'une négation (`!@repo/ui/tokens-data`)
              // puisse le réintroduire (comportement gitignore documenté). Cette regex
              // bloque `@repo/ui` et tout sous-chemin sauf `@repo/ui/tokens-data`,
              // seul sous-chemin autorisé dans `apps/web` (ADR-023, W-3).
              regex: '^@repo/ui(?!/tokens-data$)(/.*)?$',
              message:
                'Le barrel @repo/ui est gelé avec apps/app (ADR-023) ; seul @repo/ui/tokens-data est autorisé.',
            },
            {
              group: ['@repo/app', '@repo/app/**', '**/apps/*/**'],
              message: 'apps/web ne doit rien importer directement depuis une autre app.',
            },
          ],
        },
      ],
    },
  };
}

export default base(import.meta.dirname);
