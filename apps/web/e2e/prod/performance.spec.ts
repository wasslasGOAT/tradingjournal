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
 * bascule du `Segmented` (Réglages). N'exige pas Supabase (ADR-020) : données
 * factices.
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
  test.info().annotations.push({ type: `fluidité (ADR-017) — ${label}`, description: formatStats(stats) });
  expect(stats.frameCount, `${label} — aucune image enregistrée (interaction cassée ?)`).toBeGreaterThan(
    0,
  );
  expect(stats.avgFps, `${label} — fps moyen < 55 : ${formatStats(stats)}`).toBeGreaterThanOrEqual(55);
  expect(stats.maxFrameMs, `${label} — image la plus longue > 50 ms : ${formatStats(stats)}`).toBeLessThanOrEqual(
    50,
  );
}

test.describe('Fluidité — build de production, CPU ralenti ×4 (ADR-017, bloquant)', () => {
  test.describe('Segmented (Réglages, thème)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('10 bascules répétées sous CPU ×4', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('screen-settings')).toBeVisible();

      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await startFrameRecording(page);
        for (let i = 0; i < 5; i++) {
          await page.getByTestId('settings-theme-option-light').click({ force: true });
          await page.getByTestId('settings-theme-option-dark').click({ force: true });
        }
        const timestamps = await stopFrameRecording(page);
        assertAdr017Thresholds(computeFrameStats(timestamps), 'Segmented');
      } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
    });
  });

  test.describe('Sheet (détail du jour, Calendrier)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('10 ouvertures/fermetures répétées sous CPU ×4', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/calendar?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
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
      await page.goto('/calendar?account=acc-demo-main&from=2026-09-01&to=2026-09-14&shortcut=custom');
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
