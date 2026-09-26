import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { subscribeToSystemThemeChanges, useThemeStore } from './features/preferences/theme-store';
import { applyPnlSchemeToDocument, applyThemeToDocument } from './features/preferences/theme';
import { i18n } from './lib/i18n';
import { registerServiceWorker } from './lib/pwa/register-service-worker';
import './styles/globals.css';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();

// PWA (W-7) : précache du shell uniquement, jamais de réponse Supabase en
// cache (`vite.config.ts`) ; no-op en dev.
registerServiceWorker();

// Réconcilie `<html data-theme>` (déjà posé par le script anti-flash
// d'`index.html`) avec l'état du store (W-3) et s'abonne aux changements
// système tant que la préférence reste « système ».
applyThemeToDocument(useThemeStore.getState().resolvedMode);
applyPnlSchemeToDocument(useThemeStore.getState().pnlColorScheme);
subscribeToSystemThemeChanges();

// `document.documentElement.lang` (accessibilité/SEO, W-5) — réconcilié une
// première fois avec la langue résolue au démarrage ; les changements
// ultérieurs (écran Réglages) sont pris par `useLanguagePreferenceSync`.
document.documentElement.lang = i18n.language;

const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
