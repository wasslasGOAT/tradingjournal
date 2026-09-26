import { expect, test } from '@playwright/test';

/**
 * PWA (W-7, ADR-023/024 ; ROADMAP M1-web « critères de fin ») sur l'export de
 * production (`vite preview`, ce projet `chromium-perf-prod`) : manifeste
 * valide, service worker actif, et — invariant PWA (CLAUDE.md/ARCHITECTURE
 * §9-§10) — **aucune** réponse Supabase précachée (`vite.config.ts` :
 * `globPatterns` shell statique uniquement, `runtimeCaching: []`). Le
 * service worker est désactivé en dev (`devOptions.enabled: false`) : ces
 * vérifications ne peuvent porter que sur l'export de production.
 */

test.describe('PWA — export de production', () => {
  test('le manifeste est valide et référence les icônes attendues', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);

    const manifest = (await response.json()) as {
      name?: string;
      short_name?: string;
      start_url?: string;
      display?: string;
      icons?: readonly { src?: string; sizes?: string }[];
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons?.length ?? 0).toBeGreaterThanOrEqual(2);
    // Au moins une icône >= 192x192 (installabilité, Lighthouse).
    expect(manifest.icons?.some((icon) => (icon.sizes ?? '').includes('192'))).toBe(true);
  });

  test('le service worker s’enregistre et s’active', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('screen-dashboard')).toBeVisible();

    await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false;
        const registration = await navigator.serviceWorker.getRegistration();
        return Boolean(registration?.active);
      },
      { timeout: 20_000 },
    );

    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.scope ?? null;
    });
    expect(scope).not.toBeNull();
  });

  test('la liste de précache ne contient aucune URL Supabase', async ({ page }) => {
    const swResponse = await page.request.get('/sw.js');
    expect(swResponse.ok()).toBe(true);
    const swSource = await swResponse.text();

    // `generateSW` (workbox) précache uniquement le shell statique — jamais une réponse
    // Supabase (`vite.config.ts` : `globPatterns` restreint aux extensions du shell,
    // `runtimeCaching: []`). Vérifie l'absence de toute mention d'origine Supabase dans le
    // service worker généré (précache **et** toute règle de mise en cache réseau).
    expect(swSource.toLowerCase()).not.toContain('supabase');

    // Aucune extension de donnée (json, etc.) dans les URLs précachées — seulement le shell
    // (js/css/html/police/icônes). `workbox-build` sérialise la manifeste précache sans
    // guillemets sur la clé (`{url:"...",revision:"..."}`, pas `{"url":"...","revision":"..."}`).
    const precachedUrls = [...swSource.matchAll(/url:"([^"]+)"/g)].map((match) => match[1] ?? '');
    expect(precachedUrls.length).toBeGreaterThan(0);
    const unexpected = precachedUrls.filter((url) => /\.(json)(\?|$)/i.test(url));
    expect(
      unexpected,
      `URL(s) de donnée précachée(s) inattendue(s) : ${JSON.stringify(unexpected)}`,
    ).toEqual([]);
  });
});
