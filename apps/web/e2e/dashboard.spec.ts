import { expect, test } from '@playwright/test';

import { freezeClock } from './helpers/clock';

/**
 * Dashboard (W-6, ARCHITECTURE §6.1 ; ROADMAP M1-web « critères de fin ») :
 * solde, tuiles P&L/rendement et courbe d'equity visibles et non tronqués,
 * courbe réellement tracée (chemin SVG non vide), aucun débordement
 * horizontal à 390 px. Données factices (`src/data/sample`), compte et
 * période fixés dans l'URL pour un résultat déterministe (horloge figée en
 * complément, règle qa-tests).
 */

const DASHBOARD_URL = '/?account=acc-demo-main&from=2026-08-01&to=2026-09-14&shortcut=custom';

test.describe('Dashboard — chiffres clés', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('solde, tuiles P&L/rendement et courbe visibles, sans texte tronqué', async ({ page }) => {
    await freezeClock(page);
    await page.goto(DASHBOARD_URL);
    await expect(page.getByTestId('screen-dashboard')).toBeVisible();

    const balance = page.getByTestId('dashboard-balance-value');
    await expect(balance).toBeVisible();
    await expect(balance).not.toHaveText('');

    for (const testId of [
      'dashboard-stat-pnl-today-value',
      'dashboard-stat-pnl-month-value',
      'dashboard-stat-return-rate-value',
    ]) {
      const value = page.getByTestId(testId);
      await expect(value).toBeVisible();
      await expect(value).not.toHaveText('');
      await expect(value).not.toHaveText(/NaN/);
    }

    // Aucun texte "feuille" (sans enfant) ne doit dépasser sa boîte (ellipsis silencieux) sur
    // les cartes/tuiles du Dashboard.
    const truncated = await page.evaluate(() => {
      const roots = Array.from(
        document.querySelectorAll(
          '[data-testid="dashboard-balance-card"], [data-testid^="dashboard-stat-"]',
        ),
      );
      const leaves = roots.flatMap((root) => Array.from(root.querySelectorAll('*')));
      return leaves
        .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 0)
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent);
    });
    expect(
      truncated,
      `texte(s) tronqué(s) sur le Dashboard : ${JSON.stringify(truncated)}`,
    ).toEqual([]);
  });

  test('la courbe d’equity est réellement tracée (chemin SVG non vide)', async ({ page }) => {
    await freezeClock(page);
    await page.goto(DASHBOARD_URL);
    const chart = page.getByTestId('dashboard-equity-chart');
    await expect(chart).toBeVisible();

    const pathLengths = await chart.evaluate((el) =>
      Array.from(el.querySelectorAll('svg path')).map(
        (path) => path.getAttribute('d')?.length ?? 0,
      ),
    );
    expect(pathLengths.length, 'aucun élément <path> trouvé dans le graphique').toBeGreaterThan(0);
    expect(
      pathLengths.some((length) => length > 0),
      `chemins SVG : ${JSON.stringify(pathLengths)}`,
    ).toBe(true);
  });
});

/**
 * « Tous les comptes » (revue W-10 : `computeLastDayPnl`, `DashboardScreen.tsx`) : sur la
 * période 2026-09-01 → 2026-09-10, seul le compte `acc-demo-main` a tradé le 10 (jeudi,
 * `m-0910`, +156,60 — `src/data/sample/tradesSampleData.ts`) ; `acc-demo-prop` s'est arrêté au
 * 9. Le jour le plus récent tradé par au moins un compte sur la période est donc le 10 : la
 * tuile doit afficher un libellé daté (« P&L · Thu 10 » en EN) et un montant cohérent avec ce
 * jour, pas un libellé générique ni le montant d'un autre jour.
 */
test.describe('Dashboard — "Tous les comptes", libellé et montant du P&L du jour', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('affiche "P&L · Thu 10" (EN) avec un montant cohérent (+$156.60)', async ({ page }) => {
    await freezeClock(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('edgebook.web.preferences.language', 'en');
    });
    await page.goto('/?account=all&from=2026-09-01&to=2026-09-10&shortcut=custom');
    await expect(page.getByTestId('screen-dashboard')).toBeVisible();

    const label = page.getByTestId('dashboard-stat-pnl-today');
    await expect(label).toContainText('P&L · Thu 10');

    const value = page.getByTestId('dashboard-stat-pnl-today-value');
    await expect(value).toHaveText('+$156.60');
  });
});

test.describe('Dashboard — aucun débordement horizontal (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('scrollWidth du document ne dépasse jamais clientWidth', async ({ page }) => {
    await freezeClock(page);
    await page.goto(DASHBOARD_URL);
    await expect(page.getByTestId('screen-dashboard')).toBeVisible();
    // Laisse la courbe d'equity (recharts, `ResponsiveContainer`) se stabiliser avant de mesurer.
    await expect(page.getByTestId('dashboard-equity-chart').locator('svg')).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth,
      `scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
    ).toBeLessThanOrEqual(overflow.clientWidth);
  });
});
