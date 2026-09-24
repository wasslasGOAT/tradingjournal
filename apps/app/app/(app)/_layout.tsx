import { ScreenBottomInsetProvider, haptics, spacing, themes, useThemeMode } from '@repo/ui';
import { Slot } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/features/shell/AppHeader';
import { NAV_ITEMS } from '@/features/shell/navItems';
import { Sidebar } from '@/features/shell/Sidebar';
import { TabBarBackground } from '@/features/shell/TabBarBackground';

/** Largeur à partir de laquelle la sidebar web remplace la tab bar (ADR-011, ARCHITECTURE §6.1). */
const DESKTOP_BREAKPOINT = 1024;

/**
 * Hauteur de la tab bar mobile (M1-4, hors zone sûre) — même valeur que le
 * variant `'uikit'` par défaut de `expo-router/js-tabs`
 * (`TABBAR_HEIGHT_UIKIT`, non personnalisée ici) : sert à réserver la place
 * correspondante sous le contenu (`ScreenBottomInsetProvider`) puisque la
 * tab bar flotte désormais au-dessus (`tabBarStyle.position: 'absolute'`,
 * contenu défilant dessous).
 */
const FLOATING_TAB_BAR_HEIGHT = 49;
/** Marge de confort supplémentaire (token `spacing.sm`) au-dessus de la tab bar flottante. */
const TAB_BAR_BOTTOM_INSET_BUFFER = parseInt(spacing.sm ?? '8px', 10);

const TAB_ITEMS = NAV_ITEMS.filter((item) => item.tab);
const HIDDEN_ITEMS = NAV_ITEMS.filter((item) => !item.tab);

/**
 * Coquille de navigation `(app)` (M1-8, ADR-011) : sidebar fixe sur le web
 * ≥ 1024 px, tab bar sinon (mobile natif + web étroit) — même jeu de routes
 * (`features/shell/navItems.ts`), header commun (compte, période, masquage,
 * ajout rapide) monté une seule fois au-dessus de la navigation.
 */
export default function AppLayout() {
  const { t } = useTranslation('common');
  const mode = useThemeMode();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const tabBarBottomInset = FLOATING_TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_BOTTOM_INSET_BUFFER;

  if (isDesktopWeb) {
    return (
      <View className="flex-1 flex-row bg-background">
        <Sidebar />
        <View className="flex-1">
          <AppHeader />
          <View className="flex-1">
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <View className="flex-1">
        <ScreenBottomInsetProvider value={tabBarBottomInset}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: themes[mode].accent,
              tabBarInactiveTintColor: themes[mode].textMuted,
              // M1-4 : tab bar flottante et translucide (façon Instagram) — le contenu des
              // écrans défile dessous (`ScreenBottomInsetProvider` ci-dessus réserve la place
              // correspondante). Fond réel posé par `tabBarBackground` (`BlurSurface`,
              // `@repo/ui`) : transparent ici, sinon il s'afficherait en double.
              tabBarStyle: {
                position: 'absolute',
                backgroundColor: 'transparent',
                borderTopWidth: 0,
              },
              tabBarBackground: () => <TabBarBackground />,
            }}
            screenListeners={{ tabPress: () => haptics.selection() }}
          >
            {TAB_ITEMS.map((item) => (
              <Tabs.Screen
                key={item.name}
                name={item.name}
                options={{
                  tabBarLabel: t(item.labelKey),
                  tabBarButtonTestID: `tab-${item.id}`,
                  tabBarIcon: ({ color, size }) => <item.icon color={color} size={size} />,
                }}
              />
            ))}
            {HIDDEN_ITEMS.map((item) => (
              <Tabs.Screen key={item.name} name={item.name} options={{ href: null }} />
            ))}
          </Tabs>
        </ScreenBottomInsetProvider>
      </View>
    </View>
  );
}
