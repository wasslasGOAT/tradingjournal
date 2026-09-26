import { createFileRoute } from '@tanstack/react-router';
import { ListOrdered } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ScreenPlaceholder } from '@/features/shell/ScreenPlaceholder';

export const Route = createFileRoute('/_shell/trades')({
  component: TradesPage,
});

/** Trade log (W-5) : placeholder `EmptyState` — saisie et liste réelles en M4. */
function TradesPage() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      testId="screen-trades"
      icon={ListOrdered}
      title={t('trades.empty.title')}
      description={t('trades.empty.description')}
    />
  );
}
