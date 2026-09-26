import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

/** Écran Règles (M1-8) : règles perso + checklists en ROADMAP post-M1 (ARCHITECTURE §5.7). */
export function RulesScreen() {
  const { t } = useTranslation('common');

  return (
    <PlaceholderScreen
      testID="screen-rules"
      icon={ShieldCheck}
      title={t('comingSoon.title')}
      description={t('comingSoon.description')}
    />
  );
}
