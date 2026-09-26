import { IconButton, useToast } from '@repo/ui';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Bouton d'ajout rapide global (M1-8, ADR-011 : « bouton d'ajout rapide de
 * trade global »). La vraie saisie de trade n'existe pas encore (M2+) :
 * affiche un `Toast` « bientôt disponible » (M1-4, `packages/ui`).
 */
export function QuickAddButton() {
  const { t } = useTranslation('common');
  const { show } = useToast();

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
