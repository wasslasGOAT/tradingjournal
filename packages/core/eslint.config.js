import { base, restrictImports } from '@repo/config/eslint';

// packages/core : logique pure, dépendances limitées (ARCHITECTURE §4).
//
// `decimal.js` n'est configuré (precision/rounding) que dans `money/decimal.ts` ;
// partout ailleurs, importer le `Decimal` configuré depuis `./money` (ou `@repo/core`).
// Une seule config `no-restricted-imports` doit s'appliquer par fichier : en config plate,
// le dernier bloc qui configure une règle en remplace entièrement les options (pas de merge).
// On utilise donc des blocs `files`/`ignores` disjoints plutôt que d'empiler des restrictions.
const NON_MONEY_ALLOWED = ['date-fns', 'date-fns-tz', '@repo/schemas'];
const MONEY_ALLOWED = ['decimal.js', 'date-fns', 'date-fns-tz', '@repo/schemas'];

export default [
  ...base(import.meta.dirname),
  // src/money/**/*.ts (hors tests) : seul endroit autorisé à importer decimal.js directement.
  {
    ...restrictImports(MONEY_ALLOWED, ['src/money/**/*.ts']),
    ignores: ['src/money/**/*.test.ts'],
  },
  // src/**/*.ts hors src/money/** et hors tests : pas de decimal.js (importer ./money).
  {
    ...restrictImports(NON_MONEY_ALLOWED, ['src/**/*.ts']),
    ignores: ['src/money/**', 'src/**/*.test.ts'],
  },
  // Tests dans src/money/** : + vitest (dev-only), decimal.js toujours autorisé.
  restrictImports([...MONEY_ALLOWED, 'vitest'], ['src/money/**/*.test.ts']),
  // Tests hors src/money/** : + vitest (dev-only), decimal.js toujours interdit.
  {
    ...restrictImports([...NON_MONEY_ALLOWED, 'vitest'], ['src/**/*.test.ts']),
    ignores: ['src/money/**'],
  },
];
