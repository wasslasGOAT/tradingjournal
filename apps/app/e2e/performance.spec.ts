import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Fluidité (ADR-017, ROADMAP M1 « critères de fin » — protocole web : CPU ralenti
 * ×4 via CDP, mêmes interactions que le protocole Android/HWUI : 10
 * ouvertures/fermetures de `Sheet` et 10 bascules de `Segmented`). N'exige pas
 * Supabase (ADR-020).
 *
 * Build de production, pas le serveur de dev — correctif M1 (2026-09-24) : mesuré
 * contre le bundle web *dev* (non minifié, React en mode développement, hot reload
 * actif, sourcemaps), ce test donnait un fps moyen de 16,2 (`Segmented`) et 2,8
 * (`Sheet`), avec des images jusqu'à 3,5 s — un artefact du bundle de dev, pas une
 * régression réelle. Ce fichier tourne donc seul contre un export de production
 * (`expo export --platform web`, servi statiquement) via le projet Playwright dédié
 * `chromium-perf-prod` (`playwright.config.ts`, port 4173) : tous les autres specs
 * restent sur le serveur de dev (port 8081), sans compétition avec l'export ni la
 * mesure sous CPU ralenti.
 *
 * `EXPO_PUBLIC_ENABLE_CATALOG` n'est *pas* défini pour un export de production
 * (`.env.development` uniquement, `metro.config.js`) : le catalogue de composants
 * (`app/(dev)/catalog.tsx`, seul point d'entrée de `Sheet` jusqu'ici) est absent du
 * bundle produit ici. `Sheet` est donc mesurée depuis son premier usage réel :
 * le sélecteur de compte du header (`AccountSelector` → `Select`, `packages/ui`),
 * sur l'écran Réglages — un viewport < 768 px (`WEB_MENU_BREAKPOINT`, `Select.tsx`)
 * fait basculer ce composant en `Sheet` plutôt qu'en popover ancré (web large).
 * `Segmented` est mesurée sur ce même écran Réglages (déjà l'écran cible avant ce
 * correctif), en viewport desktop.
 *
 * Mesure qui fait foi côté mobile (ADR-017) : cette mesure web reste un indicateur
 * complémentaire, pas la mesure de référence. La mesure qui fait foi sur mobile est
 * native — barres du profileur de rendu HWUI sur l'APK **preview** (build release,
 * pas le build dev), voir ROADMAP M1 (« Android : … 10 ouvertures/fermetures de
 * `Sheet` et 10 bascules de `Segmented` : barres sous la ligne verte ») — pas encore
 * exécutée à la date de ce correctif (build EAS preview Android restant à faire,
 * ROADMAP M1 « Build EAS Android dev puis preview »).
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

/**
 * Seuils ADR-017 appliqués aux deux tests ci-dessous : moyenne ≥ 55 fps, aucune
 * image > 50 ms. Test « informatif » (pas d'échec silencieux ni de seuil abaissé) si
 * un seuil reste inatteignable pour une raison de fond sur cette plateforme (ex.
 * `Modal` de react-native-web pour `Sheet`) : voir le commentaire dans chaque test.
 */
function assertMeetsAdr017Thresholds(stats: FrameStats, label: string): void {
  expect(
    stats.avgFps,
    `${label} — fps moyen insuffisant — ${formatStats(stats)}`,
  ).toBeGreaterThanOrEqual(55);
  expect(
    stats.maxFrameMs,
    `${label} — au moins une image > 50 ms — ${formatStats(stats)}`,
  ).toBeLessThanOrEqual(50);
}

test.describe('Fluidité — build de production, CPU ralenti ×4 (ADR-017)', () => {
  test.describe('Segmented (Réglages)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('10 bascules répétées sous CPU ×4', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('screen-settings')).toBeVisible();

      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await startFrameRecording(page);
        // ROADMAP M1 : « 10 bascules de Segmented », aller-retour sur 2 options.
        for (let i = 0; i < 5; i++) {
          await page.getByTestId('settings-pnl-colors-option-greenRed').click({ force: true });
          await page.getByTestId('settings-pnl-colors-option-blueGray').click({ force: true });
        }
        const timestamps = await stopFrameRecording(page);
        const stats = computeFrameStats(timestamps);
        assertMeetsAdr017Thresholds(stats, 'Segmented');
      } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
    });
  });

  test.describe('Sheet (sélecteur de compte, header)', () => {
    // < `WEB_MENU_BREAKPOINT` (768 px, `packages/ui/src/components/Select/Select.tsx`) :
    // fait basculer `AccountSelector` en `Sheet` plutôt qu'en popover ancré (web large) —
    // voir l'en-tête de ce fichier.
    test.use({ viewport: { width: 390, height: 844 } });

    test('10 ouvertures/fermetures répétées sous CPU ×4', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/settings');
      await expect(page.getByTestId('screen-settings')).toBeVisible();

      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await startFrameRecording(page);
        // ROADMAP M1 : « 10 ouvertures/fermetures de Sheet ».
        for (let i = 0; i < 10; i++) {
          await page.getByTestId('header-account-trigger').click({ force: true });
          await page.getByTestId('header-account-sheet-close').click({ force: true });
        }
        const timestamps = await stopFrameRecording(page);
        const stats = computeFrameStats(timestamps);
        assertMeetsAdr017Thresholds(stats, 'Sheet');
      } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      }
    });
  });
});
