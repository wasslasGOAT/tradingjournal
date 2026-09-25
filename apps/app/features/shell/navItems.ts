import type { Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  MoreHorizontal,
  NotebookPen,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';

/**
 * Liste unique des sections de l'app (M1-8, ARCHITECTURE §6.1), source commune
 * de la tab bar mobile (`tab: true`) et de la sidebar web ≥ 1024 px
 * (`sidebar: true`) — évite de dupliquer icônes/libellés/routes dans les deux
 * dispositions. `name` correspond au nom de fichier sous `app/(app)/`.
 */
export interface NavItem {
  readonly name:
    'index' | 'calendar' | 'trades' | 'journal' | 'more' | 'analytics' | 'rules' | 'settings';
  /** Identifiant stable pour les `testID` (`tab-<id>`, `sidebar-link-<id>`) — lisible même pour
   * `name: 'index'` (route racine du Dashboard), contrairement à `name` (contraint par le fichier de route). */
  readonly id:
    'dashboard' | 'calendar' | 'trades' | 'journal' | 'more' | 'analytics' | 'rules' | 'settings';
  /**
   * Route du groupe `(app)`, typée `Href` **ici seulement** plutôt qu'assertée à chaque
   * usage : le type des routes d'`expo-router` dépend du fichier généré par `expo start`
   * (présent en local, absent en CI), donc une assertion `as Href` côté appelant passe en
   * local mais devient « inutile » — donc une erreur de lint — en intégration continue.
   */
  readonly href: Href;
  /** Clé i18n (`common.nav.<key>`). */
  readonly labelKey: string;
  readonly icon: LucideIcon;
  /** Visible dans la tab bar mobile / web < 1024 px (ADR-011). */
  readonly tab: boolean;
  /** Visible dans la sidebar web ≥ 1024 px (ADR-011 : « sidebar fixe avec toutes les sections »). */
  readonly sidebar: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    name: 'index',
    id: 'dashboard',
    href: '/',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    tab: true,
    sidebar: true,
  },
  {
    name: 'calendar',
    id: 'calendar',
    href: '/calendar',
    labelKey: 'nav.calendar',
    icon: CalendarDays,
    tab: true,
    sidebar: true,
  },
  {
    name: 'trades',
    id: 'trades',
    href: '/trades',
    labelKey: 'nav.trades',
    icon: ListOrdered,
    tab: true,
    sidebar: true,
  },
  {
    name: 'journal',
    id: 'journal',
    href: '/journal',
    labelKey: 'nav.journal',
    icon: NotebookPen,
    tab: true,
    sidebar: true,
  },
  {
    name: 'more',
    id: 'more',
    href: '/more',
    labelKey: 'nav.more',
    icon: MoreHorizontal,
    tab: true,
    sidebar: false,
  },
  {
    name: 'analytics',
    id: 'analytics',
    href: '/analytics',
    labelKey: 'nav.analytics',
    icon: BarChart3,
    tab: false,
    sidebar: true,
  },
  {
    name: 'rules',
    id: 'rules',
    href: '/rules',
    labelKey: 'nav.rules',
    icon: ShieldCheck,
    tab: false,
    sidebar: true,
  },
  {
    name: 'settings',
    id: 'settings',
    href: '/settings',
    labelKey: 'nav.settings',
    icon: Settings,
    tab: false,
    sidebar: true,
  },
];
