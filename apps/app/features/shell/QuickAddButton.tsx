import { IconButton } from '@repo/ui';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useComingSoonStore } from './comingSoonStore';

/**
 * Bouton d'ajout rapide global (M1-8, ADR-011 : « bouton d'ajout rapide de
 * trade global »). La vraie saisie de trade n'existe pas encore : affiche la
 * notice « bientôt disponible » (`ComingSoonBanner`) plutôt qu'un `Toast`
 * (`packages/ui`, pas encore livré).
 */
export function QuickAddButton() {
  const { t } = useTranslation('common');
  const show = useComingSoonStore((state) => state.show);

  return (
    <IconButton
      testID="header-quick-add"
      icon={Plus}
      variant="accent"
      accessibilityLabel={t('header.quickAdd.accessibilityLabel')}
      onPress={() => show(t('header.quickAdd.comingSoon'))}
    />
  );
}
