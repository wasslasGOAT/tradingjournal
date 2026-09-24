import { expect, test } from '@playwright/test';

/**
 * « Réduire les animations » — `Sheet` (ADR-017, ROADMAP M1 « critères de fin » :
 * « avec réduire les animations activé, aucune animation de déplacement ne joue »).
 * Séparé de `performance.spec.ts` (M1-9 sur ce protocole) : ce test vérifie un
 * *comportement* (position instantanée), pas une fluidité chiffrée — il n'a donc
 * pas besoin d'un export de production et reste sur le serveur de dev (projet
 * `chromium` par défaut), via le catalogue de composants (`app/(dev)/catalog.tsx`,
 * exclu du bundle de production — voir `metro.config.js` — donc indisponible pour
 * le projet `chromium-perf-prod`).
 */

test.describe('Réduction des animations — Sheet', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

  test('avec « réduire les animations », la Sheet du catalogue s’ouvre instantanément (aucune image de transition)', async ({
    page,
  }) => {
    await page.goto('/catalog');
    await expect(page.getByTestId('catalog-screen')).toBeVisible();

    await page.getByTestId('catalog-sheet-trigger').click();
    const panel = page.getByTestId('catalog-sheet-panel');
    await expect(panel).toBeVisible();

    // Échantillonne le décalage vertical (translateY) du panneau sur plusieurs images
    // successives (`requestAnimationFrame`, pas un délai arbitraire) : s'il y avait
    // encore une animation de glissement en cours, la valeur varierait d'une image à
    // l'autre. Avec « réduire les animations », le panneau doit déjà être à sa position
    // finale (translateY ≈ 0) dès la première image observée après le clic.
    const samples = await page.evaluate(async () => {
      const el = document.querySelector('[data-testid="catalog-sheet-panel"]');
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

    expect(
      samples.length,
      'le panneau doit exister au DOM pour être échantillonné',
    ).toBeGreaterThan(0);
    for (const y of samples) {
      expect(
        Math.abs(y),
        `translateY observé sur les 12 images : ${samples.join(', ')}`,
      ).toBeLessThan(2);
    }
  });
});
