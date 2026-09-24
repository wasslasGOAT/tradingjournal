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

module.exports = withNativeWind(config, { input: './global.css' });
