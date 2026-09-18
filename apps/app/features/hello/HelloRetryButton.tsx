import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

/**
 * Bouton « Réessayer » minimal (écran Hello, T6). Cible ≥ 44 pt (ARCHITECTURE
 * §6.2) : `min-h-11`/`min-w-11` = 44px (échelle Tailwind par défaut, 11 × 4px).
 * `disabled` (correctif revue M0 — Important 7) : désactivé pendant qu'un
 * rafraîchissement (`isFetching`) est déjà en cours, pour ne pas empiler des
 * refetch concurrents depuis le même bouton.
 * Ébauche M0 : le vrai composant `Button` du design system arrive en M1.
 */
export function HelloRetryButton({
  onPress,
  disabled = false,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('common');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('hello.retry')}
      accessibilityState={{ disabled }}
      className={`min-h-11 min-w-11 items-center justify-center rounded-md px-lg py-sm ${
        disabled ? 'bg-surfaceAlt' : 'bg-accent'
      }`}
    >
      {/* `onAccent` (pas `textPrimary`) sur `bg-accent` : `textPrimary` ne passe qu'à
          3,3:1 sur l'accent (M1-1, contrast.test.ts) — `onAccent` est vérifié ≥ 4,5:1. */}
      <Text
        className={`font-sans-semibold text-base ${disabled ? 'text-textPrimary' : 'text-onAccent'}`}
      >
        {t('hello.retry')}
      </Text>
    </Pressable>
  );
}
