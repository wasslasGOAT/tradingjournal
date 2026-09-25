import { toast } from 'sonner';

import { i18n } from '@/lib/i18n';

/**
 * Enregistrement du service worker (W-7, PWA — ADR-023/024). Module pur,
 * sans composant : appelé une fois depuis `main.tsx`. Stratégie
 * `registerType: 'prompt'` (voir `vite.config.ts`) : jamais de rechargement
 * silencieux — une nouvelle version affiche un toast discret (`sonner`,
 * déjà monté à la racine via `<Toaster />`) avec une action explicite ; sans
 * clic de l'utilisateur, l'onglet ouvert continue de tourner avec l'ancienne
 * version jusqu'à sa prochaine fermeture/ouverture (comportement standard de
 * `generateSW` + `skipWaiting: false` par défaut).
 *
 * No-op en dev (`devOptions.enabled: false` dans `vite.config.ts`) : le
 * module `virtual:pwa-register` généré par `vite-plugin-pwa` n'y enregistre
 * simplement rien.
 */
export function registerServiceWorker(): void {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        toast(i18n.t('pwa.updateAvailable.message'), {
          id: 'pwa-update-available',
          duration: Number.POSITIVE_INFINITY,
          action: {
            label: i18n.t('pwa.updateAvailable.action'),
            onClick: () => {
              void updateSW(true);
            },
          },
        });
      },
      onOfflineReady() {
        toast.info(i18n.t('pwa.offlineReady.message'), { id: 'pwa-offline-ready' });
      },
    });
  });
}
