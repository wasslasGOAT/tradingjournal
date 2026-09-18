import '../global.css';

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

// Pas de police custom ni de données à précharger en M0 : le splash se ferme dès le montage.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryProvider>
            <View className="flex-1 bg-background">
              {/* `auto` (et non `light` figé) : suit le thème système comme
                  `userInterfaceStyle: "automatic"` (app.config.ts) plutôt que de
                  forcer des icônes claires si l'utilisateur bascule en thème clair. */}
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </QueryProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
