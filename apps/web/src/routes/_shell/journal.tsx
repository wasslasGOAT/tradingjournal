import { createFileRoute } from '@tanstack/react-router';
import { NotebookPen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ScreenPlaceholder } from '@/features/shell/ScreenPlaceholder';

export const Route = createFileRoute('/_shell/journal')({
  component: JournalPage,
});

/** Journal (W-5) : placeholder `EmptyState` — check-in/débrief réels en M6. */
function JournalPage() {
  const { t } = useTranslation();

  return (
    <ScreenPlaceholder
      testId="screen-journal"
      icon={NotebookPen}
      title={t('journal.empty.title')}
      description={t('journal.empty.description')}
    />
  );
}
