import { Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

/** Écran Réglages (M1-8) : préférences, compte, thème en ROADMAP post-M1. */
export function SettingsScreen() {
  const { t } = useTranslation('common');

  return (
    <PlaceholderScreen
      testID="screen-settings"
      icon={Settings}
      title={t('comingSoon.title')}
      description={t('comingSoon.description')}
    />
  );
}
