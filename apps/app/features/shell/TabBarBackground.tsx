import { BlurSurface } from '@repo/ui';

/**
 * Fond de la tab bar mobile flottante (M1-4, ARCHITECTURE §6.1) : passé en
 * `tabBarBackground` (`expo-router/js-tabs`, `(app)/_layout.tsx`) — le
 * contenu des écrans défile dessous (`tabBarStyle: { position: 'absolute' }`).
 * Voir `BlurSurface` (`packages/ui`) pour l'état du flou (repli en attendant
 * `expo-blur`).
 */
export function TabBarBackground() {
  return <BlurSurface testID="tab-bar-background" />;
}
