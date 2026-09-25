import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright (`apps/web`, ADR-023/024, W-9). Deux projets :
 * - `chromium` : parcours fonctionnels contre le serveur de dev Vite (port
 *   5173) — tous les fichiers de `./e2e` sauf `./e2e/prod/**`.
 * - `chromium-perf-prod` : fluidité **bloquante** (ADR-017, révision
 *   2026-09-25) et vérifications propres à l'export de production (PWA,
 *   absence de `/dev/catalog`) contre `vite preview` (port 5181) —
 *   uniquement `./e2e/prod/**`. Isolé du serveur de dev pour ne jamais
 *   mesurer un bundle non minifié (voir historique dans
 *   `e2e/prod/performance.spec.ts`).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
      testDir: './e2e',
      testIgnore: ['**/prod/**'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
    {
      name: 'chromium-perf-prod',
      testDir: './e2e/prod',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5181' },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Export de production : `vite build` puis `vite preview` (port fixé
      // par `vite.config.ts`, `preview.port`). Build inclus ici (plutôt que
      // supposé fait par un `pnpm build` préalable) pour que `pnpm e2e:web`
      // reste une commande unique et reproductible.
      command: 'pnpm run build && pnpm run preview',
      url: 'http://localhost:5181',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
