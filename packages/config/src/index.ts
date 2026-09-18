/** Nom de travail de l'application — remplaçable partout depuis ce fichier.
 *
 * Défini directement ici (pas de module `./app.ts` séparé) : ce fichier est chargé via
 * l'export `.` de `@repo/config` (specifier nu, sans extension), y compris par le loader
 * Node natif d'Expo (`app.config.ts`) — aucun import interne avec extension `.ts` littérale
 * n'est donc nécessaire, et `allowImportingTsExtensions` n'a pas à être activé dans
 * tsconfig.base.json pour ce seul cas. */
export const APP_NAME = 'Edgebook';
