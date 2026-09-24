import { BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

/** Écran Analytics (M1-8) : contenu réel (equity, drawdown, dimensions) en ROADMAP post-M1. */
export function AnalyticsScreen() {
  const { t } = useTranslation('common');

  return (
    <PlaceholderScreen
      testID="screen-analytics"
      icon={BarChart3}
      title={t('comingSoon.title')}
      description={t('comingSoon.description')}
    />
  );
}
