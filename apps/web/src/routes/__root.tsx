import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { useLanguagePreferenceSync } from '@/features/preferences/useLanguagePreferenceSync';

interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Catalogue de composants (W-4) — développement uniquement (ADR-017 /
 * CLAUDE.md). Monté ici plutôt qu'en fichier sous `src/routes/**` (routage
 * TanStack Router habituel) : le plugin `@tanstack/router-plugin` n'expose
 * aucun moyen fiable observé pour exclure un sous-dossier de route du build
 * de production (`routeFileIgnorePattern` génère toujours l'import dans
 * `routeTree.gen.ts`). `import.meta.env.DEV` est en revanche remplacé par une
 * constante littérale (`false` en production) par Vite/esbuild — Rollup élimine
 * alors toute la branche ci-dessous, **et** l'import dynamique qu'elle
 * contient, du bundle de production (vérifié par `pnpm build` + recherche de
 * "catalog" dans `dist/`).
 */
const DevCatalogScreen = import.meta.env.DEV
  ? lazy(() =>
      import('@/features/catalog/CatalogScreen').then((module) => ({
        default: module.CatalogScreen,
      })),
    )
  : null;

/** `true` uniquement en dev, sur l'URL exacte du catalogue — jamais évalué à `true` en production (branche morte, voir ci-dessus). */
function isDevCatalogPath(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/dev/catalog'
  );
}

/**
 * Racine des routes (TanStack Router, routage par fichiers — ADR-024). Le
 * shell (onglets/sidebar, header, ajout rapide) arrive en W-5 : W-2 se
 * contente d'un `Outlet` nu. `Toaster` (W-4) monté une fois ici, au-dessus de
 * toutes les routes — peuplé depuis n'importe où via `useToast`.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  // Montée une seule fois, au-dessus de toutes les routes (W-5) : applique
  // tout changement de préférence de langue fait depuis l'écran Réglages.
  useLanguagePreferenceSync();

  if (DevCatalogScreen && isDevCatalogPath()) {
    return (
      <Suspense fallback={null}>
        <DevCatalogScreen />
      </Suspense>
    );
  }

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
