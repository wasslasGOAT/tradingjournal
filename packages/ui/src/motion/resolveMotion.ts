import { animation } from '../tokens';
import type { DurationToken, EasingToken, SpringToken, WithSpringConfig } from './types';

/**
 * Résolveurs purs durée/ressort (M1-2, ADR-017 : « respect du réglage système
 * réduire les animations »). Toutes les animations de `packages/ui` doivent
 * lire leurs durées/ressorts via ces fonctions plutôt que les jetons
 * `animation.*` directement, pour respecter `reduceMotion` uniformément.
 *
 * Convention « nul si réduit » : quand `reduceMotion` est vrai, une durée
 * résolue vaut `0` et un ressort résolu vaut `null` — dans les deux cas
 * l'appelant doit poser la valeur cible directement (`sharedValue.value =
 * target`), sans passer par `withTiming`/`withSpring`, pour sauter
 * instantanément à l'état final plutôt que jouer une animation à durée nulle
 * (équivalent en pratique, mais évite une frame d'animation superflue).
 *
 * Volontairement **sans import de `react-native-reanimated`** (contrairement à
 * `./easing.ts`) : `react-native-reanimated` échoue à se charger sous Vitest/Node
 * (résolution ESM sans extension de `react-native-worklets`, hors bundler
 * Metro/webpack — cf. `apps/app/vitest.config.mts`, « pas de rendu React Native
 * dans Vitest »). Cette séparation permet de tester `resolveDuration`/
 * `resolveSpringConfig` ici sans dépendre de ce module natif.
 */

// Cast déclaré une fois : `tokens.data.d.cts` type `animation.duration`/`.easing`/`.spring`
// en `Record<string, ...>` (généricité volontaire du fichier de déclaration partagé avec
// Tailwind) ; ces jetons précis sont vérifiés contre les données réelles par
// `resolveMotion.test.ts` plutôt que reconstruits à chaque accès.
const DURATION_TOKENS = animation.duration as Record<DurationToken, number>;
const EASING_TOKENS = animation.easing as Record<EasingToken, readonly [number, number, number, number]>;
const SPRING_TOKENS = animation.spring as Record<
  SpringToken,
  { damping: number; stiffness: number; mass: number }
>;

/** Durée (ms) pour `token`, ou `0` si `reduceMotion` (saut instantané, pas d'animation à durée nulle). */
export function resolveDuration(token: DurationToken, reduceMotion: boolean): number {
  return reduceMotion ? 0 : DURATION_TOKENS[token];
}

/** Points de la courbe de Bézier cubique pour `token` — voir `./easing.ts#resolveEasing` pour la version Reanimated. */
export function resolveEasingPoints(token: EasingToken): readonly [number, number, number, number] {
  return EASING_TOKENS[token];
}

/**
 * Config `withSpring` pour `token`, ou `null` si `reduceMotion` — l'appelant
 * pose alors la valeur cible directement (voir note de tête de fichier).
 */
export function resolveSpringConfig(token: SpringToken, reduceMotion: boolean): WithSpringConfig | null {
  return reduceMotion ? null : SPRING_TOKENS[token];
}
