import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright — parcours web (T10, ROADMAP M0 §« critères de
 * fin » : « l'app lit une valeur depuis la base Supabase de dev », vérifié ici
 * pour la plateforme web ; iOS/Android : voir `.maestro/hello.yaml`).
 *
 * Choix du serveur de test — serveur de dev Expo (`expo start --web`) plutôt
 * que servir l'export statique (`expo export --platform web` → `dist/`) :
 * - `lib/supabase/client.ts` lit `EXPO_PUBLIC_SUPABASE_*` via le remplacement
 *   statique Metro, qui a lieu au moment où le bundle est produit (dev *ou*
 *   export), pas après coup. Avec le serveur de dev, relancer `pnpm e2e:web`
 *   après avoir renseigné `apps/app/.env` suffit à faire apparaître le cas
 *   « rempli » (Expo recharge `.env` à chaque démarrage). Avec l'export
 *   statique, il faudrait reconstruire `dist/` avant chaque run.
 * - C'est le serveur réellement utilisé par `pnpm dev` / `pnpm dev:app`
 *   (README) : les tests exercent ce qu'un développeur voit vraiment.
 * - `CI=1` force Metro en mode CI (pas de watcher de fichiers, sortie stable,
 *   pas de rechargement à chaud inutile pour un run de test) ; `BROWSER=none`
 *   empêche l'ouverture automatique d'un onglet navigateur sur le poste dev.
 *
 * Exception — fluidité (`e2e/{performance.spec.ts,zzzTempPerf.spec.ts}`, ADR-017) : ces tests mesurent des
 * images (`requestAnimationFrame`) sous CPU ralenti ×4, contre le bundle web *dev*
 * (non minifié, React en mode développement, hot reload actif, sourcemaps) —
 * mesure jamais représentative (fps très dégradé, indépendamment de toute régression
 * réelle). Projet dédié `chromium-perf-prod`, port distinct (4173), export de
 * production (`expo export --platform web`) servi statiquement — voir `webServer`
 * ci-dessous et l'en-tête de `{performance.spec.ts,zzzTempPerf.spec.ts}`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // M1-4 : le bundle web *dev* (non minifié) a grandi avec les nouvelles primitives
  // (`Segmented`/`Sheet`/`Select`/`DateRangePicker`/`Toast`) — `page.goto('/')` seul
  // (parse + exécution du bundle, avant même la première assertion) approchait déjà
  // le défaut Playwright (30 s) avant M1-4 (~24 s en local, plusieurs workers en
  // parallèle sur la même machine) ; au-delà avec ce lot. Relevé une fois ici plutôt
  // que par test — un chargement plus lent que 30 s en dev (bundle non minifié,
  // machine partagée avec le serveur Expo du téléphone) n'est pas en soi le signe
  // d'une régression fonctionnelle (vérifié : tests verts avec plus de marge).
  timeout: 60_000,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']],
  outputDir: 'test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:8081' },
      // `e2e/{performance.spec.ts,zzzTempPerf.spec.ts}` (fluidité, CPU ralenti ×4) tourne à part, contre un
      // export de production (projet `chromium-perf-prod` ci-dessous) — voir l'en-tête
      // de ce fichier pour le pourquoi. Tous les autres specs restent ici, contre le
      // serveur de dev.
      testIgnore: '**/{performance.spec.ts,zzzTempPerf.spec.ts}',
    },
    {
      name: 'chromium-perf-prod',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173' },
      testMatch: '**/{performance.spec.ts,zzzTempPerf.spec.ts}',
    },
  ],
  webServer: [
    {
      command: 'npx expo start --web --port 8081',
      url: 'http://localhost:8081',
      // En local, réutilise un serveur déjà lancé (`pnpm dev:app`) s'il tourne ;
      // en CI, toujours en démarrer un nouveau pour éviter un état résiduel.
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { CI: '1', BROWSER: 'none' },
    },
    {
      // Port distinct (4173) et projet dédié (`chromium-perf-prod`) : cet export tourne
      // en parallèle du serveur de dev ci-dessus sans le ralentir ni être ralenti par
      // lui — voir l'en-tête de ce fichier et `e2e/{performance.spec.ts,zzzTempPerf.spec.ts}`.
      // `expo export` régénère `dist/` avant chaque run (pas de risque de mesurer un
      // export périmé) ; `npx serve -s` sert `dist/` en statique avec repli SPA
      // (`--single` : toute route inconnue de l'hébergeur renvoie `index.html`, requis
      // par `web.output: 'single'` — `app.config.ts` — pour que `page.goto('/settings')`
      // fonctionne en chargement direct, pas seulement en navigation cliente).
      command: 'npx expo export --platform web && npx serve -s dist -l 4173',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      // Budget plus large que le serveur de dev : `expo export` (bundle production,
      // minifié) prend de l'ordre de 10-20 s avant que `serve` ne commence à écouter.
      timeout: 180_000,
      env: { CI: '1', BROWSER: 'none' },
    },
  ],
});
