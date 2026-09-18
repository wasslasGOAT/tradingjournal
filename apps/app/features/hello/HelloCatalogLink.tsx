import { Button } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Lien vers le catalogue de composants (M1-3, `app/(dev)/catalog.tsx`) —
 * développement uniquement, toujours visible sur l'écran Hello quel que soit
 * son état, pour vérifier visuellement les primitives de `packages/ui` sans
 * attendre que les vrais écrans (dashboard, calendrier…) existent.
 * TODO(M1-9): retirer ce lien de l'écran Hello en même temps que la route
 * `(dev)/catalog` sera exclue du build de production.
 */
export function HelloCatalogLink() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <Button
      testID="hello-catalog-link"
      label={t('hello.catalogButton')}
      variant="ghost"
      size="sm"
      onPress={() => router.push('/(dev)/catalog')}
    />
  );
}
