import { expect, test } from '@playwright/test';

/**
 * Parcours de navigation de la coquille `(app)` (M1-8, ARCHITECTURE §6.1) :
 * tab bar mobile (web < 1024 px, même disposition que natif) et sidebar web
 * (≥ 1024 px) — `features/shell/navItems.ts`. N'exige pas Supabase configuré
 * (ADR-020) : le Dashboard et les autres écrans utilisent des données
 * factices (`sampleData.ts`, M1-8), à la différence de l'écran Hello.
 */
test.describe('Navigation — tab bar mobile (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('affiche le Dashboard au démarrage et navigue entre les 5 onglets', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('screen-dashboard')).toBeVisible();
    // Sous 1024 px : tab bar, pas de sidebar (ADR-011).
    await expect(page.getByTestId('app-sidebar')).toHaveCount(0);

    const destinations = [
      { tab: 'tab-calendar', screen: 'screen-calendar' },
      { tab: 'tab-trades', screen: 'screen-trades' },
      { tab: 'tab-journal', screen: 'screen-journal' },
      { tab: 'tab-more', screen: 'screen-more' },
      { tab: 'tab-dashboard', screen: 'screen-dashboard' },
    ] as const;

    for (const { tab, screen } of destinations) {
      await page.getByTestId(tab).click();
      await expect(page.getByTestId(screen)).toBeVisible();
    }
  });
});

test.describe('Navigation — sidebar web large (1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('affiche la sidebar avec toutes les sections et navigue', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('screen-dashboard')).toBeVisible();
    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toBeVisible();

    for (const id of [
      'dashboard',
      'calendar',
      'trades',
      'journal',
      'analytics',
      'rules',
      'settings',
    ]) {
      await expect(page.getByTestId(`sidebar-link-${id}`)).toBeVisible();
    }
    // Pas de "Plus" dans la sidebar (Analytics/Règles/Réglages y sont directs, ADR-011).
    await expect(page.getByTestId('sidebar-link-more')).toHaveCount(0);

    await page.getByTestId('sidebar-link-calendar').click();
    await expect(page.getByTestId('screen-calendar')).toBeVisible();
  });
});
