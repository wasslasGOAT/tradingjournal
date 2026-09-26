import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  MoreHorizontal,
  NotebookPen,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Liste unique des sections de l'app (W-5, ADR-011, ARCHITECTURE §6.1),
 * source commune de la tab bar flottante (< 1024 px, `tab: true`) et de la
 * sidebar web (>= 1024 px, `sidebar: true`) — copie web de
 * `apps/app/features/shell/navItems.ts` (gelé, ADR-023) : mêmes onglets,
 * mêmes libellés i18n (`common.nav.*`), route TanStack Router au lieu d'un
 * `Href` Expo Router.
 */
export interface NavItem {
  /** Identifiant stable pour les `data-testid` (`tab-<id>`, `sidebar-link-<id>`). */
  readonly id:
    'dashboard' | 'calendar' | 'trades' | 'journal' | 'more' | 'analytics' | 'rules' | 'settings';
  readonly to:
    '/' | '/calendar' | '/trades' | '/journal' | '/more' | '/analytics' | '/rules' | '/settings';
  /** Clé i18n (`nav.<key>`). */
  readonly labelKey: string;
  readonly icon: LucideIcon;
  /** Visible dans la tab bar flottante < 1024 px (ADR-011). */
  readonly tab: boolean;
  /** Visible dans la sidebar web >= 1024 px (ADR-011 : « sidebar fixe avec toutes les sections »). */
  readonly sidebar: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    to: '/',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    tab: true,
    sidebar: true,
  },
  {
    id: 'calendar',
    to: '/calendar',
    labelKey: 'nav.calendar',
    icon: CalendarDays,
    tab: true,
    sidebar: true,
  },
  {
    id: 'trades',
    to: '/trades',
    labelKey: 'nav.trades',
    icon: ListOrdered,
    tab: true,
    sidebar: true,
  },
  {
    id: 'journal',
    to: '/journal',
    labelKey: 'nav.journal',
    icon: NotebookPen,
    tab: true,
    sidebar: true,
  },
  {
    id: 'more',
    to: '/more',
    labelKey: 'nav.more',
    icon: MoreHorizontal,
    tab: true,
    sidebar: false,
  },
  {
    id: 'analytics',
    to: '/analytics',
    labelKey: 'nav.analytics',
    icon: BarChart3,
    tab: false,
    sidebar: true,
  },
  {
    id: 'rules',
    to: '/rules',
    labelKey: 'nav.rules',
    icon: ShieldCheck,
    tab: false,
    sidebar: true,
  },
  {
    id: 'settings',
    to: '/settings',
    labelKey: 'nav.settings',
    icon: Settings,
    tab: false,
    sidebar: true,
  },
] as const;
