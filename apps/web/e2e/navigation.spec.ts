import { expect, test } from '@playwright/test';

/**
 * Navigation de la coquille `_shell` (W-5, ADR-011, ADR-024 ; ROADMAP
 * M1-web « critères de fin ») : tab bar flottante < 1024 px, sidebar fixe
 * >= 1024 px, compte + période comme paramètres de recherche typés
 * (`src/routes/_shell.tsx`) — un rechargement sur une route profonde doit
 * conserver le compte et la période choisis (source de vérité unique :
 * l'URL, pas un store séparé). N'exige pas Supabase (ADR-020) : données
 * factices (`src/data/sample`).
 */

test.describe('Navigation — tab bar mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('affiche le Dashboard au démarrage et navigue entre les 5 onglets', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('screen-dashboard')).toBeVisible();
    // Sous 1024 px : tab bar, pas de sidebar (ADR-011).
    await expect(page.getByTestId('app-sidebar')).toBeHidden();
    await expect(page.getByTestId('app-tab-bar')).toBeVisible();

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
    await expect(page.getByTestId('app-tab-bar')).toBeHidden();

    for (const id of ['dashboard', 'calendar', 'trades', 'journal', 'analytics', 'rules', 'settings']) {
      await expect(page.getByTestId(`sidebar-link-${id}`)).toBeVisible();
    }
    // Pas de "Plus" dans la sidebar (Analytics/Règles/Réglages y sont directs, ADR-011).
    await expect(page.getByTestId('sidebar-link-more')).toHaveCount(0);

    await page.getByTestId('sidebar-link-calendar').click();
    await expect(page.getByTestId('screen-calendar')).toBeVisible();
  });

  test('la sidebar est pilotable au clavier (Tab puis Entrée)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('sidebar-link-dashboard').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('sidebar-link-calendar')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('screen-calendar')).toBeVisible();
  });
});

test.describe('Navigation — compte et période dans l’URL', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('changer de compte depuis une route profonde reste sur cette route (ne revient pas au Dashboard)', async ({
    page,
  }) => {
    // Défaut produit constaté (à corriger par `app-ui`, voir rapport) :
    // `onAccountChange`/`onPeriodChange` (`src/routes/_shell.tsx`) appellent
    // `navigate({ search: (prev) => ({ ...prev, account }) })` **sans** `to` —
    // TanStack Router résout alors la cible par défaut sur le chemin de la
    // route `_shell` elle-même (`/`) plutôt que de rester sur la route
    // enfant active (`/calendar`). Changer de compte depuis le Calendrier (ou
    // toute autre route) renvoie donc au Dashboard. Ce test documente le
    // comportement attendu (ARCHITECTURE §6.1 : « compte... persisté... »,
    // sans mention d'un changement d'écran) — il échoue tant que ce défaut
    // n'est pas corrigé.
    await page.goto('/calendar');
    await expect(page.getByTestId('screen-calendar')).toBeVisible();

    await page.getByTestId('header-account-trigger').click();
    await page.getByRole('option', { name: /prop/i }).click();
    await expect(page).toHaveURL(/account=acc-demo-prop/);
    await expect(page.getByTestId('screen-calendar')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('screen-calendar')).toBeVisible();
    await expect(page).toHaveURL(/account=acc-demo-prop/);
    // `SelectValue` reflète bien le compte choisi après rechargement (pas retombé sur "Tous les comptes").
    await expect(page.getByTestId('header-account-trigger')).not.toHaveText(/tous/i);
  });

  test('naviguer directement vers une URL profonde avec compte + période explicites les restaure', async ({
    page,
  }) => {
    await page.goto('/calendar?account=acc-demo-main&from=2026-08-01&to=2026-08-31&shortcut=custom');
    await expect(page.getByTestId('screen-calendar')).toBeVisible();
    await expect(page).toHaveURL(/from=2026-08-01/);
    await expect(page).toHaveURL(/to=2026-08-31/);

    await page.reload();
    await expect(page.getByTestId('screen-calendar')).toBeVisible();
    await expect(page).toHaveURL(/account=acc-demo-main/);
    await expect(page).toHaveURL(/from=2026-08-01/);
  });
});
