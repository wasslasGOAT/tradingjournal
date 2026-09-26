import { CatalogScreen } from '@/features/catalog/CatalogScreen';

/**
 * Route de développement (M1-3) : catalogue des primitives `packages/ui`,
 * pour vérification visuelle rapide sur téléphone/web pendant que l'app se
 * construit écran par écran.
 * M1-9 : exclue du build de production par `metro.config.js`
 * (`resolver.blockList`, actif quand `EXPO_PUBLIC_ENABLE_CATALOG` n'est pas
 * `true` — voir `apps/app/.env.development` et `MoreScreen`/`HelloCatalogLink`,
 * qui masquent l'entrée de menu correspondante dans le même cas).
 */
export default function CatalogRoute() {
  return <CatalogScreen />;
}
