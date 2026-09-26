import { useTranslation } from 'react-i18next';

import { NAV_ITEMS } from './navItems';
import { SidebarItem } from './SidebarItem';

/**
 * Sidebar fixe du web >= 1024 px (W-5, ADR-011 : « sidebar fixe avec toutes
 * les sections »). Rendue par `AppShell` à côté du contenu, à la place de la
 * tab bar flottante.
 */
export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside
      data-testid="app-sidebar"
      className="hidden w-64 shrink-0 border-r border-border bg-card lg:block"
    >
      <nav
        data-testid="sidebar-nav"
        aria-label={t('nav.landmark')}
        className="flex flex-col gap-1 p-4"
      >
        {NAV_ITEMS.filter((item) => item.sidebar).map((item) => (
          <SidebarItem
            key={item.id}
            testId={`sidebar-link-${item.id}`}
            to={item.to}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </nav>
    </aside>
  );
}
