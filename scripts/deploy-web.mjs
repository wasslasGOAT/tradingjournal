#!/usr/bin/env node
/**
 * scripts/deploy-web.mjs
 *
 * Déploiement manuel de `apps/web` sur Cloudflare Pages (ADR-025, ROADMAP M1-web
 * W-8, docs/RELEASE.md §0 — option 1 : "wrangler pages deploy" lancé depuis le PC).
 *
 * Usage : `pnpm deploy:web [--dry-run] [--prod] [--allow-dirty]` (voir le script racine
 * `package.json`).
 *
 * Options :
 *   --dry-run     N'exécute ni le build ni le déploiement : affiche uniquement ce qui
 *                 serait fait (vérifications non destructrices toujours effectuées :
 *                 nom de branche, arbre de travail propre, format de la clé anon).
 *   --prod        Autorise un déploiement depuis `main` (branche de production Pages).
 *                 Sans ce drapeau, déployer depuis `main` est refusé. Demande en plus
 *                 une confirmation explicite tapée au clavier (jamais automatique).
 *   --allow-dirty Autorise un arbre de travail non propre (`git status` non vide) ;
 *                 passe `--commit-dirty=true` à `wrangler pages deploy` pour que ce
 *                 soit visible dans l'historique de déploiement Cloudflare.
 *
 * Ce que fait ce script :
 *   1. Vérifie le nom de la branche git courante, la propreté de l'arbre de travail, et
 *      (hors `--dry-run`) la présence et le format de `VITE_SUPABASE_URL` /
 *      `VITE_SUPABASE_ANON_KEY` — lues avec la même priorité que le build réel
 *      (`loadEnv('production', apps/web, 'VITE_')`, Vite : `.env`, `.env.local`,
 *      `.env.production`, `.env.production.local`, puis l'environnement du processus) —
 *      jamais la valeur de la clé, ni ici ni dans les logs. Hors `--dry-run`, l'absence de
 *      l'une ou l'autre de ces deux variables fait échouer le script.
 *   2. Construit `apps/web` (`pnpm --filter @repo/web build` → `apps/web/dist`). Les
 *      variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` sont lues par Vite selon
 *      la même priorité de fichiers `apps/web/.env*` (jamais commités, voir `.gitignore`
 *      et `apps/web/.env.example`) — ce script ne les affiche jamais (sauf la vérification
 *      de format ci-dessus, qui n'imprime jamais la valeur).
 *   3. Régénère `apps/web/dist/_headers` (`scripts/generate-web-headers.mjs --strict`) :
 *      remplace le placeholder `connect-src` par le host exact du projet Supabase (voir ce
 *      script et le commentaire en tête d'`apps/web/public/_headers`) ; `--strict` fait
 *      échouer cette étape si l'URL Supabase est introuvable ou invalide, un déploiement
 *      réel ne devant jamais partir avec un `connect-src` en joker.
 *   4. Scanne `apps/web/dist` (`scripts/check-secrets.mjs`) avant tout déploiement — les
 *      mêmes vérifications qu'en CI (job `quality`), mais sur le build qui va réellement
 *      partir en ligne.
 *   5. Déploie `apps/web/dist` avec `wrangler pages deploy` (via `pnpm dlx`, version
 *      épinglée — voir `WRANGLER_PACKAGE` ci-dessous — aucune installation locale de
 *      `wrangler`).
 *      `--branch` reprend la branche git courante : déployer depuis `main` publie
 *      sur la branche de production Pages (refusé sans `--prod` + confirmation, voir
 *      plus haut) ; déployer depuis toute autre branche (ex. `wip/m1-m3`) publie en
 *      **preview à URL fixe par branche** (`https://<branche-normalisée>.edgebook-bs9.pages.dev`,
 *      jamais une URL différente à chaque déploiement) — c'est cette URL fixe qui doit
 *      être ajoutée aux redirections d'auth Supabase (ADR-020), pas une URL par commit.
 *
 * Ne fait jamais : `wrangler login` (authentification interactive, à faire une
 * seule fois par l'utilisateur — voir docs/RELEASE.md §0) ni aucune écriture dans
 * le tableau de bord Cloudflare/Supabase.
 *
 * Piège Cloudflare (à ne jamais reproduire) : ce projet Pages a été créé une fois avec
 * `wrangler pages project create --production-branch=main` puis republié avec `--force`
 * pendant une expérimentation ; il est resté en mode Pages « classique » (pas Git
 * integration) et son host réel s'est retrouvé suffixé (`edgebook-bs9.pages.dev`, pas
 * `edgebook.pages.dev`) — un second `--force` ne « réparerait » rien et risquerait de
 * perturber le projet existant. Ce script ne passe donc **jamais** `--force` à wrangler ;
 * `--project-name=edgebook` (nom du projet, stable) reste correct, seul l'host public
 * affiché à l'utilisateur doit utiliser le vrai suffixe `-bs9` (voir `PAGES_HOST` et
 * `docs/RELEASE.md` §0).
 */

import { spawnSync } from 'node:child_process';
import { readSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const PROJECT_NAME = 'edgebook';
// Host public réel du projet Pages (voir le commentaire au-dessus sur le piège
// `--force`) : jamais `edgebook.pages.dev`, qui ne résout vers rien pour ce projet.
const PAGES_HOST = 'edgebook-bs9.pages.dev';
const DIST_DIR = 'apps/web/dist';
const WEB_DIR = resolve(ROOT, 'apps/web');

// Épinglée (jamais `wrangler@latest`) : un changement de comportement de wrangler entre
// deux déploiements ne doit jamais être une surprise silencieuse. À mettre à jour à la
// main quand une nouvelle version stable est vérifiée.
const WRANGLER_PACKAGE = 'wrangler@4.141.0';

// Nom de branche : uniquement ce que git accepte usuellement ET ce que wrangler peut
// normaliser sans ambiguïté en sous-domaine de preview. Rejette tout ce qui pourrait être
// interprété par le shell Windows (`shell: true` sur ce plateforme, voir `run()`
// ci-dessous) — espaces, `&`, `|`, `;`, etc.
const SAFE_BRANCH_NAME_RE = /^[A-Za-z0-9._/-]+$/;

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    dryRun: flags.has('--dry-run'),
    prod: flags.has('--prod'),
    allowDirty: flags.has('--allow-dirty'),
  };
}

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

function runGit(args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function getCurrentBranch() {
  const result = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  const branch = result.stdout.trim();
  if (result.status !== 0 || !branch || branch === 'HEAD') {
    console.error(
      '✖ Impossible de déterminer la branche git courante (HEAD détaché ou dépôt introuvable).',
    );
    process.exit(1);
  }
  if (!SAFE_BRANCH_NAME_RE.test(branch)) {
    console.error(
      `✖ Nom de branche « ${branch} » refusé (caractères non autorisés). ` +
        `Attendu : ${SAFE_BRANCH_NAME_RE}.`,
    );
    process.exit(1);
  }
  return branch;
}

function getCurrentCommitHash() {
  const result = runGit(['rev-parse', 'HEAD']);
  if (result.status !== 0 || !result.stdout.trim()) {
    console.error('✖ Impossible de déterminer le commit git courant.');
    process.exit(1);
  }
  return result.stdout.trim();
}

/** `true` si l'arbre de travail (fichiers suivis) a des changements non commités. Les
 * fichiers non suivis (`??`) ne bloquent pas : seuls des changements sur des fichiers
 * versionnés pourraient rendre le build silencieusement différent de HEAD.
 *
 * Échec fermé : si `git status` lui-même échoue (dépôt introuvable, git absent...), on ne
 * peut pas garantir que l'arbre de travail est propre — traité comme non propre, refusant
 * ainsi le déploiement par défaut plutôt que de le laisser passer sans avoir pu vérifier. */
function isWorkingTreeDirty() {
  const result = runGit(['status', '--porcelain']);
  if (result.status !== 0) {
    console.error(
      "\n✖ `git status` a échoué : impossible de vérifier la propreté de l'arbre de travail.",
    );
    return true;
  }
  return result.stdout
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .some((line) => !line.startsWith('??'));
}

/** Normalise un nom de branche comme le fait wrangler pour construire un sous-domaine de
 * preview (minuscules, tout caractère non `[a-z0-9-]` remplacé par `-`) — uniquement pour
 * l'affichage informatif de l'URL attendue à l'utilisateur, jamais utilisé comme argument
 * réel de wrangler (qui fait sa propre normalisation en interne). */
function previewSubdomainFor(branch) {
  return branch.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

function base64UrlDecode(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
}

/** `true` si `value` ressemble au format attendu d'une clé anon/publishable Supabase
 * (nouveau format `sb_publishable_...`, ou ancien JWT avec `"role":"anon"` dans son
 * payload) — ne vérifie jamais que la clé est *valide* auprès de Supabase (aucun appel
 * réseau ici), seulement son *format*, pour attraper un copier-coller de la mauvaise
 * variable (`service_role`, `sb_secret_...`). La valeur elle-même n'est jamais renvoyée
 * ni journalisée par cette fonction ni par son appelant. */
function looksLikeAnonKey(value) {
  if (!value) return false;
  if (value.startsWith('sb_publishable_')) return true;
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      return payload && payload.role === 'anon';
    } catch {
      return false;
    }
  }
  return false;
}

/** Lit `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` avec la même priorité que le build
 * réel (`vite build`) : `.env`, `.env.local`, `.env.production`, `.env.production.local`,
 * puis l'environnement du processus courant. Renvoie des valeurs possiblement
 * `undefined` — l'appelant décide si leur absence est bloquante (voir `main`). */
function readViteSupabaseEnv() {
  const env = loadEnv('production', WEB_DIR, 'VITE_');
  return {
    supabaseUrl: env.VITE_SUPABASE_URL || undefined,
    anonKey: env.VITE_SUPABASE_ANON_KEY || undefined,
  };
}

/** Demande une confirmation explicite tapée au clavier avant un déploiement en
 * production (jamais automatique, jamais déduite d'un autre drapeau) — lecture
 * synchrone de stdin (fd 0), sans dépendance externe. Renvoie `true` seulement si
 * l'utilisateur a tapé exactement `phrase`. */
function askForExactConfirmation(promptText, phrase) {
  process.stdout.write(`${promptText}\n> `);
  const buffer = Buffer.alloc(4096);
  let bytesRead = 0;
  try {
    bytesRead = readSync(0, buffer, 0, buffer.length, null);
  } catch {
    return false; // stdin non interactif (pas un TTY) : jamais de confirmation implicite.
  }
  const answer = buffer.toString('utf8', 0, bytesRead).trim();
  return answer === phrase;
}

function main() {
  const { dryRun, prod, allowDirty } = parseArgs(process.argv);

  const branch = getCurrentBranch();
  const isProductionBranch = branch === 'main';

  console.log(`Déploiement de ${DIST_DIR} sur le projet Cloudflare Pages « ${PROJECT_NAME} »`);
  console.log(`Branche git courante : ${branch}`);
  if (dryRun) {
    console.log('Mode --dry-run : aucune commande de build ni de déploiement ne sera exécutée.');
  }

  // --- 1. Vérifications non destructrices (toujours effectuées, même en --dry-run) ---

  if (isProductionBranch) {
    console.log(
      `→ branche de production Pages : ce déploiement irait sur l'URL de production, pas ` +
        `sur un sous-domaine de preview.`,
    );
    if (!prod) {
      console.error(
        '\n✖ Déploiement depuis `main` refusé sans `--prod` (voir docs/RELEASE.md §0). ' +
          'Ajouter `--prod` si un déploiement en production est réellement voulu.',
      );
      process.exit(1);
    }
    console.warn(
      '\n⚠ AVERTISSEMENT — tant que le projet Supabase de production n’existe pas encore ' +
        '(ADR-020, un seul projet Supabase « dev » existe à ce jour), un déploiement en ' +
        'production depuis `main` utilisera le même projet Supabase que la préproduction ' +
        '(ou échouera à se connecter si `apps/web/.env` pointe vers un projet inexistant). ' +
        'Ne pas continuer sans avoir vérifié quel projet Supabase `apps/web/.env` référence.',
    );
  } else {
    const previewUrl = `https://${previewSubdomainFor(branch)}.${PAGES_HOST}`;
    console.log(
      `→ preview à URL fixe pour cette branche (${previewUrl}) — à ajouter (une fois, telle ` +
        'quelle, jamais en joker) aux redirections d’auth Supabase si ce n’est pas déjà fait ' +
        '(ADR-020, docs/RELEASE.md §0). Jamais l’URL d’aperçu par commit.',
    );
  }

  const dirty = isWorkingTreeDirty();
  if (dirty && !allowDirty) {
    console.error(
      '\n✖ Arbre de travail non propre (fichiers suivis modifiés/indexés non commités). ' +
        'Committer, ou relancer avec `--allow-dirty` pour déployer quand même ' +
        '(passe `--commit-dirty=true` à wrangler, visible dans l’historique Cloudflare).',
    );
    process.exit(1);
  }
  if (dirty && allowDirty) {
    console.warn('\n⚠ Arbre de travail non propre : déploiement autorisé via --allow-dirty.');
  }

  // Lues avec la même priorité de fichiers que `vite build` (voir readViteSupabaseEnv) —
  // jamais affichées, ni ici ni dans les logs (sauf le format de la clé, plus bas, qui
  // n'imprime jamais sa valeur).
  const { supabaseUrl, anonKey } = readViteSupabaseEnv();

  if (!supabaseUrl) {
    if (dryRun) {
      console.warn(
        '\n⚠ VITE_SUPABASE_URL introuvable (apps/web/.env, .env.local, .env.production, ' +
          '.env.production.local ou variable d’environnement) : un déploiement réel échouerait ' +
          'ici (voir apps/web/.env.example).',
      );
    } else {
      console.error(
        '\n✖ VITE_SUPABASE_URL introuvable (apps/web/.env, .env.local, .env.production, ' +
          '.env.production.local ou variable d’environnement) : déploiement refusé ' +
          '(voir apps/web/.env.example).',
      );
      process.exit(1);
    }
  } else {
    console.log('✔ VITE_SUPABASE_URL trouvée.');
  }

  if (!anonKey) {
    if (dryRun) {
      console.warn(
        '\n⚠ VITE_SUPABASE_ANON_KEY introuvable : impossible de vérifier son format avant le ' +
          'build (voir apps/web/.env.example).',
      );
    } else {
      console.error(
        '\n✖ VITE_SUPABASE_ANON_KEY introuvable (apps/web/.env, .env.local, .env.production, ' +
          '.env.production.local ou variable d’environnement) : déploiement refusé ' +
          '(voir apps/web/.env.example).',
      );
      process.exit(1);
    }
  } else if (!looksLikeAnonKey(anonKey)) {
    console.error(
      '\n✖ VITE_SUPABASE_ANON_KEY ne ressemble pas à une clé anon/publishable ' +
        '(attendu : préfixe `sb_publishable_`, ou un JWT dont le payload contient ' +
        '`"role":"anon"` — tout autre rôle, y compris `authenticated`, est refusé). Valeur ' +
        'jamais affichée ici — vérifier qu’il ne s’agit pas d’une clé `service_role`/' +
        '`sb_secret_...` collée par erreur (CLAUDE.md, ADR-016/020).',
    );
    process.exit(1);
  } else {
    console.log('✔ Format de VITE_SUPABASE_ANON_KEY conforme (valeur jamais affichée).');
  }

  if (isProductionBranch && !dryRun) {
    const confirmed = askForExactConfirmation(
      '\nTaper exactement `DEPLOY PRODUCTION` pour confirmer ce déploiement en production ' +
        '(toute autre réponse annule) :',
      'DEPLOY PRODUCTION',
    );
    if (!confirmed) {
      console.error('\n✖ Confirmation absente ou incorrecte : déploiement annulé.');
      process.exit(1);
    }
  } else if (isProductionBranch && dryRun) {
    console.log(
      '[dry-run] Confirmation de production non demandée en mode --dry-run (aucune lecture de stdin).',
    );
  }

  if (dryRun) {
    const commitHash = getCurrentCommitHash();
    console.log('\n[dry-run] Étapes qui seraient exécutées :');
    console.log(`  1. pnpm --filter @repo/web build`);
    console.log(`  2. node scripts/generate-web-headers.mjs --strict`);
    console.log(`  3. node scripts/check-secrets.mjs (sur ${DIST_DIR})`);
    console.log(
      `  4. pnpm dlx --allow-build=esbuild --allow-build=workerd ${WRANGLER_PACKAGE} pages deploy ` +
        `${DIST_DIR} --project-name=${PROJECT_NAME} --branch=${branch} ` +
        `--commit-hash=${commitHash}${dirty ? ' --commit-dirty=true' : ''}`,
    );
    console.log('\n✔ --dry-run terminé : aucune commande ci-dessus n’a été exécutée.');
    return;
  }

  // --- 2. Build (lit apps/web/.env* via Vite, jamais affiché/loggé ici) ---
  run('pnpm', ['--filter', '@repo/web', 'build']);

  // --- 3. En-têtes : connect-src exact, mode strict (échoue si l'URL est introuvable ou
  // invalide — voir scripts/generate-web-headers.mjs) ---
  run('node', ['scripts/generate-web-headers.mjs', '--strict']);

  // --- 4. Secrets : mêmes vérifications qu'en CI, sur le build qui part réellement ---
  run('node', ['scripts/check-secrets.mjs']);

  // --- 5. Déploiement (pnpm dlx : aucune installation locale de wrangler) ---
  const commitHash = getCurrentCommitHash();
  const wranglerArgs = [
    'dlx',
    '--allow-build=esbuild',
    '--allow-build=workerd',
    WRANGLER_PACKAGE,
    'pages',
    'deploy',
    DIST_DIR,
    `--project-name=${PROJECT_NAME}`,
    `--branch=${branch}`,
    `--commit-hash=${commitHash}`,
  ];
  if (dirty) {
    wranglerArgs.push('--commit-dirty=true');
  }
  run('pnpm', wranglerArgs);

  console.log(
    '\n✔ Déploiement terminé. Vérifier les en-têtes et la PWA (voir docs/RELEASE.md §0).',
  );
}

main();
