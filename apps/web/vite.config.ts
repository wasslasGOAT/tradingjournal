import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { APP_NAME } from '@repo/config';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { buildThemeCss } from './src/lib/theme/generate-theme-css';

// Couleurs de thème sombre (`@repo/ui/tokens-data`, `dark.background`) : le
// manifeste et `theme-color` restent alignés sur `index.html` (anti-flash) —
// recopiées ici en dur pour la même raison que `theme.generated.css`
// (source unique de vérité, mais ce fichier de config Vite n'importe pas de
// CSS) : tout changement de palette (ADR-012) doit mettre à jour les deux.
const THEME_COLOR = '#000000';
const BACKGROUND_COLOR = '#000000';

// Thème Tailwind v4 (W-3, ADR-012/ADR-024) : `theme.generated.css` est
// (ré)écrit à chaque chargement de cette config (dev/build/preview), depuis
// la source de vérité des tokens (`@repo/ui/tokens-data`) — jamais modifié à
// la main (voir `src/lib/theme/generate-theme-css.ts`).
const themeCssPath = resolve(
  fileURLToPath(new URL('./src/styles', import.meta.url)),
  'theme.generated.css',
);
mkdirSync(dirname(themeCssPath), { recursive: true });
writeFileSync(themeCssPath, buildThemeCss(), 'utf8');

// PWA réelle (manifeste, icônes, service worker précachant le shell) livrée en
// W-7 (ADR-023/024). `registerType: 'prompt'` + `injectRegister: false` :
// l'enregistrement est fait à la main (`src/lib/pwa/register-service-worker.ts`,
// appelé depuis `main.tsx`) via le module virtuel `virtual:pwa-register`, pour
// afficher un toast i18n (au lieu du rechargement silencieux du mode
// `autoUpdate`) quand une nouvelle version est disponible.
// `generateSW` (par défaut) précache **uniquement le shell statique** — la
// liste ci-dessous n'inclut ni JSON ni aucune extension pouvant provenir
// d'une réponse Supabase ; aucune règle `runtimeCaching` n'est déclarée :
// les données ne doivent jamais transiter par le cache du service worker
// (invariant PWA, CLAUDE.md/ARCHITECTURE §9-§10).
// Le catalogue de composants (W-4, `src/features/catalog`) est monté
// directement par `src/routes/__root.tsx`, derrière `import.meta.env.DEV` +
// `import()` dynamique — **pas** un fichier sous `src/routes/**` : la route
// `/dev/catalog` n'est donc jamais découverte par `@tanstack/router-plugin`
// (`routeFileIgnorePattern` de ce plugin s'est révélé peu fiable en pratique
// pour exclure un sous-dossier de `dist/`) ; `import.meta.env.DEV` est
// remplacé par une constante littérale à la construction, ce qui permet à
// Rollup d'éliminer entièrement la branche (et l'import dynamique qu'elle
// contient) du bundle de production — vérifié par `pnpm build` + recherche
// dans `dist/` (aucune trace de "catalog").
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: 'src/routes' }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Jamais de service worker en dev : ne doit pas gêner `vite dev` (cache
      // du shell, page hors-ligne...) pendant que le serveur de dev tourne.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: `${APP_NAME} — journal de trading multi-plateforme.`,
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Shell statique uniquement (html/js/css/fonts/icônes) — aucune
        // extension de donnée (json, etc.) ne doit apparaître ici : voir le
        // commentaire au-dessus de `VitePWA`.
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        // La route `/dev/catalog` n'existe qu'en dev (branche morte en
        // production, voir plus bas) ; exclue quand même par précaution du
        // fallback de navigation.
        navigateFallbackDenylist: [/^\/dev\//],
        cleanupOutdatedCaches: true,
        // Explicitement vide : aucune réponse réseau (Supabase ou autre
        // origine) ne doit jamais être mise en cache par le service worker.
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // `@repo/ui/tokens-data` (`tokens.data.cjs`) est un module CommonJS servi
    // directement depuis les sources de l'espace de travail (pas depuis
    // `node_modules`) : sans le forcer dans l'optimiseur de dépendances, le
    // serveur de dev de Vite le sert tel quel et son import par défaut
    // (`import tokensData from '@repo/ui/tokens-data'`) échoue (« does not
    // provide an export named 'default' ») — seul l'optimiseur (esbuild)
    // synthétise l'interop CJS → ESM pour ce cas.
    include: ['@repo/ui/tokens-data'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    // 5181 (pas le défaut 4173, W-9 boucle de corrections n°1) : isole l'export
    // de production mesuré par `chromium-perf-prod` de tout autre serveur local
    // déjà en cours (dev sur 5173, ou une précédente session de mesure).
    port: 5181,
    strictPort: true,
  },
});
