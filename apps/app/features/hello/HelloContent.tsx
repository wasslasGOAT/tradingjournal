import { APP_NAME } from '@repo/config';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

/** État « rempli » (écran Hello, T6) : `app_meta.schema_version` lu depuis Supabase. */
export function HelloContent({ schemaVersion }: { schemaVersion: string }) {
  const { t } = useTranslation('common');

  return (
    <View testID="hello-content" className="items-center gap-sm">
      <Text testID="hello-heading" className="text-center text-2xl font-bold text-textPrimary">
        {t('hello.title', { appName: APP_NAME })}
      </Text>
      <Text className="text-center text-base text-textSecondary">{t('hello.subtitle')}</Text>
      <Text testID="hello-schema-version" className="text-center text-sm text-textMuted">
        {t('hello.schemaVersion', { version: schemaVersion })}
      </Text>
    </View>
  );
}
