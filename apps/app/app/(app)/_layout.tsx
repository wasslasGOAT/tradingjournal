import { haptics, themes, useThemeMode } from '@repo/ui';
import { Slot } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/features/shell/AppHeader';
import { ComingSoonBanner } from '@/features/shell/ComingSoonBanner';
import { NAV_ITEMS } from '@/features/shell/navItems';
import { Sidebar } from '@/features/shell/Sidebar';

/** Largeur à partir de laquelle la sidebar web remplace la tab bar (ADR-011, ARCHITECTURE §6.1). */
const DESKTOP_BREAKPOINT = 1024;

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
  const isDesktopWeb = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (isDesktopWeb) {
    return (
      <View className="flex-1 flex-row bg-background">
        <Sidebar />
        <View className="flex-1">
          <AppHeader />
          <View className="flex-1">
            <Slot />
          </View>
          <ComingSoonBanner />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <View className="flex-1">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: themes[mode].accent,
            tabBarInactiveTintColor: themes[mode].textMuted,
            tabBarStyle: {
              backgroundColor: themes[mode].surface,
              borderTopColor: themes[mode].border,
            },
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
      </View>
      <ComingSoonBanner />
    </View>
  );
}
