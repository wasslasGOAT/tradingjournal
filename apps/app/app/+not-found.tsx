import type { Href } from 'expo-router';
import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  const { t } = useTranslation('common');

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View className="flex-1 items-center justify-center gap-sm bg-background px-lg">
        <Text className="text-center font-sans-semibold text-lg text-textPrimary">
          {t('notFound.title')}
        </Text>
        <Text className="text-center font-sans text-base text-textSecondary">
          {t('notFound.description')}
        </Text>
        {/* M1-8 : les routes typées d'Expo Router n'incluent pas `/` (chaîne nue ou objet)
            dans leur union générée quand la racine est l'écran `index` d'un groupe
            (`(app)/index.tsx`, aucun `app/index.tsx` frère) — la route existe bien et se
            résout correctement à l'exécution (vérifié : bundle web + navigation), seule
            l'union `Href` générée est incomplète pour ce cas précis. */}
        <Link href={'/' as Href} className="font-sans text-base text-accent">
          {t('notFound.backHome')}
        </Link>
      </View>
    </>
  );
}
