import '../global.css';

// Imports profonds (pas le barrel `@expo-google-fonts/inter`) : le barrel réexporte les 18
// graisses (9 poids × italique), toutes embarquées par Metro (~6 Mo) même si seules 3 sont
// utilisées (ADR-021 : 400/500/600 uniquement) — vérifié par `expo export --platform web`.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import {
  ThemeProvider,
  ToastProvider,
  useThemeMode,
  useThemeStore,
  useVisibilityStore,
} from '@repo/ui';
import * as Localization from 'expo-localization';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { i18n } from '@/lib/i18n';
import { resolveLanguagePreference } from '@/lib/language/languagePreference';
import { useLanguagePreferenceStore } from '@/lib/language/languagePreferenceStore';
import { useLanguagePreferenceSync } from '@/lib/language/useLanguagePreferenceSync';
import { pickLanguageTag } from '@/lib/locale';
import { loadStartupPreferences } from '@/lib/preferences/loadStartupPreferences';
import { QueryProvider } from '@/lib/query/QueryProvider';
// Import relatif (pas l'alias `@/`) : module scindé `.native`/`.web` sans
// fichier `.ts` neutre — seul le résolveur "node" (imports relatifs) essaie
// ces suffixes, pas le résolveur "typescript" utilisé par ESLint pour
// l'alias (`../lib/storage/preferencesStorage.{native,web}.ts`), comme
// `lib/query/persistOptions.ts` → `./storage`.
import { preferencesStorage } from '../lib/storage/preferencesStorage';

// M1 (ADR-021) : le splash reste affiché tant qu'Inter (400/500/600) n'est pas chargée.
void SplashScreen.preventAutoHideAsync();

/**
 * Contenu de l'app, sous `ThemeProvider` : lit le thème résolu (`useThemeMode`)
 * pour que les icônes de la barre de statut restent lisibles même quand le
 * thème est forcé indépendamment du système (M1-1, ARCHITECTURE §6.2).
 * Monte aussi `useLanguagePreferenceSync` (M1-9) : persiste tout changement de
 * langue fait depuis l'écran Réglages.
 */
function AppShell() {
  const mode = useThemeMode();
  useLanguagePreferenceSync();

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      <ToastProvider />
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
  // M1-9 : thème, couleurs P&L, masquage des montants et langue restaurés
  // avant le premier rendu (comme les polices ci-dessus) — évite tout
  // clignotement entre la valeur par défaut et la valeur persistée.
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // `loadStartupPreferences` ne rejette jamais (repli sur les valeurs par
    // défaut en cas d'échec de lecture) : le `.catch` ci-dessous est une
    // seconde protection contre tout rejet imprévu (ex. throw synchrone d'un
    // store `.hydrate`) pour ne jamais laisser `preferencesReady` bloqué à
    // `false` — écran blanc, splash jamais masqué (revue M1, Bloquant #2).
    loadStartupPreferences(preferencesStorage)
      .then(({ preferences, languagePreference }) => {
        if (cancelled) return;

        useThemeStore.getState().hydrate(preferences.preference, preferences.pnlColorScheme);
        useVisibilityStore.getState().hydrate(preferences.hideAmounts);

        useLanguagePreferenceStore.getState().hydrate(languagePreference);
        const deviceLocale = pickLanguageTag(Localization.getLocales());
        void i18n.changeLanguage(resolveLanguagePreference(languagePreference, deviceLocale));
      })
      .catch(() => {
        // Repli défensif : préférences par défaut déjà appliquées par les stores
        // (valeurs initiales), on force juste la langue système.
        if (cancelled) return;
        const deviceLocale = pickLanguageTag(Localization.getLocales());
        void i18n.changeLanguage(resolveLanguagePreference('system', deviceLocale));
      })
      .finally(() => {
        if (!cancelled) setPreferencesReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ready = fontsReady && preferencesReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider storage={preferencesStorage}>
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
