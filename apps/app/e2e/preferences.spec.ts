import { expect, test } from '@playwright/test';

/**
 * Écran Réglages (M1-9, ARCHITECTURE §6.2, ROADMAP M1 « critères de fin ») :
 * thème, couleurs P&L, masquage des montants, langue — chaque bascule doit
 * être **effective immédiatement** (sans navigation ni rechargement) et
 * **persistée** (relue depuis `localStorage` après un rechargement complet
 * de la page, `packages/ui/src/theme/preferencesStorage.ts` /
 * `apps/app/lib/language/languagePreference.ts`). N'exige pas Supabase
 * configuré (ADR-020) : ces préférences sont des stores locaux (Zustand +
 * `localStorage`), indépendants de la base.
 *
 * Couleurs attendues vérifiées contre `packages/ui/src/tokens.data.cjs`
 * (valeurs figées ici volontairement : un changement de palette doit casser
 * ce test et pousser à le mettre à jour consciemment) :
 * - thème sombre : fond `#000000` → `rgb(0, 0, 0)`.
 * - thème clair (et « système » avec `colorScheme: 'light'`) : fond
 *   `#F7F8FA` → `rgb(247, 248, 250)`.
 * - P&L positif, schéma `blueGray` (défaut), thème sombre : `dark.accent`
 *   `#5081FC` → `rgb(80, 129, 252)`.
 * - P&L positif, schéma `greenRed`, thème sombre : `#37C97E` →
 *   `rgb(55, 201, 126)`.
 */

test.describe('Réglages — thème', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });

  test('bascule système → sombre → clair sans navigation ni rechargement, persiste après rechargement', async ({
    page,
  }) => {
    await page.goto('/settings');

    const root = page.getByTestId('screen-settings');
    // Préférence « système » par défaut, avec `colorScheme: 'light'` côté navigateur.
    await expect(root).toHaveCSS('background-color', 'rgb(247, 248, 250)');

    await page.getByTestId('settings-theme-option-dark').click();
    // Toujours sur `/settings` : la bascule ne déclenche aucune navigation.
    await expect(page).toHaveURL(/\/settings$/);
    await expect(root).toHaveCSS('background-color', 'rgb(0, 0, 0)');

    await page.getByTestId('settings-theme-option-light').click();
    await expect(root).toHaveCSS('background-color', 'rgb(247, 248, 250)');

    // Choix final persisté : sombre.
    await page.getByTestId('settings-theme-option-dark').click();
    await expect(root).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('edgebook.preferences.themePreference')))
      .toBe('dark');

    await page.reload();
    await expect(page.getByTestId('screen-settings')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });
});

test.describe('Réglages — couleurs P&L et masquage des montants', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });

  test('couleurs P&L effectives sur le dashboard et persistées', async ({ page }) => {
    await page.goto('/settings');
    // Thème sombre forcé pour des couleurs déterministes (indépendant du `colorScheme` du test).
    await page.getByTestId('settings-theme-option-dark').click();

    await page.getByTestId('sidebar-link-dashboard').click();
    const pnlValue = page.getByTestId('dashboard-stat-pnl-today-value');
    await expect(pnlValue).toBeVisible();
    // Schéma par défaut : `blueGray` → P&L positif en bleu accent.
    await expect(pnlValue).toHaveCSS('color', 'rgb(80, 129, 252)');

    await page.getByTestId('sidebar-link-settings').click();
    await page.getByTestId('settings-pnl-colors-option-greenRed').click();

    await page.getByTestId('sidebar-link-dashboard').click();
    await expect(page.getByTestId('dashboard-stat-pnl-today-value')).toHaveCSS(
      'color',
      'rgb(55, 201, 126)',
    );
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('edgebook.preferences.pnlColorScheme')))
      .toBe('greenRed');

    await page.reload();
    await expect(page.getByTestId('dashboard-stat-pnl-today-value')).toHaveCSS(
      'color',
      'rgb(55, 201, 126)',
    );
  });

  test('masquage des montants effectif (motif masqué) et persisté', async ({ page }) => {
    await page.goto('/settings');
    const balance = async () => {
      await page.getByTestId('sidebar-link-dashboard').click();
      const el = page.getByTestId('dashboard-balance-value');
      await expect(el).toBeVisible();
      return el;
    };

    const before = await balance();
    await expect(before).not.toHaveText('•••••');

    await page.getByTestId('sidebar-link-settings').click();
    await page.getByTestId('settings-hide-amounts-option-hidden').click();

    const afterHidden = await balance();
    await expect(afterHidden).toHaveText('•••••');
    await expect(page.getByTestId('dashboard-stat-pnl-today-value')).toHaveText('•••••');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('edgebook.preferences.hideAmounts')))
      .toBe('true');

    await page.reload();
    await expect(page.getByTestId('dashboard-balance-value')).toHaveText('•••••');

    // Restaure la visibilité (bascule inverse effective aussi).
    await page.getByTestId('sidebar-link-settings').click();
    await page.getByTestId('settings-hide-amounts-option-visible').click();
    const afterVisible = await balance();
    await expect(afterVisible).not.toHaveText('•••••');
  });
});

test.describe('Réglages — langue', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('bascule FR ↔ EN depuis Réglages, persistée après rechargement', async ({ page }) => {
    await page.goto('/settings');

    await page.getByTestId('settings-language-option-fr').click();
    await expect(page.getByTestId('settings-title')).toHaveText('Réglages');

    await page.getByTestId('settings-language-option-en').click();
    await expect(page.getByTestId('settings-title')).toHaveText('Settings');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('edgebook.preferences.language')))
      .toBe('en');

    await page.reload();
    await expect(page.getByTestId('settings-title')).toHaveText('Settings');

    await page.getByTestId('settings-language-option-fr').click();
    await page.reload();
    await expect(page.getByTestId('settings-title')).toHaveText('Réglages');
  });
});
