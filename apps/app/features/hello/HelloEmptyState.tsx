import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { HelloRetryButton } from './HelloRetryButton';

/**
 * État « vide » (écran Hello, T6) : `app_meta.schema_version` n'existe pas en
 * base (migration non appliquée). Ébauche M0 : le vrai composant `EmptyState`
 * du design system arrive en M1 (ARCHITECTURE §6.2).
 *
 * `isRefreshing`/`refreshFailed` (correctif revue M0 — Important 7, ADR-017) :
 * ce même état « vide » reste affiché si un refetch échoue en arrière-plan
 * (jamais remplacé par un écran d'erreur plein écran tant qu'une donnée — même
 * « vide » — est déjà connue) ; `refreshFailed` ajoute un indicateur discret,
 * `isRefreshing` désactive le bouton Réessayer pendant le nouvel essai.
 */
export function HelloEmptyState({
  title,
  description,
  onRetry,
  isRefreshing = false,
  refreshFailed = false,
}: {
  title: string;
  description: string;
  onRetry: () => void;
  isRefreshing?: boolean;
  refreshFailed?: boolean;
}) {
  const { t } = useTranslation('common');

  return (
    <View testID="hello-empty" className="w-full max-w-sm items-center gap-sm">
      <Text testID="hello-heading" className="text-center text-lg font-bold text-textPrimary">
        {title}
      </Text>
      <Text className="text-center text-base text-textSecondary">{description}</Text>
      {refreshFailed ? (
        <Text
          testID="hello-refresh-error"
          accessibilityRole="alert"
          className="text-center text-sm text-danger"
        >
          {isRefreshing ? t('hello.refreshError.retrying') : t('hello.refreshError.description')}
        </Text>
      ) : null}
      <HelloRetryButton onPress={onRetry} disabled={isRefreshing} />
    </View>
  );
}
