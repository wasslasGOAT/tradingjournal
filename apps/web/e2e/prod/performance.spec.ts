import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Fluidité (ADR-017, révision 2026-09-25 ; ROADMAP M1-web W-9) : sur l'export
 * de production (`vite preview`, ce projet `chromium-perf-prod`, voir
 * `playwright.config.ts`), CPU ralenti ×4 — **bloquant** cette fois (contrairement
 * à `apps/app/e2e/performance.spec.ts`, gelé, où le web restait informatif :
 * la révision d'ADR-017 du 2026-09-25 fait de la mesure web la mesure qui fait
 * foi pendant le MVP web-first, ADR-023). Seuils : moyenne ≥ 55 fps, aucune
 * image > 50 ms. Trois interactions (ROADMAP W-9) : ouverture/fermeture de la
 * `Sheet` (détail du jour, Calendrier), changement de mois du calendrier,
 * bascule du `Segmented` (Réglages — masquage des montants, un usage qui ne
 * change pas le thème). N'exige pas Supabase (ADR-020) : données factices.
 *
 * Amendement ADR-017 (2026-09-25, W-9) — le changement de **thème** sort de ce
 * seuil de fluidité : ce n'est pas une animation mais un recalcul ponctuel du
 * style de tout le document (variables CSS réévaluées au changement de
 * `data-theme`). Il a sa propre exigence, mesurée plus bas dans ce fichier :
 * appliqué sans rechargement de page, en moins de 200 ms. Le `Segmented` qui
 * pilote le thème (`settings-theme`) a été retiré de la mesure ≥ 55 fps
 * ci-dessous : c'est justement la mesure qui a motivé l'amendement (47 fps,
 * pire image 83 ms, après optimisation réelle de l'indicateur animé — le
 * coût restant est le recalcul global du style, non l'animation). Le
 * `Segmented` `$/%/R` du catalogue (`/dev/catalog`) aurait été un autre choix
 * naturel d'« usage courant », mais l'écran est exclu du build de production
 * par construction (voir `catalog-absent.spec.ts`, critère de fin W-4) : il
 * n'existe donc pas sur `vite preview`. On mesure à la place le `Segmented`
 * « masquage des montants » de Réglages (`settings-hide-amounts`), présent en
 * production, qui ne touche ni `data-theme` ni `data-pnl`.
 */

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

/** Bloquant (ADR-017 révision 2026-09-25) : contrairement à `apps/app/e2e/performance.spec.ts` (gelé). */
function assertAdr017Thresholds(stats: FrameStats, label: string): void {
  test
    .info()
    .annotations.push({ type: `fluidité (ADR-017) — ${label}`, description: formatStats(stats) });
  expect(
    stats.frameCount,
    `${label} — aucune image enregistrée (interaction cassée ?)`,
  ).toBeGreaterThan(0);
  expect(stats.avgFps, `${label} — fps moyen < 55 : ${formatStats(stats)}`).toBeGreaterThanOrEqual(
    55,
  );
  expect(
    stats.maxFrameMs,
    `${label} — image la plus longue > 50 ms : ${formatStats(stats)}`,
  ).toBeLessThanOrEqual(50);
}

test.describe('Fluidité — build de production, CPU ralenti ×4 (ADR-017, bloquant)', () => {
  test.describe('Segmented (Réglages, masquage des montants — ne change pas le thème)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('10 bascules répétées sous CPU ×4', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('screen-settings')).toBeVisible();

      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await startFrameRecording(page);
        for (let i = 0; i < 5; i++) {
          await page.getByTestId('settings-hide-amounts-option-hidden').click({ force: true });
          await page.getByTestId('settings-hide-amounts-option-visible').click({ force: true });
        }
        const timestamps = await stopFrameRecording(page);
        assertAdr017Thresholds(computeFrameStats(timestamps), 'Segmented');
      } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
    });
  });

  test.describe('Changement de thème (Réglages) — amendement ADR-017 du 2026-09-25', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    /**
     * Hors seuil ≥ 55 fps (amendement ADR-017) : exigence propre — appliqué
     * sans rechargement de page, en moins de 200 ms entre le clic et
     * l'application effective (attribut `data-theme` posé **et** couleurs
     * calculées, `getComputedStyle`, reflétant le nouveau thème). Pas de CPU
     * ralenti ici : l'amendement porte sur un budget de temps absolu, pas sur
     * une cadence d'images.
     */
    test('appliqué sans rechargement en moins de 200 ms', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('screen-settings')).toBeVisible();

      // Repère de navigation : un vrai rechargement de page réinitialiserait
      // cette variable globale (contrairement à un changement de `data-theme`
      // en place).
      await page.evaluate(() => {
        (window as unknown as { __noReloadMarker: boolean }).__noReloadMarker = true;
      });

      await page.getByTestId('settings-theme-option-light').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      // Repart d'un thème connu (sombre) pour mesurer la bascule qui suit.
      await page.getByTestId('settings-theme-option-dark').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      // `--background` (et non `background-color` de `<html>`, transparent
      // par défaut) : variable CSS effectivement recalculée par
      // `theme.generated.css` (`[data-theme='dark'|'light']`, voir
      // `applyThemeToDocument`).
      const backgroundBefore = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
      );

      // Radix `Tabs` déclenche la sélection sur `mousedown` (pas `click`,
      // voir `@radix-ui/react-tabs`) : on chronomètre donc depuis un
      // `mousedown` posé en phase de capture (avant le gestionnaire React),
      // jusqu'au `MutationObserver` qui détecte `data-theme` posé. Le clic
      // réel vient ensuite de Playwright (`locator.click()`, séquence
      // souris complète), pas d'un `HTMLElement.click()` synthétique qui ne
      // déclenche pas `mousedown`.
      await page.evaluate(() => {
        const win = window as unknown as {
          __themeMousedownTs: number | null;
          __themeDeltaMs: number | null;
        };
        win.__themeMousedownTs = null;
        win.__themeDeltaMs = null;
        const button = document.querySelector('[data-testid="settings-theme-option-light"]');
        if (!button) throw new Error('bouton de thème introuvable');
        button.addEventListener(
          'mousedown',
          () => {
            win.__themeMousedownTs = performance.now();
          },
          { capture: true, once: true },
        );
        const observer = new MutationObserver(() => {
          if (win.__themeMousedownTs != null && win.__themeDeltaMs == null) {
            win.__themeDeltaMs = performance.now() - win.__themeMousedownTs;
            observer.disconnect();
          }
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
      });

      await page.getByTestId('settings-theme-option-light').click();
      await page.waitForFunction(
        () => (window as unknown as { __themeDeltaMs: number | null }).__themeDeltaMs != null,
        { timeout: 1000 },
      );
      const durationMs = await page.evaluate(
        () => (window as unknown as { __themeDeltaMs: number }).__themeDeltaMs,
      );

      const backgroundAfter = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
      );
      const noReload = await page.evaluate(
        () => (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker === true,
      );

      test.info().annotations.push({
        type: 'thème (ADR-017, amendement) — délai clic → data-theme appliqué',
        description: `${durationMs.toFixed(1)} ms`,
      });

      expect(noReload, 'le repère a disparu : la page a rechargé').toBe(true);
      expect(
        backgroundAfter,
        'la couleur calculée du document ne reflète pas le nouveau thème',
      ).not.toBe(backgroundBefore);
      expect(
        durationMs,
        `changement de thème appliqué en ${durationMs.toFixed(1)} ms (exigence < 200 ms)`,
      ).toBeLessThan(200);
    });
  });

  test.describe('Sheet (détail du jour, Calendrier)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('10 ouvertures/fermetures répétées sous CPU ×4', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(
        '/calendar?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom',
      );
      await expect(page.getByTestId('screen-calendar')).toBeVisible();

      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await startFrameRecording(page);
        for (let i = 0; i < 10; i++) {
          await page.getByTestId('calendar-day-2026-09-14').click();
          await expect(page.getByTestId('calendar-day-sheet')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.getByTestId('calendar-day-sheet')).toHaveCount(0, { timeout: 10_000 });
        }
        const timestamps = await stopFrameRecording(page);
        assertAdr017Thresholds(computeFrameStats(timestamps), 'Sheet');
      } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
    });
  });

  test.describe('Calendrier — changement de mois', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('10 allers-retours mois suivant/précédent sous CPU ×4', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(
        '/calendar?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom',
      );
      await expect(page.getByTestId('screen-calendar')).toBeVisible();

      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await startFrameRecording(page);
        for (let i = 0; i < 10; i++) {
          await page.getByTestId('calendar-next-month').click({ force: true });
          await page.getByTestId('calendar-prev-month').click({ force: true });
        }
        const timestamps = await stopFrameRecording(page);
        assertAdr017Thresholds(computeFrameStats(timestamps), 'Calendrier — mois');
      } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
    });
  });
});
