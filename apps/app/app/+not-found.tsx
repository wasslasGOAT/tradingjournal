import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  const { t } = useTranslation('common');

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View className="flex-1 items-center justify-center gap-sm bg-background px-lg">
        <Text className="text-center text-lg font-bold text-textPrimary">
          {t('notFound.title')}
        </Text>
        <Text className="text-center text-base text-textSecondary">
          {t('notFound.description')}
        </Text>
        <Link href="/" className="text-base text-accent">
          {t('notFound.backHome')}
        </Link>
      </View>
    </>
  );
}
