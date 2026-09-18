import '../global.css';

// Imports profonds (pas le barrel `@expo-google-fonts/inter`) : le barrel réexporte les 18
// graisses (9 poids × italique), toutes embarquées par Metro (~6 Mo) même si seules 3 sont
// utilisées (ADR-021 : 400/500/600 uniquement) — vérifié par `expo export --platform web`.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { ThemeProvider, useThemeMode } from '@repo/ui';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { i18n } from '@/lib/i18n';
import { QueryProvider } from '@/lib/query/QueryProvider';

// M1 (ADR-021) : le splash reste affiché tant qu'Inter (400/500/600) n'est pas chargée.
void SplashScreen.preventAutoHideAsync();

/**
 * Contenu de l'app, sous `ThemeProvider` : lit le thème résolu (`useThemeMode`)
 * pour que les icônes de la barre de statut restent lisibles même quand le
 * thème est forcé indépendamment du système (M1-1, ARCHITECTURE §6.2).
 */
function AppShell() {
  const mode = useThemeMode();

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <QueryProvider>
              <AppShell />
            </QueryProvider>
          </I18nextProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
