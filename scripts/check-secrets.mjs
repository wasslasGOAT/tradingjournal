#!/usr/bin/env node
/**
 * scripts/check-secrets.mjs
 *
 * Vérifie qu'aucun secret ne s'est glissé dans le dépôt (CLAUDE.md : « aucun
 * secret côté client » ; contexte MVP sans serveur, seule la clé anon/publishable
 * est autorisée côté client, docs/DECISIONS.md ADR-016/ADR-020).
 *
 * Usage :
 *   node scripts/check-secrets.mjs             (ou `pnpm check:secrets`)
 *     Scanne l'arbre de travail complet (fichiers versionnables du dépôt).
 *   node scripts/check-secrets.mjs --staged
 *     Scanne uniquement le contenu **indexé** (`git show :path`) des fichiers
 *     actuellement dans l'index git (`git diff --cached`). Utilisé par le hook
 *     `.githooks/pre-commit` : bloque un commit avant qu'il n'existe.
 *   node scripts/check-secrets.mjs --history
 *     Scanne tout l'historique git (`git log -p --all`), lignes **ajoutées**
 *     uniquement (préfixe `+`), avec les mêmes motifs — détecte un secret qui
 *     aurait été committé puis supprimé. Fonctionne sans erreur sur un dépôt
 *     sans aucun commit (sortie vide). Utilisé en CI (`quality`, job unique
 *     avec `fetch-depth: 0`).
 *
 * Aucune dépendance externe (Node >= 24 requis).
 *
 * Ce que le script détecte, dans le texte scanné (selon le mode ci-dessus) :
 *   1. Le mot `service_role` dans `apps/**` ou `packages/**` (sauf fichiers `.md`).
 *   2. Une clé secrète Supabase (préfixe `sb_secret_` suivi d'une valeur, nouveau
 *      format Supabase), partout.
 *   3. Le nom de variable `SUPABASE_SERVICE_ROLE_KEY`, partout.
 *   4. Un JWT (3 segments base64url) dont le payload décodé contient
 *      `"role":"service_role"`, partout.
 *   5. Un jeton personnel Supabase `sbp_[a-f0-9]{20,}`, partout.
 *   6. Une URL Postgres avec mot de passe en clair (`postgres(ql)?://user:pass@…`),
 *      partout.
 *   7. Le préfixe de clé API Anthropic `sk-ant-`, partout.
 *   8. Un en-tête de clé privée (`-----BEGIN [RSA|EC|OPENSSH ]PRIVATE KEY-----`),
 *      partout.
 *   9. (Mode par défaut uniquement) Un fichier `.env` réel (tout fichier dont le
 *      nom commence par `.env`, sauf `*.env.example`) suivi par git.
 *  10. (Mode `--history` uniquement) Un fichier `.env` réel qui a existé à un
 *      moment donné dans l'historique, même supprimé depuis.
 * Le mode par défaut vérifie aussi que `apps/app/.env` et `supabase/tests/.env`
 * seraient bien ignorés par git (sanity check du `.gitignore`).
 *
 * Les fichiers `*.env.example` sont volontairement scannés par les motifs 1 à 8
 * ci-dessus, dans les trois modes (défaut, `--staged`, `--history`) : ils sont
 * versionnés, donc un vrai secret collé dedans par erreur doit être détecté
 * comme n'importe quel autre fichier. Ils ne sont exclus que des vérifications
 * 9/10 (fichier `.env` réel), qui ne les concernent pas par définition.
 *
 * `.expo/` (caches Metro potentiellement volumineux) n'est pas parcouru en
 * entier pour des raisons de performance, mais les logs de dev qu'il peut
 * contenir (`**\/.expo/**\/*.log`) sont scannés explicitement : un log Metro
 * peut contenir une URL avec token ou une stack trace sensible.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function toPosix(p) {
  return p.split(sep).join('/');
}

const SCRIPT_RELATIVE_PATH = toPosix(relative(ROOT, SCRIPT_PATH));

// Dossiers jamais parcourus en entier : dépendances, VCS, caches de build.
// `.expo` n'est volontairement PAS ignoré totalement : voir `walkExpoLogs`
// (seuls ses `*.log` sont scannés, pour garder une performance raisonnable).
// Volontairement absent de cette liste : `dist` / `web-build` — un bundle web
// généré peut embarquer une variable EXPO_PUBLIC_* fautive, donc on le scanne.
const IGNORED_DIR_NAMES = new Set(['node_modules', '.git', '.turbo', 'coverage']);

// Extensions binaires : lues sans intérêt (bruit, risque d'erreur d'encodage).
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.icns',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  '.zip',
  '.gz',
  '.tar',
  '.zst',
  '.7z',
  '.jar',
  '.pdf',
  '.mp4',
  '.mov',
  '.mp3',
  '.wasm',
  '.node',
  '.keystore',
  '.jks',
  '.p8',
  '.p12',
  '.mobileprovision',
]);

/** @type {{ file: string, line: number, reason: string }[]} */
const findings = [];

function isEnvExampleFile(name) {
  return name.endsWith('.env.example');
}

/** Tout fichier dont le nom commence par `.env` (`.env`, `.env.local`,
 * `.env.production`…), à l'exclusion de `*.env.example`. */
function isRealEnvFileName(name) {
  return /^\.env(\..+)?$/.test(name) && !isEnvExampleFile(name);
}

/** Construit dynamiquement les motifs recherchés pour que ce fichier ne se
 * signale jamais lui-même (les fragments ci-dessous ne forment le motif
 * qu'assemblés au runtime, jamais tels quels dans le code source ni dans ses
 * commentaires). */
const PATTERNS = {
  serviceRoleWord: 'service' + '_role',
  secretKeyPrefix: 'sb' + '_secret_',
  serviceRoleEnvVar: 'SUPABASE' + '_SERVICE_ROLE_KEY',
  anthropicKeyPrefix: 'sk' + '-ant-',
};

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const SUPABASE_PERSONAL_TOKEN_RE = /sbp_[a-f0-9]{20,}/;
const POSTGRES_URL_WITH_PASSWORD_RE = /postgres(ql)?:\/\/[^:\s]+:[^@\s]+@/;
const PRIVATE_KEY_HEADER_RE = /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/;
// Exige une valeur (pas seulement le préfixe nu) après `sb_secret_` : le SDK
// `@supabase/supabase-js` embarque lui-même ce préfixe en dur (littéral, sans
// suffixe) dans son code de validation « refuser une clé secrète côté client »
// — un simple `.includes()` déclencherait donc un faux positif systématique
// sur tout bundle web construit (`apps/app/dist`, voir CI "Build (web export)"
// puis "Check secrets (build output)"). Une vraie clé committée par erreur a
// toujours une valeur derrière le préfixe.
const SUPABASE_SECRET_KEY_RE = new RegExp(PATTERNS.secretKeyPrefix + '[A-Za-z0-9_-]{10,}');

function base64UrlDecode(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
}

function decodeJwtPayloadHasServiceRole(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload && payload.role === 'service_role';
  } catch {
    return false;
  }
}

function isUnderTopLevelDir(relPosixPath, dirName) {
  return relPosixPath === dirName || relPosixPath.startsWith(`${dirName}/`);
}

/** Applique tous les motifs à une ligne et renvoie la liste des raisons
 * déclenchées (sans référence de fichier/ligne : ajoutée par l'appelant). */
function checkLinePatterns(line, { inScopeForServiceRoleWord }) {
  const reasons = [];

  // Une ligne de commentaire dotenv/shell (`# ...`) qui *mentionne* le mot
  // « service_role » à but documentaire (ex. l'en-tête d'avertissement de
  // apps/app/.env.example, recopiée telle quelle dans un `.env` réel local)
  // n'est pas un secret — exactement comme un fichier `.md` en parle sans
  // danger. Une vraie valeur/variable reste détectée par les autres motifs
  // (JWT, `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_<valeur>`), non exemptés ici.
  const isCommentLine = line.trimStart().startsWith('#');

  if (inScopeForServiceRoleWord && !isCommentLine && line.includes(PATTERNS.serviceRoleWord)) {
    reasons.push(
      `mot-clé « ${PATTERNS.serviceRoleWord} » trouvé (interdit dans apps/** et packages/**)`,
    );
  }

  if (SUPABASE_SECRET_KEY_RE.test(line)) {
    reasons.push(
      `clé secrète Supabase (préfixe « ${PATTERNS.secretKeyPrefix} » suivi d'une valeur) trouvée`,
    );
  }

  if (line.includes(PATTERNS.serviceRoleEnvVar)) {
    reasons.push(`variable « ${PATTERNS.serviceRoleEnvVar} » trouvée`);
  }

  if (line.includes(PATTERNS.anthropicKeyPrefix)) {
    reasons.push(`préfixe de clé API Anthropic « ${PATTERNS.anthropicKeyPrefix} » trouvé`);
  }

  const jwtMatches = line.match(JWT_RE);
  if (jwtMatches) {
    for (const token of jwtMatches) {
      if (decodeJwtPayloadHasServiceRole(token)) {
        reasons.push('JWT dont le payload contient "role":"service_role"');
      }
    }
  }

  if (SUPABASE_PERSONAL_TOKEN_RE.test(line)) {
    reasons.push('jeton personnel Supabase (préfixe « sbp_ ») trouvé');
  }

  if (POSTGRES_URL_WITH_PASSWORD_RE.test(line)) {
    reasons.push('URL Postgres avec mot de passe en clair trouvée');
  }

  if (PRIVATE_KEY_HEADER_RE.test(line)) {
    reasons.push('en-tête de clé privée (PRIVATE KEY) trouvé');
  }

  return reasons;
}

function scanTextContent(content, relPosixPath) {
  const isMarkdown = extname(relPosixPath) === '.md';
  const inScopeForServiceRoleWord =
    (isUnderTopLevelDir(relPosixPath, 'apps') || isUnderTopLevelDir(relPosixPath, 'packages')) &&
    !isMarkdown;

  const lines = content.split(/\r\n|\r|\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    for (const reason of checkLinePatterns(line, { inScopeForServiceRoleWord })) {
      findings.push({ file: relPosixPath, line: lineNumber, reason });
    }
  });
}

function scanFileContent(absPath, relPosixPath) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    // Fichier illisible en texte (binaire non listé, permissions...) : ignoré.
    return;
  }
  scanTextContent(content, relPosixPath);
}

/** Scanne récursivement uniquement les fichiers `*.log` sous un dossier
 * `.expo/` (caches de dev Metro potentiellement volumineux : on ne lit que les
 * logs, jamais les caches binaires/JSON, pour rester rapide). */
function walkExpoLogs(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absPath = join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      walkExpoLogs(absPath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.log')) continue;

    const relPosixPath = toPosix(relative(ROOT, absPath));
    scanFileContent(absPath, relPosixPath);
  }
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absPath = join(dir, entry.name);

    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (entry.name === '.expo') {
        walkExpoLogs(absPath);
        continue;
      }
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      walk(absPath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (absPath === SCRIPT_PATH) continue; // ne jamais se scanner soi-même
    // `.env.example` est volontairement scanné comme un fichier normal (versionné,
    // un vrai secret collé dedans par erreur doit être détecté) : voir isEnvExampleFile,
    // utilisé uniquement pour l'exclure des vérifications « fichier .env réel ».
    if (BINARY_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;

    const relPosixPath = toPosix(relative(ROOT, absPath));
    scanFileContent(absPath, relPosixPath);
  }
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  });
  return result;
}

function isGitRepo() {
  const result = runGit(['rev-parse', '--is-inside-work-tree']);
  return result.status === 0 && result.stdout.trim() === 'true';
}

/** Fichiers `.env*` réels (pas `.env.example`) suivis par git (indexés ou
 * commités, même s'ils sont par ailleurs listés dans .gitignore : `git
 * ls-files` remonte tout ce que git suit réellement). */
function findTrackedRealEnvFiles() {
  const result = runGit(['ls-files']);
  if (result.status !== 0) return [];
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => {
      const name = path.split('/').pop() ?? path;
      return isRealEnvFileName(name);
    });
}

/** Vérifie que `git check-ignore` considère bien `path` comme ignoré. */
function isPathGitIgnored(path) {
  const result = runGit(['check-ignore', '-q', path]);
  return result.status === 0;
}

/** Mode `--staged` : ne scanne que le contenu **indexé** des fichiers ajoutés,
 * copiés ou modifiés dans l'index (`git diff --cached`), via `git show :path`
 * (jamais le fichier sur disque, qui peut différer de ce qui va être commité).
 * Utilisé par `.githooks/pre-commit`, doit rester rapide et fonctionner sur un
 * dépôt tout juste initialisé (aucun commit). */
function scanStaged() {
  const listResult = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACM']);
  if (listResult.status !== 0) return;

  const paths = listResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const path of paths) {
    if (path === SCRIPT_RELATIVE_PATH) continue; // ne jamais se signaler soi-même
    const name = path.split('/').pop() ?? path;

    if (isRealEnvFileName(name)) {
      findings.push({
        file: path,
        line: 0,
        reason: 'fichier .env réel indexé (staged) : ne doit jamais être committé',
      });
      continue;
    }

    // `.env.example` est scanné comme un fichier normal (voir walk()).
    if (BINARY_EXTENSIONS.has(extname(name).toLowerCase())) continue;

    // `git show :path` lit le contenu indexé (objet blob de l'index), pas le
    // fichier sur disque.
    const showResult = runGit(['show', `:${path}`]);
    if (showResult.status !== 0) continue; // fichier supprimé dans l'index, etc.

    scanTextContent(showResult.stdout, path);
  }
}

/** Mode `--history` : rejoue `git log -p --all` et n'inspecte que les lignes
 * **ajoutées** (préfixe `+`, en excluant les en-têtes `+++`), avec les mêmes
 * motifs que le scan par défaut — détecte un secret committé puis retiré
 * depuis. Fonctionne sans erreur sur un dépôt sans aucun commit (sortie vide
 * de `git log`, aucune trouvaille). */
function scanHistory() {
  const result = runGit(['log', '-p', '--all', '--no-color', '--full-history']);
  if (result.status !== 0) return; // pas un dépôt git, ou aucune ref : rien à scanner

  const lines = result.stdout.split(/\r\n|\r|\n/);
  let currentFile;
  let currentIsBinaryExt = false;

  for (const rawLine of lines) {
    if (rawLine.startsWith('diff --git ')) {
      currentFile = undefined;
      currentIsBinaryExt = false;
      continue;
    }

    if (rawLine.startsWith('+++ ')) {
      const rawPath = rawLine.slice('+++ '.length).trim();
      if (rawPath === '/dev/null') {
        currentFile = undefined;
        continue;
      }
      const relPath = rawPath.startsWith('b/') ? rawPath.slice(2) : rawPath;
      currentFile = relPath;
      currentIsBinaryExt = BINARY_EXTENSIONS.has(extname(relPath).toLowerCase());

      const name = relPath.split('/').pop() ?? relPath;
      if (relPath !== SCRIPT_RELATIVE_PATH && isRealEnvFileName(name)) {
        findings.push({
          file: relPath,
          line: 0,
          reason:
            'fichier .env réel présent dans l’historique git (même supprimé depuis) : ne doit jamais avoir été committé',
        });
      }
      continue;
    }

    if (!currentFile) continue;
    if (currentIsBinaryExt) continue;
    if (currentFile === SCRIPT_RELATIVE_PATH) continue; // ne jamais se signaler soi-même

    // `.env.example` est scanné comme un fichier normal (voir walk()).
    if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) continue;

    const content = rawLine.slice(1);
    const isMarkdown = extname(currentFile) === '.md';
    const inScopeForServiceRoleWord =
      (isUnderTopLevelDir(currentFile, 'apps') || isUnderTopLevelDir(currentFile, 'packages')) &&
      !isMarkdown;

    for (const reason of checkLinePatterns(content, { inScopeForServiceRoleWord })) {
      findings.push({
        file: currentFile,
        line: 0,
        reason: `${reason} (historique git — ligne ajoutée dans un commit passé)`,
      });
    }
  }
}

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const staged = flags.has('--staged');
  const history = flags.has('--history');
  if (staged && history) {
    console.error('check:secrets — --staged et --history sont mutuellement exclusifs.');
    process.exit(2);
  }
  return { staged, history };
}

function main() {
  const { staged, history } = parseArgs(process.argv);
  const gitAvailable = isGitRepo();

  if ((staged || history) && !gitAvailable) {
    console.error('check:secrets — --staged/--history nécessitent un dépôt git.');
    process.exitCode = 1;
    return;
  }

  const problems = [];

  if (staged) {
    scanStaged();
  } else if (history) {
    scanHistory();
  } else {
    walk(ROOT);

    // Ces vérifications (fichiers .env suivis par git au HEAD/index courant,
    // sanity check .gitignore) ne concernent que le mode par défaut :
    // --staged et --history ont déjà leurs propres vérifications ciblées
    // (voir scanStaged / scanHistory).
    if (gitAvailable) {
      const trackedEnvFiles = findTrackedRealEnvFiles();
      for (const file of trackedEnvFiles) {
        problems.push(`✖ ${file} : fichier .env réel suivi par git (ne doit jamais être committé)`);
      }

      const pathsThatMustBeIgnored = ['apps/app/.env', 'supabase/tests/.env'];
      for (const path of pathsThatMustBeIgnored) {
        if (!isPathGitIgnored(path)) {
          problems.push(
            `✖ ${path} ne serait PAS ignoré par git (vérifier .gitignore : règle "!.env.example" trop large, ou entrée .env manquante)`,
          );
        }
      }
    } else {
      console.warn(
        "⚠ Aucun dépôt git détecté : vérifications 'fichier .env suivi par git' et 'git check-ignore' ignorées.",
      );
    }
  }

  if (findings.length > 0) {
    console.error('✖ check:secrets — secrets potentiels détectés :\n');
    for (const { file, line, reason } of findings) {
      const location = line > 0 ? `${file}:${line}` : file;
      console.error(`  ${location} — ${reason}`);
    }
    console.error('');
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'));
    console.error('');
  }

  if (findings.length > 0 || problems.length > 0) {
    console.error(
      `check:secrets — échec : ${findings.length} occurrence(s) suspecte(s), ${problems.length} problème(s) de configuration git.`,
    );
    console.error(
      'Rappel : aucune valeur secrète (clé service_role, sb_secret_, sbp_..., clé privée, URL Postgres avec ' +
        'mot de passe, clé sk-ant-...) ne doit vivre dans le dépôt ni son historique (CLAUDE.md, ADR-016/020). ' +
        'Seule la clé anon/publishable est autorisée côté client, documentée dans les fichiers .env.example.',
    );
    process.exitCode = 1;
    return;
  }

  const modeLabel = staged ? ' (staged)' : history ? ' (history)' : '';
  console.log(
    `✔ check:secrets${modeLabel} — aucun secret détecté, .gitignore correctement configuré.`,
  );
  process.exitCode = 0;
}

main();
