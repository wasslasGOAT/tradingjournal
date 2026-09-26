#!/usr/bin/env node
/**
 * scripts/deploy-web.mjs
 *
 * Déploiement manuel de `apps/web` sur Cloudflare Pages (ADR-025, ROADMAP M1-web
 * W-8, docs/RELEASE.md §0 — option 1 : "wrangler pages deploy" lancé depuis le PC).
 *
 * Usage : `pnpm deploy:web` (voir le script racine `package.json`).
 *
 * Ce que fait ce script :
 *   1. Construit `apps/web` (`pnpm --filter @repo/web build` → `apps/web/dist`).
 *      Les variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` sont lues par
 *      Vite depuis `apps/web/.env` (jamais commité, voir `.gitignore` et
 *      `apps/web/.env.example`) — ce script ne les lit ni ne les affiche jamais.
 *   2. Déploie `apps/web/dist` avec `wrangler pages deploy` (via `pnpm dlx`, aucune
 *      installation locale de `wrangler` : voir docs/RELEASE.md §0 pour la
 *      justification de ce choix).
 *      `--branch` reprend la branche git courante : déployer depuis `main` publie
 *      sur la branche de production Pages (URL de production) ; déployer depuis
 *      toute autre branche (ex. `wip/m1-m3`) publie en **preview à URL fixe par
 *      branche** (`https://<branche-normalisée>.edgebook.pages.dev`), jamais une
 *      URL différente à chaque déploiement — c'est cette URL fixe qui doit être
 *      ajoutée aux redirections d'auth Supabase (ADR-020), pas une URL par commit.
 *
 * Ne fait jamais : `wrangler login` (authentification interactive, à faire une
 * seule fois par l'utilisateur — voir docs/RELEASE.md §0) ni aucune écriture dans
 * le tableau de bord Cloudflare/Supabase.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const PROJECT_NAME = 'edgebook';
const DIST_DIR = 'apps/web/dist';

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    console.error(`\n✖ Échec de : ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

function getCurrentBranch() {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const branch = result.stdout.trim();
  if (result.status !== 0 || !branch || branch === 'HEAD') {
    console.error(
      '✖ Impossible de déterminer la branche git courante (HEAD détaché ou dépôt introuvable).',
    );
    process.exit(1);
  }
  return branch;
}

function main() {
  const branch = getCurrentBranch();

  console.log(`Déploiement de ${DIST_DIR} sur le projet Cloudflare Pages « ${PROJECT_NAME} »`);
  console.log(`Branche git courante : ${branch}`);
  console.log(
    branch === 'main'
      ? '→ branche de production Pages : ce déploiement ira en production.'
      : `→ preview à URL fixe pour cette branche (jamais ajoutée seule aux redirections d'auth : voir docs/RELEASE.md §0).`,
  );

  // 1. Build (lit apps/web/.env via Vite, jamais affiché/loggé ici).
  run('pnpm', ['--filter', '@repo/web', 'build']);

  // 2. Déploiement (pnpm dlx : aucune installation locale de wrangler).
  run('pnpm', [
    'dlx',
    '--allow-build=esbuild',
    '--allow-build=workerd',
    'wrangler',
    'pages',
    'deploy',
    DIST_DIR,
    `--project-name=${PROJECT_NAME}`,
    `--branch=${branch}`,
  ]);

  console.log(
    '\n✔ Déploiement terminé. Vérifier les en-têtes et la PWA (voir docs/RELEASE.md §0).',
  );
}

main();
