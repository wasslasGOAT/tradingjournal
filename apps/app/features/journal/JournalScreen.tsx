import { EmptyState, Screen, useToast } from '@repo/ui';
import { NotebookPen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Écran Journal (M1-8) : état vide soigné en attendant la vraie saisie
 * (pré/post-session, humeur, émotions — ARCHITECTURE §5.6, M2+).
 */
export function JournalScreen() {
  const { t } = useTranslation('common');
  const { show } = useToast();

  return (
    <Screen testID="screen-journal" edges={{ top: false, bottom: false }}>
      <EmptyState
        testID="journal-empty-state"
        icon={NotebookPen}
        title={t('journal.empty.title')}
        description={t('journal.empty.description')}
        action={{
          label: t('journal.empty.action'),
          onPress: () => show(t('header.quickAdd.comingSoon')),
        }}
      />
    </Screen>
  );
}
