import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_ITEMS } from './navItems';
import { SidebarItem } from './SidebarItem';

/**
 * Sidebar fixe du web ≥ 1024 px (M1-8, ADR-011 : « sidebar fixe avec toutes
 * les sections »). Rendue par `(app)/_layout.tsx` à côté d'un `<Slot />`, à la
 * place de la tab bar mobile.
 */
export function Sidebar() {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="app-sidebar"
      className="w-64 border-r border-border bg-surface"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View testID="sidebar-nav" className="flex-1 gap-xs p-md">
        {NAV_ITEMS.filter((item) => item.sidebar).map((item) => (
          <SidebarItem
            key={item.name}
            testID={`sidebar-link-${item.id}`}
            label={t(item.labelKey)}
            icon={item.icon}
            active={pathname === item.href}
            onPress={() => router.push(item.href)}
          />
        ))}
      </View>
    </View>
  );
}
