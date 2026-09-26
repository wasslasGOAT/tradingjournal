import { expect, test } from '@playwright/test';

// Fumée (W-2/W-5) : le shell connecté (ADR-011) se charge sur `/` — header
// (compte, période) et placeholder du Dashboard visibles. Parcours complets
// et fluidité : W-9 (ADR-017).
test('shell se charge sur /', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-header')).toBeVisible();
  await expect(page.getByTestId('header-account-trigger')).toBeVisible();
  await expect(page.getByTestId('screen-dashboard')).toBeVisible();
});
