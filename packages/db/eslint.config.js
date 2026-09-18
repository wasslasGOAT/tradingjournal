import { base } from '@repo/config/eslint';

// `database.types.ts` est généré par `supabase gen types typescript` (ou écrit à
// l'identique en attendant un projet lié, ADR-020) : jamais édité à la main, jamais
// linté (même traitement que les `.d.ts`, packages/config/eslint.config.js).
export default [{ ignores: ['src/database.types.ts'] }, ...base(import.meta.dirname)];
