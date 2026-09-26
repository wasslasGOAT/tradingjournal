import { Text, View } from 'react-native';

import { HelloRetryButton } from './HelloRetryButton';

/**
 * État « erreur » (écran Hello, T6) : requête Supabase en échec, ou
 * configuration manquante (`onRetry` alors absent — rien à rejouer tant que
 * `.env` n'est pas renseigné). Message + bouton Réessayer (ADR-017).
 *
 * `isRefreshing` (correctif revue M0 boucle 2 — Mineur 1) : en TanStack Query
 * v5, un refetch déclenché depuis cet état plein écran (aucune donnée connue)
 * laisse `status: 'error'` le temps de la relance — seul `isFetching` passe à
 * `true`. Sans ce prop, le bouton Réessayer restait actif pendant la relance
 * (double appel possible). Transmis à `HelloRetryButton` (désactive le bouton
 * et applique son état visuel de chargement).
 * Ébauche M0 : composant générique du design system prévu en M1.
 */
export function HelloErrorState({
  title,
  description,
  onRetry,
  isRefreshing = false,
  testID,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  isRefreshing?: boolean;
  /** Distingue « configuration manquante » de « erreur de requête » pour les tests E2E (T10). */
  testID?: string;
}) {
  return (
    <View testID={testID} className="w-full max-w-sm items-center gap-sm" accessibilityRole="alert">
      <Text testID="hello-heading" className="text-center font-sans-semibold text-lg text-danger">
        {title}
      </Text>
      <Text className="text-center font-sans text-base text-textSecondary">{description}</Text>
      {onRetry ? <HelloRetryButton onPress={onRetry} disabled={isRefreshing} /> : null}
    </View>
  );
}
