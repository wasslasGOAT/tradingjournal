import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { validateShellSearch } from './filters';
import { NAV_ITEMS } from './navItems';

/**
 * Tab bar flottante et translucide < 1024 px (W-5, ADR-011, ARCHITECTURE
 * §6.1 : « détachée des bords, coins arrondis, ombre » + `backdrop-filter`).
 * Position fixe en bas de l'écran, au-dessus du contenu défilant — chaque
 * écran réserve la marge basse correspondante (`AppShell`,
 * `pb-[calc(...)]`). `env(safe-area-inset-bottom)` pour l'encoche iOS (PWA
 * installée en plein écran).
 */
export function BottomTabBar() {
  const { t } = useTranslation();
  const tabItems = NAV_ITEMS.filter((item) => item.tab);

  return (
    <nav
      data-testid="app-tab-bar"
      aria-label={t('nav.landmark')}
      className="fixed inset-x-4 z-20 flex justify-center lg:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div className="flex w-full max-w-md items-center justify-between gap-1 rounded-full border border-border bg-background/70 px-2 py-1.5 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        {tabItems.map((item) => (
          <Link
            key={item.id}
            data-testid={`tab-${item.id}`}
            to={item.to}
            search={(prev) => validateShellSearch(prev)}
            activeOptions={{ exact: item.to === '/' }}
            className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: cn('text-primary') }}
          >
            <item.icon size={20} aria-hidden="true" />
            <span className="text-[11px] font-medium leading-none">{t(item.labelKey)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
