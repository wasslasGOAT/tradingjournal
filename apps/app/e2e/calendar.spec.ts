import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Calendrier (M1-4 correctif largeur, ROADMAP M1 « correctif remonté le
 * 2026-09-24 ») : les montants des cellules (`DayCell`) et du total hebdo
 * (`WeekTotalCell`) ne doivent jamais être tronqués/coupés (ellipsis ou
 * `overflow: hidden` qui masque du texte), à 320, 375 et 430 px — les trois
 * largeurs les plus étroites d'un téléphone (ARCHITECTURE §6). En dessous de
 * `NARROW_CALENDAR_BREAKPOINT` (360 px, `calendarLayout.ts`), la colonne
 * « Total » se replie en ligne pleine largeur (`WeekTotalCell` `variant="row"`) —
 * doit rester lisible dans les deux variantes.
 *
 * Détection de troncature : compare `scrollWidth` (largeur nécessaire au
 * texte) à `clientWidth` (largeur réellement allouée) de chaque nœud de texte
 * « feuille » (sans enfant) à l'intérieur d'une cellule — une différence
 * signifie que le texte dépasse sa boîte, tronqué visuellement
 * (`numberOfLines={1}` sur RNW pose `overflow: hidden` + `text-overflow: ellipsis`,
 * qui ne provoque *pas* d'échec ici tant que le texte tient dans la largeur
 * allouée). N'exige pas Supabase (ADR-020) : données factices
 * (`features/calendar/sampleData.ts`).
 */

interface LeafTextMetrics {
  readonly text: string | null;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly truncated: boolean;
}

async function truncatedLeafTexts(
  page: Page,
  containerSelector: string,
): Promise<LeafTextMetrics[]> {
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

const WIDTHS = [320, 375, 430] as const;

test.describe('Calendrier — montants non tronqués', () => {
  for (const width of WIDTHS) {
    test(`largeur ${width}px : aucun montant de jour ni de total hebdo n'est tronqué`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/calendar');
      await expect(page.getByTestId('screen-calendar')).toBeVisible();
      await expect(page.getByTestId('calendar-grid')).toBeVisible();

      const truncatedDays = await truncatedLeafTexts(page, '[data-testid^="calendar-day-"]');
      expect(
        truncatedDays,
        `montants de cellule(s) tronqués à ${width}px : ${JSON.stringify(truncatedDays)}`,
      ).toEqual([]);

      const truncatedTotals = await truncatedLeafTexts(
        page,
        '[data-testid^="calendar-week-total-"]',
      );
      expect(
        truncatedTotals,
        `total(aux) hebdo tronqué(s) à ${width}px : ${JSON.stringify(truncatedTotals)}`,
      ).toEqual([]);
    });
  }

  test('la colonne « Total » reste présente et lisible ≥ 360px, et se replie en ligne < 360px', async ({
    page,
  }) => {
    // < NARROW_CALENDAR_BREAKPOINT (360px, calendarLayout.ts) : colonne repliée en ligne,
    // le total de chaque semaine réapparaît en variante `row` (label répété, voir WeekTotalCell).
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/calendar');
    const firstTotalNarrow = page.getByTestId('calendar-week-total-0-value');
    await expect(firstTotalNarrow).toBeVisible();
    await expect(firstTotalNarrow).not.toHaveText('');

    // ≥ NARROW_CALENDAR_BREAKPOINT : colonne à part, toujours présente et non vide.
    await page.setViewportSize({ width: 375, height: 800 });
    const firstTotalWide = page.getByTestId('calendar-week-total-0-value');
    await expect(firstTotalWide).toBeVisible();
    await expect(firstTotalWide).not.toHaveText('');
  });
});
