import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { HelloRetryButton } from './HelloRetryButton';

/**
 * Indicateur discret d'échec de rafraîchissement (écran Hello, correctif revue
 * M0 — Important 7 / ADR-017) : affiché *en plus* du contenu (rempli ou vide)
 * quand des données valides sont déjà visibles (cache persisté ou fetch
 * précédent réussi) mais que le dernier refetch a échoué — jamais à la place du
 * contenu, pour ne jamais cacher une donnée encore valide derrière un écran
 * d'erreur plein écran.
 *
 * Bouton Réessayer désactivé (et libellé « Nouvelle tentative… ») pendant
 * qu'un refetch (`isFetching`) est déjà en cours.
 */
export function HelloRefreshErrorNotice({
  onRetry,
  isRefreshing,
}: {
  onRetry: () => void;
  isRefreshing: boolean;
}) {
  const { t } = useTranslation('common');

  return (
    <View
      testID="hello-refresh-error"
      accessibilityRole="alert"
      className="w-full max-w-sm items-center gap-xs"
    >
      <Text className="text-center text-sm text-danger">
        {isRefreshing ? t('hello.refreshError.retrying') : t('hello.refreshError.description')}
      </Text>
      <HelloRetryButton onPress={onRetry} disabled={isRefreshing} />
    </View>
  );
}
