import { CatalogScreen } from '@/features/catalog/CatalogScreen';

/**
 * Route de développement (M1-3) : catalogue des primitives `packages/ui`,
 * pour vérification visuelle rapide sur téléphone/web pendant que l'app se
 * construit écran par écran.
 * TODO(M1-9): exclure ce groupe `(dev)` du build de production.
 */
export default function CatalogRoute() {
  return <CatalogScreen />;
}
