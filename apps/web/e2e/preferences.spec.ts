import { expect, test } from '@playwright/test';

/**
 * Écran Réglages (W-5, ARCHITECTURE §6.2 ; ROADMAP M1-web « critères de
 * fin ») : thème, couleurs P&L, masquage des montants, langue — chaque
 * bascule doit être **effective immédiatement** (aucune navigation ni
 * rechargement) et **persistée** (relue depuis `localStorage` après un
 * rechargement complet, clés `edgebook.web.preferences.*`,
 * `features/preferences/*-store.ts`). N'exige pas Supabase (ADR-020) :
 * stores locaux (Zustand + `localStorage`).
 *
 * Couleurs vérifiées contre `packages/ui/src/tokens.data.cjs` (figées
 * volontairement) : fond sombre `#000000`, fond clair `#F7F8FA` ; P&L
 * positif `blueGray` sombre `#5081FC`, `greenRed` sombre `#37C97E`. Le fond
 * n'est posé que sur `<body>` (`globals.css`, `@apply bg-background`) — pas
 * sur `screen-settings` lui-même, à la différence du composant `Screen`
 * natif gelé.
 */

test.describe('Réglages — thème', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });

  test('bascule système → sombre → clair sans navigation ni rechargement, persiste après rechargement', async ({
    page,
  }) => {
    await page.goto('/settings');
    const body = page.locator('body');

    // Préférence « système » par défaut, avec `colorScheme: 'light'` côté navigateur.
    await expect(body).toHaveCSS('background-color', 'rgb(247, 248, 250)');

    await page.getByTestId('settings-theme-option-dark').click();
    // Toujours sur `/settings` : la bascule ne déclenche aucune navigation (le chemin ne
    // change pas ; compte/période restent des paramètres de recherche indépendants, ADR-024).
    await expect(page).toHaveURL(/\/settings(\?|$)/);
    await expect(body).toHaveCSS('background-color', 'rgb(0, 0, 0)');

    await page.getByTestId('settings-theme-option-light').click();
    await expect(body).toHaveCSS('background-color', 'rgb(247, 248, 250)');

    // Choix final persisté : sombre.
    await page.getByTestId('settings-theme-option-dark').click();
    await expect(body).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('edgebook.web.preferences.themePreference')),
      )
      .toBe('dark');

    await page.reload();
    await expect(page.getByTestId('screen-settings')).toBeVisible();
    await expect(body).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });
});

test.describe('Réglages — couleurs P&L et masquage des montants', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });

  test('couleurs P&L effectives sur le dashboard et persistées', async ({ page }) => {
    await page.goto('/settings');
    // Thème sombre forcé pour des couleurs déterministes (indépendant du `colorScheme` du test).
    await page.getByTestId('settings-theme-option-dark').click();

    // Période avec un dernier jour de trading gagnant connu (`m-0914`, +94,10) pour un
    // P&L du jour déterministe et positif (`dashboard.ts#recentDayPnl` = dernier jour de
    // la période) — voir `src/data/sample/tradesSampleData.ts`.
    await page.goto('/?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
    const pnlValue = page.getByTestId('dashboard-stat-pnl-today-value');
    await expect(pnlValue).toBeVisible();
    // Schéma par défaut : `blueGray` → P&L positif en bleu accent.
    await expect(pnlValue).toHaveCSS('color', 'rgb(80, 129, 252)');

    await page.getByTestId('sidebar-link-settings').click();
    await page.getByTestId('settings-pnl-colors-option-greenRed').click();

    await page.goto('/?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
    await expect(page.getByTestId('dashboard-stat-pnl-today-value')).toHaveCSS(
      'color',
      'rgb(55, 201, 126)',
    );
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('edgebook.web.preferences.pnlColorScheme')),
      )
      .toBe('greenRed');

    await page.reload();
    await expect(page.getByTestId('dashboard-stat-pnl-today-value')).toHaveCSS(
      'color',
      'rgb(55, 201, 126)',
    );
  });

  test('masquage des montants effectif (motif masqué) et persisté', async ({ page }) => {
    await page.goto('/?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
    const balance = page.getByTestId('dashboard-balance-value');
    await expect(balance).toBeVisible();
    await expect(balance).not.toHaveText('•••••');

    await page.getByTestId('sidebar-link-settings').click();
    await page.getByTestId('settings-hide-amounts-option-hidden').click();

    await page.goto('/?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
    await expect(page.getByTestId('dashboard-balance-value')).toHaveText('•••••');
    await expect(page.getByTestId('dashboard-stat-pnl-today-value')).toHaveText('•••••');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('edgebook.web.preferences.hideAmounts')))
      .toBe('true');

    await page.reload();
    await expect(page.getByTestId('dashboard-balance-value')).toHaveText('•••••');

    // Restaure la visibilité (bascule inverse effective aussi).
    await page.getByTestId('sidebar-link-settings').click();
    await page.getByTestId('settings-hide-amounts-option-visible').click();
    await page.goto('/?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
    await expect(page.getByTestId('dashboard-balance-value')).not.toHaveText('•••••');
  });
});

test.describe('Réglages — langue', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('bascule FR ↔ EN depuis Réglages, persistée après rechargement, sans navigation', async ({
    page,
  }) => {
    await page.goto('/settings');

    await page.getByTestId('settings-language-option-fr').click();
    await expect(page.getByTestId('settings-title')).toHaveText('Réglages');

    await page.getByTestId('settings-language-option-en').click();
    // Toujours sur `/settings` : la bascule de langue ne déclenche aucune navigation ni rechargement.
    await expect(page).toHaveURL(/\/settings(\?|$)/);
    await expect(page.getByTestId('settings-title')).toHaveText('Settings');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('edgebook.web.preferences.language')))
      .toBe('en');
    // `<html lang>` réconcilié (accessibilité, W-5).
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');

    await page.reload();
    await expect(page.getByTestId('settings-title')).toHaveText('Settings');

    await page.getByTestId('settings-language-option-fr').click();
    await page.reload();
    await expect(page.getByTestId('settings-title')).toHaveText('Réglages');
  });
});
