// Metro pour un monorepo pnpm (ARCHITECTURE §4) : le projet dépend de packages
// symlinkés (`packages/*`), il faut donc que Metro surveille la racine du monorepo
// et résolve les node_modules hissés à la racine. Voir doc Expo « Work with monorepos ».
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// pnpm-workspace.yaml force `nodeLinker: hoisted`, mais les paquets `@repo/*` restent
// symlinkés depuis `packages/*` (comportement standard des workspaces) ; Metro résout
// les liens symboliques nativement, `watchFolders` ci-dessus suffit à ce qu'il les voie.

// Windows : au-delà de quelques processus de transformation, Metro dépasse la limite de
// descripteurs de fichiers et échoue en `EMFILE: too many open files` (le bundle renvoyé
// au téléphone devient une erreur, qui reste alors bloqué sur son ancienne version).
// Plafonner les workers règle le problème sans coût notable sur un projet de cette taille.
if (process.platform === 'win32') {
  config.maxWorkers = Math.min(config.maxWorkers ?? 4, 4);
}

// M1-9 : le catalogue de composants (`app/(dev)/catalog.tsx`) est un outil de
// développement — il ne doit pas exister dans un build de production
// (CLAUDE.md, ROADMAP M1). `EXPO_PUBLIC_ENABLE_CATALOG` est déjà positionné à
// `true` par `.env.development` (chargé par Expo CLI en mode développement,
// `expo start` — voir `@expo/env`, `KNOWN_MODES`), donc absent/`false` par
// défaut en mode production (`expo export`, pas de `.env.production`).
// Quand désactivé, la route est exclue du bundle au niveau du résolveur
// Metro (`resolver.blockList`) : Expo Router construit ses routes à partir
// des fichiers que Metro peut résoudre sous `app/`, donc un fichier bloqué
// ici n'apparaît jamais dans la liste de routes generée — pas seulement
// masqué à l'exécution. Vérifié par `expo export --platform web` : le
// composant `CatalogScreen` et ses testID (`catalog-screen`, …) sont absents
// du bundle produit — un `grep -ril "catalog" dist/` reste positif, mais
// uniquement sur des chaînes i18n inertes (`common.catalog.*`,
// `common.hello.catalogButton`), jamais atteignables (aucune route, aucun
// bouton ne les affiche en production, voir `MoreScreen`/`HelloCatalogLink`).
// Même règle que `apps/app/lib/flags.ts` : actif en développement (NODE_ENV posé par
// Expo CLI : `development` pour `expo start`, `production` pour `expo export`/EAS),
// surchargeable par `EXPO_PUBLIC_ENABLE_CATALOG`. Aucun fichier .env versionné
// (CLAUDE.md : aucun .env dans le dépôt, sans exception).
const catalogOverride = process.env.EXPO_PUBLIC_ENABLE_CATALOG;
const catalogEnabled =
  catalogOverride === 'true'
    ? true
    : catalogOverride === 'false'
      ? false
      : process.env.NODE_ENV !== 'production';
if (!catalogEnabled) {
  const catalogRoutePath = path
    .join(projectRoot, 'app', '(dev)', 'catalog.tsx')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingBlockList = Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : [];
  config.resolver.blockList = [...existingBlockList, new RegExp(`^${catalogRoutePath}$`)];
}

module.exports = withNativeWind(config, { input: './global.css' });
