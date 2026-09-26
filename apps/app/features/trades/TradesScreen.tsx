import { EmptyState, Screen, useToast } from '@repo/ui';
import { ListOrdered } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Écran Trades (M1-8) : état vide soigné en attendant la saisie/import de
 * trades (M2+, ADR-015 — MVP : saisie manuelle uniquement). Liste réelle
 * (FlashList, ADR-017) quand des trades existent : M2.
 */
export function TradesScreen() {
  const { t } = useTranslation('common');
  const { show } = useToast();

  return (
    <Screen testID="screen-trades" edges={{ top: false, bottom: false }}>
      <EmptyState
        testID="trades-empty-state"
        icon={ListOrdered}
        title={t('trades.empty.title')}
        description={t('trades.empty.description')}
        action={{
          label: t('trades.empty.action'),
          onPress: () => show(t('header.quickAdd.comingSoon')),
        }}
      />
    </Screen>
  );
}
