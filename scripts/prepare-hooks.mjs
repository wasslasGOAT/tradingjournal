#!/usr/bin/env node
/**
 * scripts/prepare-hooks.mjs
 *
 * Appelé par le script npm `prepare` (racine) à chaque `pnpm install` : pointe
 * git vers `.githooks/` (`core.hooksPath`) pour activer `.githooks/pre-commit`
 * (bloque un commit contenant un secret, voir scripts/check-secrets.mjs
 * --staged). N'échoue jamais si le dossier courant n'est pas (ou plus) un
 * dépôt git (ex. install depuis un tarball, environnement CI sans .git) :
 * `prepare` ne doit jamais faire échouer `pnpm install`.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const isRepo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
  cwd: ROOT,
  encoding: 'utf8',
});

if (isRepo.status !== 0 || isRepo.stdout.trim() !== 'true') {
  console.log('prepare-hooks — pas un dépôt git ici, rien à faire.');
  process.exit(0);
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: ROOT,
  encoding: 'utf8',
});

if (result.status !== 0) {
  // Ne bloque jamais `pnpm install` pour ça (ex. dépôt en lecture seule).
  console.warn(
    'prepare-hooks — impossible de configurer core.hooksPath (ignoré) :',
    result.stderr?.trim(),
  );
  process.exit(0);
}

console.log('prepare-hooks — core.hooksPath = .githooks (hook pre-commit activé).');
