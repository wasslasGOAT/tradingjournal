import { Button } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CATALOG_ENABLED } from '@/lib/flags';

// M1-9 : même bascule que `MoreScreen` — la route `(dev)/catalog` est exclue
// du bundle de production (`metro.config.js`), ce lien doit disparaître avec
// elle. Règle partagée : `@/lib/flags`.

/**
 * Lien vers le catalogue de composants (M1-3, `app/(dev)/catalog.tsx`) —
 * développement uniquement, toujours visible sur l'écran Hello quel que soit
 * son état (quand le catalogue est activé, M1-9), pour vérifier visuellement
 * les primitives de `packages/ui` sans attendre que les vrais écrans
 * (dashboard, calendrier…) existent.
 */
export function HelloCatalogLink() {
  const { t } = useTranslation('common');
  const router = useRouter();

  if (!CATALOG_ENABLED) return null;

  return (
    <Button
      testID="hello-catalog-link"
      label={t('hello.catalogButton')}
      variant="ghost"
      size="sm"
      // `/catalog` (pas `/(dev)/catalog`) : le segment de groupe `(dev)` n'apparaît pas
      // dans l'URL résolue — même chemin que `MoreScreen`/`e2e/charts.spec.ts` (revue M1,
      // Mineur #13 : la route existait aux deux formes, gardée cohérente ici).
      onPress={() => router.push('/catalog')}
    />
  );
}
