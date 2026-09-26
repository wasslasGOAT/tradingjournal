import { expect, test } from '@playwright/test';

/**
 * Export de production — script anti-flash (revue W-10, audit sécurité) :
 * `index.html` ne doit contenir aucun `<script>` inline (CSP `script-src
 * 'self'` sans `'unsafe-inline'`, `public/_headers`) ; le script anti-flash
 * (`public/theme-init.js`, ARCHITECTURE §6.2) doit être servi en fichier
 * statique séparé, chargé de façon synchrone dans `<head>`, et effectivement
 * appliquer `data-theme` avant le premier rendu (aucun flash visible). Sur
 * `vite preview` (ce projet `chromium-perf-prod`) : les en-têtes `_headers`
 * eux-mêmes ne sont **pas** testables ici (Cloudflare Pages uniquement,
 * ROADMAP/consigne qa-tests) — seul le contenu servi par `vite preview` est
 * vérifié.
 */

test.describe('Export de production — anti-flash et absence de script inline', () => {
  test('dist/index.html ne contient aucun <script> inline et charge /theme-init.js', async ({
    request,
  }) => {
    const response = await request.get('/');
    expect(response.ok()).toBe(true);
    const html = await response.text();

    // Tous les `<script ...>` de la page servie, avec leur attribut `src` (ou son absence).
    const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    expect(scriptTags.length).toBeGreaterThan(0);

    const inlineScripts = scriptTags.filter(([, attrs, body]) => {
      const hasSrc = /\bsrc=/.test(attrs ?? '');
      return !hasSrc && (body ?? '').trim().length > 0;
    });
    expect(
      inlineScripts.map(([tag]) => tag),
      'un <script> inline a été trouvé dans dist/index.html (CSP script-src sans unsafe-inline)',
    ).toEqual([]);

    const themeInitScript = scriptTags.find(([, attrs]) =>
      /src="\/theme-init\.js"/.test(attrs ?? ''),
    );
    expect(themeInitScript, '/theme-init.js n’est pas chargé par dist/index.html').toBeDefined();

    // Chargé de façon synchrone (ni `defer` ni `type="module"` ni `async`) : doit s'exécuter
    // avant le premier rendu React, voir le commentaire d'en-tête de `public/theme-init.js`.
    const themeInitAttrs = themeInitScript?.[1] ?? '';
    expect(themeInitAttrs).not.toMatch(/\bdefer\b/);
    expect(themeInitAttrs).not.toMatch(/\basync\b/);
    expect(themeInitAttrs).not.toMatch(/type="module"/);

    // /theme-init.js est bien servi (fichier statique, pas une 404 silencieuse).
    const themeInitResponse = await request.get('/theme-init.js');
    expect(themeInitResponse.ok()).toBe(true);
    const themeInitSource = await themeInitResponse.text();
    expect(themeInitSource).toContain('data-theme');
  });

  test('aucun flash de thème : data-theme est déjà posé au tout premier rendu (préférence sombre persistée)', async ({
    page,
  }) => {
    // Préférence sombre posée avant navigation (`addInitScript` : s'exécute avant tout script
    // de la page, y compris `/theme-init.js`) — reproduit un retour d'utilisateur ayant déjà
    // choisi un thème.
    await page.addInitScript(() => {
      window.localStorage.setItem('edgebook.web.preferences.themePreference', 'dark');
    });

    // Capture `data-theme` au tout premier événement disponible après la navigation
    // (`domInteractive`, avant que React n'ait eu la main) : si `theme-init.js` n'avait pas
    // tourné en synchrone avant le reste, cet attribut serait encore absent à ce stade.
    await page.goto('/', { waitUntil: 'commit' });
    const themeAtDomInteractive = await page.evaluate(
      () =>
        new Promise<string | null>((resolve) => {
          const read = () => resolve(document.documentElement.getAttribute('data-theme'));
          if (document.readyState !== 'loading') {
            read();
          } else {
            document.addEventListener('DOMContentLoaded', read, { once: true });
          }
        }),
    );
    expect(themeAtDomInteractive).toBe('dark');

    await expect(page.getByTestId('screen-dashboard')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });
});
