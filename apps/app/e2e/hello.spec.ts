import { expect, test } from '@playwright/test';

import { getSupabaseDevEnvStatus } from './helpers/env';

/**
 * Parcours web de l'écran Hello (T10, ROADMAP M0).
 *
 * `apps/app/.env` n'est pas encore renseigné avec un vrai projet Supabase cloud
 * de dev (ADR-020) au moment où ces tests sont écrits : les cas ci-dessous sont
 * donc écrits pour s'exécuter correctement dans les deux situations (déterminés
 * dynamiquement via `getSupabaseDevEnvStatus`, qui lit `apps/app/.env` comme le
 * fera le serveur de dev Expo démarré par `playwright.config.ts`), plutôt que de
 * supposer l'une ou l'autre.
 */
const supabaseEnv = getSupabaseDevEnvStatus();

const NOT_CONFIGURED_SKIP_REASON =
  'apps/app/.env contient désormais une configuration Supabase valide : ce test ne peut plus ' +
  'observer le cas « configuration absente ». Voir le test « affiche schema_version = 1 ' +
  'après le squelette » ci-dessous pour le cas correspondant.';

test.describe('Hello — configuration Supabase absente', () => {
  test('démarre sans écran blanc, affiche « Configuration manquante », sans erreur console', async ({
    page,
  }) => {
    test.skip(supabaseEnv.configured, NOT_CONFIGURED_SKIP_REASON);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.goto('/');

    // Pas d'écran blanc : la racine de l'écran Hello est montée.
    await expect(page.getByTestId('hello-screen')).toBeVisible();

    // État « configuration manquante » (et non une erreur de requête ou un
    // squelette qui resterait bloqué) : voir `features/hello/HelloScreen.tsx`.
    await expect(page.getByTestId('hello-config-error')).toBeVisible();
    await expect(page.getByTestId('hello-heading')).not.toBeEmpty();

    expect(pageErrors, `Erreurs JS non gérées :\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Erreurs console :\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});

test.describe('Hello — bascule FR/EN du titre (locale du navigateur)', () => {
  test.describe('locale fr-FR', () => {
    test.use({ locale: 'fr-FR' });

    test('titre affiché en français', async ({ page }) => {
      test.skip(supabaseEnv.configured, NOT_CONFIGURED_SKIP_REASON);

      await page.goto('/');

      await expect(page.getByTestId('hello-heading')).toHaveText('Configuration manquante');
    });
  });

  test.describe('locale en-US', () => {
    test.use({ locale: 'en-US' });

    test('title displayed in English', async ({ page }) => {
      test.skip(supabaseEnv.configured, NOT_CONFIGURED_SKIP_REASON);

      await page.goto('/');

      await expect(page.getByTestId('hello-heading')).toHaveText('Missing configuration');
    });
  });
});

test.describe('Hello — Supabase configuré', () => {
  test('affiche schema_version = 1 (app_meta) après le squelette', async ({ page }) => {
    test.skip(!supabaseEnv.configured, supabaseEnv.reason);

    // Ralentit volontairement la lecture de `app_meta` pour garantir que le
    // squelette (état de chargement, ADR-017 : jamais de saut direct sans
    // squelette) reste observable même sur un réseau local rapide, plutôt que
    // d'attendre un temps arbitraire.
    await page.route('**/rest/v1/app_meta*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/');

    await expect(page.getByTestId('hello-skeleton')).toBeVisible();

    const content = page.getByTestId('hello-content');
    await expect(content).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('hello-schema-version')).toContainText('1');
  });
});
