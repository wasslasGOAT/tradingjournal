import { base } from '@repo/config/eslint';
import i18next from 'eslint-plugin-i18next';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base(import.meta.dirname),
  {
    // Modules CommonJS volontaires (chargés par Node/Tailwind hors bundler, ARCHITECTURE §6.2).
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Aucun texte UI en dur hors fichiers i18n (CLAUDE.md, ADR-013).
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: { 'i18next/no-literal-string': 'error' },
  },
  {
    // Règles des hooks React (revue M1, Important #3) : `apps/app` les reçoit via
    // `eslint-config-expo` (16 règles, `configs.recommended`), `packages/ui` en était
    // dépourvu bien que ce soit ici que vivent la plupart des hooks maison (`useTheme`,
    // stores Zustand, primitives `Sheet`/`Select`/`DateRangePicker`...). Même config
    // que `apps/app` (`node_modules/eslint-config-expo/flat/utils/react.js`) pour éviter
    // toute divergence de rigueur entre les deux zones.
    //
    // `environment.enableCustomTypeDefinitionForReanimated` (option native au plugin,
    // désactivée par défaut) : sans elle, `react-hooks/immutability`/`purity` confondent
    // `scale.value = …` (mutation intentionnelle d'un `SharedValue` Reanimated, l'API même
    // de la lib) avec une mutation d'état React interdite — faux positif sur toute
    // animation (`usePressScale`, `Sheet`…), pas une vraie violation de pureté.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: Object.fromEntries(
      Object.entries(reactHooks.configs.recommended.rules).map(([ruleName, severity]) => {
        // `rules-of-hooks`/`exhaustive-deps` : schéma d'options figé côté plugin
        // (`additionalProperties: false`, hérité de l'ancienne implémentation AST, pas du
        // moteur du compilateur) — n'acceptent pas `environment`.
        if (
          ruleName === 'react-hooks/rules-of-hooks' ||
          ruleName === 'react-hooks/exhaustive-deps'
        ) {
          return [ruleName, severity];
        }
        return [
          ruleName,
          [severity, { environment: { enableCustomTypeDefinitionForReanimated: true } }],
        ];
      }),
    ),
  },
];
