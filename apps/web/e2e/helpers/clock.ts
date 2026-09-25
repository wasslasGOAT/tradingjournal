import type { Page } from '@playwright/test';

/**
 * Horloge figée (règle qa-tests : « données seed, horloge figée
 * (16/09/2026) »). Gèle `Date.now()`/`new Date()` côté page **avant**
 * toute navigation, pour que `resolveApproximateToday()`
 * (`features/shell/filters.ts`) et le raccourci de période « mois en cours »
 * (`components/ui/date-range-shortcuts.ts`) restent déterministes d'un run
 * à l'autre, indépendamment de la date réelle de la machine.
 */
export async function freezeClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date('2026-09-16T12:00:00Z'));
}
