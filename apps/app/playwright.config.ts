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
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    // En local, réutilise un serveur déjà lancé (`pnpm dev:app`) s'il tourne ;
    // en CI, toujours en démarrer un nouveau pour éviter un état résiduel.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { CI: '1', BROWSER: 'none' },
  },
});
