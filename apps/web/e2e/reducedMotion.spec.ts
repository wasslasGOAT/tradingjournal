import { expect, test } from '@playwright/test';

import { freezeClock } from './helpers/clock';

/**
 * « Réduire les animations » (ADR-017, ROADMAP M1-web « critères de fin » :
 * « transitions CSS respectant `prefers-reduced-motion` »). Contrairement à
 * l'app Expo gelée (Reanimated, `useReducedMotion` dédié), le web fige
 * **globalement** toute animation/transition CSS via un unique media query
 * (`src/styles/globals.css`, `!important` — couvre aussi les transitions
 * inline posées par `vaul`/Radix) : ce test vérifie ce comportement sur un
 * vrai écran (la Sheet détail du jour du Calendrier), pas seulement le
 * catalogue de dev.
 */

test.describe('Réduction des animations — Sheet (détail du jour, Calendrier)', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('avec « réduire les animations », la Sheet du calendrier s’ouvre instantanément (aucune image de glissement)', async ({
    page,
  }) => {
    await freezeClock(page);
    await page.goto('/calendar?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
    await expect(page.getByTestId('screen-calendar')).toBeVisible();

    await page.getByTestId('calendar-day-2026-09-14').click();
    const panel = page.getByTestId('calendar-day-sheet');
    await expect(panel).toBeVisible();

    // Échantillonne le décalage vertical (translateY, panneau `Drawer` sur mobile) sur
    // plusieurs images successives (`requestAnimationFrame`, pas un délai arbitraire) : s'il y
    // avait encore une animation de glissement en cours, la valeur varierait d'une image à
    // l'autre. Avec « réduire les animations », le panneau doit déjà être à sa position finale
    // dès la première image observée après le clic.
    const samples = await page.evaluate(async () => {
      const el = document.querySelector('[data-testid="calendar-day-sheet"]');
      if (!el) return [];
      const readTranslateY = () => {
        const transform = getComputedStyle(el).transform;
        if (transform === 'none' || transform === '') return 0;
        try {
          return new DOMMatrixReadOnly(transform).m42;
        } catch {
          return Number.NaN;
        }
      };
      const values: number[] = [];
      for (let i = 0; i < 12; i++) {
        values.push(readTranslateY());
        await new Promise(requestAnimationFrame);
      }
      return values;
    });

    expect(samples.length, 'le panneau doit exister au DOM pour être échantillonné').toBeGreaterThan(
      0,
    );
    for (const y of samples) {
      expect(Math.abs(y), `translateY observé sur les 12 images : ${samples.join(', ')}`).toBeLessThan(
        2,
      );
    }
  });
});
