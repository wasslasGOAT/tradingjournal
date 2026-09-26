import { BarChart3, Settings, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { MoreListItem } from './MoreListItem';

/**
 * Écran « Plus » (W-5, ADR-011 : contient Analytics, Règles, Réglages sur
 * mobile — la sidebar web >= 1024 px les affiche directement, ce groupement
 * n'y apparaît pas).
 */
export function MoreScreen() {
  const { t } = useTranslation();

  return (
    <div data-testid="screen-more" className="mx-auto flex max-w-lg flex-col gap-2 p-4">
      <MoreListItem
        testId="more-item-analytics"
        to="/analytics"
        icon={BarChart3}
        label={t('more.sections.analytics.label')}
        description={t('more.sections.analytics.description')}
      />
      <MoreListItem
        testId="more-item-rules"
        to="/rules"
        icon={ShieldCheck}
        label={t('more.sections.rules.label')}
        description={t('more.sections.rules.description')}
      />
      <MoreListItem
        testId="more-item-settings"
        to="/settings"
        icon={Settings}
        label={t('more.sections.settings.label')}
        description={t('more.sections.settings.description')}
      />
    </div>
  );
}
