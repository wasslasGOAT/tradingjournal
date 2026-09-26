import { expect, test } from '@playwright/test';

/**
 * `Chart` (M1-6, ADR-021, adaptateur web `recharts`) : vérifie le défaut tout
 * juste corrigé — un axe Y partant de 0 écrasait une courbe d'equity dont les
 * valeurs (~23 500 à 25 000, `SAMPLE_EQUITY_CURVE`) occupaient une fraction
 * infime du domaine, rendant la courbe visuellement plate contre le haut du
 * graphique (`Chart.web.tsx`, commentaire `padDomain`) — puis l'état vide d'un
 * graphique. N'exige pas Supabase (ADR-020) : données factices.
 *
 * Le tracé réel de la courbe (`<Area>` de recharts) rend deux `<path>` : le
 * remplissage (`recharts-area-area`) et le trait (`recharts-area-curve`) — ce
 * test cible ce dernier.
 */

test.describe('Dashboard — courbe d’equity', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('le chemin SVG existe, a une longueur non nulle et tient dans la zone visible du graphique', async ({
    page,
  }) => {
    await page.goto('/');
    const chart = page.getByTestId('dashboard-equity-chart');
    await expect(chart).toBeVisible();

    const curve = chart.locator('svg path.recharts-area-curve');
    await expect(curve).toHaveCount(1);

    const d = await curve.getAttribute('d');
    expect(d, 'le chemin de la courbe ne doit pas être vide').not.toBeNull();
    expect((d ?? '').length, 'le chemin de la courbe doit contenir des segments').toBeGreaterThan(
      20,
    );

    const curveBox = await curve.boundingBox();
    const chartBox = await chart.boundingBox();
    expect(curveBox, 'le chemin de la courbe doit avoir une boîte englobante').not.toBeNull();
    expect(chartBox).not.toBeNull();
    if (!curveBox || !chartBox) return;

    // La courbe doit occuper une portion significative de la hauteur du
    // graphique (pas écrasée contre un bord — c'est exactement le défaut
    // corrigé par `padDomain`), avec une petite marge de tolérance pour les
    // arrondis de layout.
    expect(curveBox.height).toBeGreaterThan(30);
    expect(curveBox.y).toBeGreaterThanOrEqual(chartBox.y - 2);
    expect(curveBox.y + curveBox.height).toBeLessThanOrEqual(chartBox.y + chartBox.height + 2);
    expect(curveBox.x).toBeGreaterThanOrEqual(chartBox.x - 2);
    expect(curveBox.x + curveBox.width).toBeLessThanOrEqual(chartBox.x + chartBox.width + 2);
  });
});

test.describe('Chart — état vide', () => {
  // Locale forcée (indépendante de la locale système de la machine qui exécute le test,
  // `resolveLanguagePreference`/`system`) : seule la structure DOM importe ici, mais la
  // vérification du texte de l'état vide a besoin d'une chaîne i18n déterministe.
  test.use({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });

  test('un graphique sans données affiche l’état vide, sans tracé', async ({ page }) => {
    await page.goto('/catalog');
    const emptyChart = page.getByTestId('catalog-chart-line-empty-instance');
    await expect(emptyChart).toBeVisible();

    // Aucune surface `recharts` (le graphique réel) — seule l'icône de
    // `ChartEmptyState` (un `<svg>` Lucide, sans classe `recharts-surface`) est présente.
    await expect(emptyChart.locator('svg.recharts-surface')).toHaveCount(0);
    await expect(emptyChart.getByText('No data')).toBeVisible();
  });
});
