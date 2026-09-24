import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Fluidité et « réduire les animations » (ADR-017, ROADMAP M1 « critères de
 * fin » — protocole web reformulé : CPU ralenti ×4 via CDP, mêmes
 * interactions que le protocole Android/HWUI : ouvertures/fermetures de
 * `Sheet` et bascules de `Segmented`). N'exige pas Supabase (ADR-020).
 *
 * `Sheet` n'a pour l'instant qu'un seul point d'entrée dans l'app (le
 * catalogue de composants, `app/(dev)/catalog.tsx` — le premier usage réel
 * arrive avec la sheet du jour en M5) : mesuré là. `Segmented` est mesuré sur
 * l'écran Réglages (écran réel, plus léger que le catalogue qui affiche ~25
 * primitives et 12 instances de `Chart` simultanément — mesurer *aussi* sur
 * le catalogue mélangerait la fluidité de `Segmented`/`Sheet` avec le poids
 * du catalogue lui-même, un outil de dev qui n'existe pas en production).
 */

/** Démarre un enregistrement de frames (`requestAnimationFrame`) côté page, jusqu'à l'appel de `stopFrameRecording`. */
async function startFrameRecording(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as unknown as { __frameTimestamps: number[]; __recording: boolean };
    win.__frameTimestamps = [];
    win.__recording = true;
    const loop = (now: number) => {
      if (!win.__recording) return;
      win.__frameTimestamps.push(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

/** Arrête l'enregistrement (après une frame supplémentaire, pour ne pas couper la dernière mesure) et renvoie les timestamps. */
async function stopFrameRecording(page: Page): Promise<number[]> {
  return page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        requestAnimationFrame(() => {
          const win = window as unknown as { __frameTimestamps: number[]; __recording: boolean };
          win.__recording = false;
          resolve(win.__frameTimestamps);
        });
      }),
  );
}

interface FrameStats {
  readonly frameCount: number;
  readonly avgFps: number;
  readonly maxFrameMs: number;
  readonly deltas: readonly number[];
}

function computeFrameStats(timestamps: readonly number[]): FrameStats {
  const deltas: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    deltas.push(timestamps[i]! - timestamps[i - 1]!);
  }
  const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  return {
    frameCount: timestamps.length,
    avgFps: avgDelta > 0 ? 1000 / avgDelta : 0,
    maxFrameMs: deltas.length > 0 ? Math.max(...deltas) : 0,
    deltas,
  };
}

function formatStats(stats: FrameStats): string {
  const worst = stats.deltas
    .slice()
    .sort((a, b) => b - a)
    .slice(0, 5)
    .map((d) => d.toFixed(0));
  return (
    `frames=${stats.frameCount}, fps moyen=${stats.avgFps.toFixed(1)}, ` +
    `image la plus longue=${stats.maxFrameMs.toFixed(1)} ms, 5 pires images (ms)=[${worst.join(', ')}]`
  );
}

test.describe('Fluidité — CPU ralenti ×4 (ADR-017 reformulé, protocole web)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Segmented (Réglages) : bascules répétées sous CPU ×4', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('screen-settings')).toBeVisible();

    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    try {
      await startFrameRecording(page);
      // 10 bascules (ROADMAP M1 : « 10 bascules de Segmented »), aller-retour sur 2 options.
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('settings-pnl-colors-option-greenRed').click({ force: true });
        await page.getByTestId('settings-pnl-colors-option-blueGray').click({ force: true });
      }
      const timestamps = await stopFrameRecording(page);
      const stats = computeFrameStats(timestamps);

      expect(stats.avgFps, `fps moyen insuffisant — ${formatStats(stats)}`).toBeGreaterThanOrEqual(
        55,
      );
      expect(
        stats.maxFrameMs,
        `au moins une image > 50 ms — ${formatStats(stats)}`,
      ).toBeLessThanOrEqual(50);
    } finally {
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });

  test('Sheet (catalogue) : ouvertures/fermetures répétées sous CPU ×4', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/catalog');
    await expect(page.getByTestId('catalog-screen')).toBeVisible();

    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    try {
      await startFrameRecording(page);
      // Réduit à 5 cycles (au lieu des 10 du protocole Android) : sous CPU ×4, chaque
      // ouverture/fermeture de `Sheet` sur cette page a mesuré plusieurs secondes lors de
      // l'investigation de ce test (bundle web *dev*, non minifié) — 10 cycles dépasseraient
      // largement un budget de test raisonnable sans changer le verdict (déjà net à 5).
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('catalog-sheet-trigger').click({ force: true });
        await page.getByTestId('catalog-sheet-close').click({ force: true });
      }
      const timestamps = await stopFrameRecording(page);
      const stats = computeFrameStats(timestamps);

      expect(stats.avgFps, `fps moyen insuffisant — ${formatStats(stats)}`).toBeGreaterThanOrEqual(
        55,
      );
      expect(
        stats.maxFrameMs,
        `au moins une image > 50 ms — ${formatStats(stats)}`,
      ).toBeLessThanOrEqual(50);
    } finally {
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });
});

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
