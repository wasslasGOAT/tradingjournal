#!/usr/bin/env node
// Normalise un fichier généré par `supabase gen types typescript` pour comparer les types
// produits depuis le projet cloud (`pnpm db:types`) et depuis la base locale de la CI
// (`--local`). Les deux ne diffèrent que par des détails sans rapport avec le schéma :
// - le bloc `__InternalSupabase` (version de PostgREST), présent seulement côté cloud ;
// - les lignes vides en fin de fichier.
// Usage : node scripts/normalize-db-types.mjs <fichier>  → écrit la version normalisée sur stdout.
import { readFileSync } from 'node:fs';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('Usage : node scripts/normalize-db-types.mjs <fichier>');
  process.exit(2);
}

const normalized = readFileSync(file, 'utf8')
  .replace(/\r\n/g, '\n')
  // Commentaires générés juste avant le bloc, puis le bloc lui-même.
  .replace(/^[ \t]*\/\/[^\n]*\n[ \t]*\/\/[^\n]*\n(?=[ \t]*__InternalSupabase:)/m, '')
  .replace(/^[ \t]*__InternalSupabase: \{[^}]*\}\n/m, '')
  .trimEnd();

process.stdout.write(`${normalized}\n`);
