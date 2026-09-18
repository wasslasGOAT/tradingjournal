import { IconButton } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

/** En-tête du catalogue (M1-3) : retour (le `Stack` racine masque le header natif, ADR-017) + titre/sous-titre. */
export function CatalogHeader() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <View testID="catalog-header" className="gap-sm">
      <View className="flex-row items-center gap-sm">
        <IconButton
          testID="catalog-back"
          icon={ArrowLeft}
          accessibilityLabel={t('catalog.back')}
          onPress={() => router.back()}
        />
        <Text testID="catalog-title" className="font-sans-semibold text-lg text-textPrimary">
          {t('catalog.title')}
        </Text>
      </View>
      <Text className="font-sans text-sm text-textSecondary">{t('catalog.subtitle')}</Text>
    </View>
  );
}
