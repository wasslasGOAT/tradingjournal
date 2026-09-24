/**
 * Drapeaux de build de l'app (M1-9).
 *
 * `CATALOG_ENABLED` : le catalogue de composants (`app/(dev)/catalog.tsx`) est un outil de
 * développement, absent des builds de production (CLAUDE.md, ROADMAP M1). Il est actif dès
 * que le bundle est en mode développement (`__DEV__`, vrai pour `expo start`, faux pour
 * `expo export` et `eas build`), et peut être forcé dans un sens ou dans l'autre par
 * `EXPO_PUBLIC_ENABLE_CATALOG` (`'true'`/`'false'`) — par exemple pour vérifier localement
 * un export de production.
 *
 * Aucun fichier `.env` n'est versionné pour cela : la règle « aucun `.env` dans le dépôt »
 * (CLAUDE.md, `scripts/check-secrets.mjs`) reste un garde-fou sans exception.
 * `metro.config.js` applique la même logique côté résolveur, pour que la route n'existe
 * même pas dans le bundle de production.
 */
const override = process.env.EXPO_PUBLIC_ENABLE_CATALOG;

export const CATALOG_ENABLED =
  override === 'true' ? true : override === 'false' ? false : __DEV__ === true;
