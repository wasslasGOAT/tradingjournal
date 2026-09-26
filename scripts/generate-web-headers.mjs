#!/usr/bin/env node
/**
 * scripts/generate-web-headers.mjs
 *
 * Remplace le placeholder `__SUPABASE_CONNECT_SRC__` d'`apps/web/dist/_headers` (copié
 * tel quel depuis `apps/web/public/_headers` par `vite build`) par le host **exact** du
 * projet Supabase utilisé pour ce build, plutôt que le joker `https://*.supabase.co`
 * (voir le commentaire en tête d'`apps/web/public/_headers` pour la justification
 * complète). Appelé par `scripts/deploy-web.mjs` juste après le build, avant
 * `check-secrets.mjs` et le déploiement.
 *
 * Ce script lit `VITE_SUPABASE_URL` via `loadEnv('production', <apps/web>, 'VITE_')`
 * (Vite) — jamais `VITE_SUPABASE_ANON_KEY`, jamais affichée ni loggée par ce fichier —
 * cette URL n'est de toute façon pas secrète, elle est embarquée en clair dans le bundle
 * JS livré au navigateur. `loadEnv` applique la même priorité de fichiers que le build
 * réel (`vite build`) : `.env`, `.env.local`, `.env.production`, `.env.production.local`,
 * puis l'environnement du processus courant.
 *
 * Deux modes :
 *   - Par défaut (CI, ou premier build local avant configuration) : si l'URL est absente
 *     ou invalide, retombe sur le joker `*.supabase.co`, avec un avertissement — n'échoue
 *     jamais faute de configuration Supabase.
 *   - `--strict` (utilisé par `scripts/deploy-web.mjs` avant tout déploiement réel) :
 *     échoue si l'URL est introuvable ou invalide. Un déploiement ne doit jamais partir
 *     avec un `connect-src` en joker.
 *
 * Usage : `node scripts/generate-web-headers.mjs [--strict]`.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WEB_DIR = resolve(ROOT, 'apps/web');
const HEADERS_PATH = resolve(ROOT, 'apps/web/dist/_headers');
const PLACEHOLDER = '__SUPABASE_CONNECT_SRC__';
const FALLBACK_CONNECT_SRC = 'https://*.supabase.co wss://*.supabase.co';

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return { strict: flags.has('--strict') };
}

/** Déduit le schéma `connect-src` (http(s) + ws(s)) depuis le protocole réel de l'URL
 * Supabase : `http:` → `ws:`, `https:` → `wss:`. N'impose jamais `https` sur une URL
 * locale (ex. `http://127.0.0.1:54321` en développement contre Supabase local). */
function connectSrcFromSupabaseUrl(rawUrl) {
  const url = new URL(rawUrl); // lève si invalide — laissé à l'appelant.
  const httpScheme = url.protocol === 'http:' ? 'http:' : 'https:';
  const wsScheme = url.protocol === 'http:' ? 'ws:' : 'wss:';
  return `${httpScheme}//${url.host} ${wsScheme}//${url.host}`;
}

function main() {
  const { strict } = parseArgs(process.argv);

  if (!existsSync(HEADERS_PATH)) {
    console.error(
      `✖ generate-web-headers — ${HEADERS_PATH} introuvable (le build a-t-il bien produit apps/web/dist ?).`,
    );
    process.exit(1);
  }

  // Même priorité que `vite build` : .env, .env.local, .env.production,
  // .env.production.local, puis l'environnement du processus.
  const env = loadEnv('production', WEB_DIR, 'VITE_');
  const supabaseUrl = env.VITE_SUPABASE_URL;

  let connectSrc;
  if (!supabaseUrl) {
    if (strict) {
      console.error(
        '✖ generate-web-headers --strict — VITE_SUPABASE_URL introuvable (apps/web/.env, ' +
          '.env.local, .env.production, .env.production.local ou variable d’environnement). ' +
          'Un déploiement réel ne doit jamais partir avec un connect-src en joker.',
      );
      process.exit(1);
    }
    connectSrc = FALLBACK_CONNECT_SRC;
    console.warn(
      `⚠ generate-web-headers — VITE_SUPABASE_URL introuvable : ` +
        `connect-src reste sur le joker ${FALLBACK_CONNECT_SRC} (attendu en CI).`,
    );
  } else {
    try {
      connectSrc = connectSrcFromSupabaseUrl(supabaseUrl);
      console.log(`generate-web-headers — connect-src fixé sur le host exact du projet Supabase.`);
    } catch {
      if (strict) {
        console.error(
          `✖ generate-web-headers --strict — VITE_SUPABASE_URL (« ${supabaseUrl} ») n'est pas ` +
            'une URL valide. Un déploiement réel ne doit jamais partir avec un connect-src en joker.',
        );
        process.exit(1);
      }
      connectSrc = FALLBACK_CONNECT_SRC;
      console.warn(
        `⚠ generate-web-headers — VITE_SUPABASE_URL (« ${supabaseUrl} ») n'est pas une URL ` +
          `valide : repli sur le joker ${FALLBACK_CONNECT_SRC}.`,
      );
    }
  }

  const headersContent = readFileSync(HEADERS_PATH, 'utf8');
  if (!headersContent.includes(PLACEHOLDER)) {
    console.error(
      `✖ generate-web-headers — placeholder ${PLACEHOLDER} introuvable dans ${HEADERS_PATH} ` +
        '(apps/web/public/_headers a-t-il été modifié sans garder le placeholder ?).',
    );
    process.exit(1);
  }

  // Uniquement sur les lignes qui ne sont pas des commentaires (`#`) : le placeholder
  // apparaît aussi, littéralement, dans le commentaire qui explique ce mécanisme
  // (voir l'en-tête d'`apps/web/public/_headers`) — ce texte documentaire ne doit pas
  // être réécrit lui aussi.
  const updatedContent = headersContent
    .split(/\r\n|\r|\n/)
    .map((line) =>
      line.trimStart().startsWith('#') ? line : line.replaceAll(PLACEHOLDER, connectSrc),
    )
    .join('\n');

  writeFileSync(HEADERS_PATH, updatedContent, 'utf8');
}

main();
