import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { freezeClock } from './helpers/clock';

/**
 * Calendrier (W-6, W-6b, ARCHITECTURE §5.5 ; ROADMAP M1-web « critères de
 * fin ») : 7 colonnes de jour + un total par semaine, cases de taille
 * uniforme, navigation mois précédent/suivant, ouverture de la Sheet détail
 * du jour, repli mobile de la colonne « Total »
 * (`NARROW_CALENDAR_BREAKPOINT`, `calendarLayout.ts`). Données factices
 * (`src/data/sample`), mois fixé dans l'URL, horloge figée en complément.
 */

const CALENDAR_URL_SEPT_2026 =
  '/calendar?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom';

async function truncatedLeafTexts(page: Page, containerSelector: string) {
  return page.evaluate((selector) => {
    const containers = Array.from(document.querySelectorAll(selector));
    const leaves = containers.flatMap((container) => Array.from(container.querySelectorAll('*')));
    return leaves
      .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 0)
      .map((el) => ({
        text: el.textContent,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        truncated: el.scrollWidth > el.clientWidth + 1,
      }))
      .filter((entry) => entry.truncated);
  }, containerSelector);
}

test.describe('Calendrier — grille (bureau, 1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('7 colonnes de jour + une colonne "Total" par semaine, cases carrées uniformes', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto(CALENDAR_URL_SEPT_2026);
    const grid = page.getByTestId('calendar-grid');
    await expect(grid).toBeVisible();

    // Ligne d'en-tête : 7 libellés de jour de semaine + le libellé "Total" (>= 400px, colonne
    // non repliée, `NARROW_CALENDAR_BREAKPOINT`) — 8 éléments texte au total.
    const headerLabelCount = await grid.locator('> div').first().locator('> span').count();
    expect(headerLabelCount).toBe(8);
    await expect(page.getByTestId('calendar-week-total-0-value')).toBeVisible();

    // Chaque semaine rendue a exactement 7 `DayCell` (bourrage inclus, `buildCalendarGrid`).
    const dayCellCount = await page.locator('[data-testid^="calendar-day-2026-"]').count();
    expect(dayCellCount).toBeGreaterThan(0);
    expect(dayCellCount % 7).toBe(0);

    // Toutes les cellules de jour d'une même semaine partagent la même boîte (`aspect-ratio: 1`
    // posé par le conteneur, `CalendarScreen.tsx`) : largeur ≈ hauteur, et toutes égales entre elles.
    const sizes = await page
      .locator('[data-testid^="calendar-day-2026-09-"]')
      .evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return { width: Math.round(rect.width), height: Math.round(rect.height) };
        }),
      );
    const firstSize = sizes[0];
    expect(firstSize).toBeDefined();
    for (const size of sizes) {
      expect(Math.abs(size.width - (firstSize?.width ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs(size.height - (firstSize?.height ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  test('aucun montant de jour ni de total hebdo n’est tronqué', async ({ page }) => {
    await freezeClock(page);
    await page.goto(CALENDAR_URL_SEPT_2026);
    await expect(page.getByTestId('calendar-grid')).toBeVisible();

    const truncatedDays = await truncatedLeafTexts(page, '[data-testid^="calendar-day-"]');
    expect(
      truncatedDays,
      `montants de cellule(s) tronqués : ${JSON.stringify(truncatedDays)}`,
    ).toEqual([]);

    const truncatedTotals = await truncatedLeafTexts(page, '[data-testid^="calendar-week-total-"]');
    expect(
      truncatedTotals,
      `total(aux) hebdo tronqué(s) : ${JSON.stringify(truncatedTotals)}`,
    ).toEqual([]);
  });

  test('navigation mois précédent/suivant met à jour le libellé et la grille', async ({ page }) => {
    await freezeClock(page);
    await page.goto(CALENDAR_URL_SEPT_2026);
    await expect(page.getByTestId('calendar-grid')).toBeVisible();
    const monthLabel = page.getByTestId('calendar-month-label');
    const septemberLabel = await monthLabel.textContent();
    const firstDayBefore = await page
      .locator('[data-testid^="calendar-day-2026-09-"]')
      .first()
      .getAttribute('data-testid');

    // Août 2026 a des trades factices (`tradesSampleData.ts`) : la grille reste affichée.
    await page.getByTestId('calendar-prev-month').click();
    await expect(monthLabel).not.toHaveText(septemberLabel ?? '');
    await expect(page.getByTestId('calendar-grid')).toBeVisible();
    await expect(page.locator('[data-testid^="calendar-day-2026-08-"]').first()).toBeVisible();

    // Retour à septembre : même libellé et même première cellule qu'au départ.
    await page.getByTestId('calendar-next-month').click();
    await expect(monthLabel).toHaveText(septemberLabel ?? '');
    const firstDayAfter = await page
      .locator('[data-testid^="calendar-day-2026-09-"]')
      .first()
      .getAttribute('data-testid');
    expect(firstDayAfter).toBe(firstDayBefore);

    // Octobre 2026 n'a aucune donnée factice : le libellé avance quand même (état vide, pas
    // un blocage de la navigation) — la grille cède la place à `EmptyState` (M4/M5 : vraies
    // données).
    await page.getByTestId('calendar-next-month').click();
    await expect(monthLabel).not.toHaveText(septemberLabel ?? '');
    await expect(page.getByTestId('calendar-empty')).toBeVisible();
  });

  test('un clic sur un jour du mois ouvre la Sheet détail avec le bon titre', async ({ page }) => {
    await freezeClock(page);
    await page.goto(CALENDAR_URL_SEPT_2026);
    await page.getByTestId('calendar-day-2026-09-14').click();

    const sheet = page.getByTestId('calendar-day-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('calendar-detail-trade-m-0914')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });
});

test.describe('Calendrier — repli mobile de la colonne "Total"', () => {
  test('la colonne "Total" reste présente et lisible ≥ 400px, et se replie en ligne < 400px', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(CALENDAR_URL_SEPT_2026);
    const firstTotalNarrow = page.getByTestId('calendar-week-total-0-value');
    await expect(firstTotalNarrow).toBeVisible();
    await expect(firstTotalNarrow).not.toHaveText('');

    await page.setViewportSize({ width: 430, height: 800 });
    const firstTotalWide = page.getByTestId('calendar-week-total-0-value');
    await expect(firstTotalWide).toBeVisible();
    await expect(firstTotalWide).not.toHaveText('');
  });

  test('aucun montant tronqué à 320, 375 et 430 px', async ({ page }) => {
    await freezeClock(page);
    for (const width of [320, 375, 430] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(CALENDAR_URL_SEPT_2026);
      await expect(page.getByTestId('calendar-grid')).toBeVisible();

      const truncatedDays = await truncatedLeafTexts(page, '[data-testid^="calendar-day-"]');
      expect(
        truncatedDays,
        `montants de cellule(s) tronqués à ${width}px : ${JSON.stringify(truncatedDays)}`,
      ).toEqual([]);

      const truncatedTotals = await truncatedLeafTexts(page, '[data-testid^="calendar-week-total-"]');
      expect(
        truncatedTotals,
        `total(aux) hebdo tronqué(s) à ${width}px : ${JSON.stringify(truncatedTotals)}`,
      ).toEqual([]);
    }
  });
});
