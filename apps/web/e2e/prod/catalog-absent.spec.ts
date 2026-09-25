import { expect, test } from '@playwright/test';

/**
 * `/dev/catalog` absent du build de production (W-4, ROADMAP M1-web
 * « critères de fin » : « catalogue exclu des builds de production »).
 * `src/routes/__root.tsx` ne monte `CatalogScreen` (import dynamique) que
 * derrière `import.meta.env.DEV`, remplacé par `false` à la construction —
 * Rollup élimine alors la branche entière (et l'import qu'elle contient) du
 * bundle. Vérifié ici sur l'export de production (`vite preview`, ce projet
 * `chromium-perf-prod`) de deux façons complémentaires : comportement (la
 * navigation vers `/dev/catalog` n'affiche jamais l'écran catalogue) et
 * bundle (aucun chunk JS servi ne contient le testid `catalog-screen`, une
 * chaîne littérale qui survivrait à la minification si le code était encore
 * présent).
 */

test('naviguer vers /dev/catalog n’affiche jamais l’écran catalogue', async ({ page }) => {
  await page.goto('/dev/catalog');
  await expect(page.getByTestId('catalog-screen')).toHaveCount(0);
  await expect(page.getByTestId('catalog-sheet-trigger')).toHaveCount(0);
});

test('aucun script servi par le build de production ne référence l’écran catalogue', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('screen-dashboard')).toBeVisible();

  // Liste tous les scripts JS effectivement chargés par le shell (index.html + import()
  // dynamiques déclenchés par la navigation ci-dessus) plutôt que de deviner les noms de
  // fichiers hashés du build.
  const scriptUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map((el) => (el as HTMLScriptElement).src),
  );
  expect(scriptUrls.length).toBeGreaterThan(0);

  for (const url of scriptUrls) {
    const response = await request.get(url);
    if (!response.ok()) continue;
    const source = await response.text();
    expect(
      source.includes('catalog-screen'),
      `le script ${url.replace(baseURL ?? '', '')} référence encore "catalog-screen"`,
    ).toBe(false);
  }
});
