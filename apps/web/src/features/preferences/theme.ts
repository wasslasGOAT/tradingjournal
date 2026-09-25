import type { PnlColorScheme, ThemeMode } from '@/lib/theme/tokens';
import { defaultPnlColorScheme } from '@/lib/theme/tokens';

/**
 * Logique pure de résolution/application du thème (W-3) — testable sans DOM
 * réel pour `resolveThemeMode`. Réimplémentation locale de
 * `packages/ui/src/theme/themeMode.ts` (gelé, ADR-023) : même règle (tout ce
 * qui n'est pas explicitement `'light'` retombe sur `'dark'` par défaut,
 * ADR-012 — jamais de flash clair non désiré).
 */
export type ThemePreference = 'system' | ThemeMode;

export const THEME_PREFERENCE_CYCLE: ThemePreference[] = ['system', 'dark', 'light'];

export function resolveThemeMode(
  preference: ThemePreference,
  systemPrefersLight: boolean,
): ThemeMode {
  if (preference !== 'system') return preference;
  return systemPrefersLight ? 'light' : 'dark';
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCE_CYCLE.indexOf(current);
  const nextIndex = (index + 1) % THEME_PREFERENCE_CYCLE.length;
  return THEME_PREFERENCE_CYCLE[nextIndex] ?? 'system';
}

/**
 * Pose l'attribut `data-theme` sur `<html>`, lu par `theme.generated.css`
 * (sélecteurs `[data-theme='dark' | 'light']`) — bascule instantanée, sans
 * rechargement, sans classe `dark:` (ADR-024). Appelé côté client uniquement.
 */
export function applyThemeToDocument(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
}

export function parseThemePreference(raw: string | null): ThemePreference {
  if (raw === 'system' || raw === 'dark' || raw === 'light') return raw;
  return 'system';
}

/**
 * Pose l'attribut `data-pnl` sur `<html>`, lu par `theme.generated.css`
 * (sélecteurs `[data-pnl='greenRed']`, W-4) — bascule instantanée du schéma
 * P&L (bleu/gris par défaut, vert/rouge en option), même mécanisme que
 * `applyThemeToDocument`. Le schéma par défaut (`blueGray`) n'a pas de
 * sélecteur dédié (voir `generate-theme-css.ts`) : on retire l'attribut
 * plutôt que de le poser à `'blueGray'`.
 */
export function applyPnlSchemeToDocument(scheme: PnlColorScheme): void {
  if (scheme === defaultPnlColorScheme) {
    delete document.documentElement.dataset.pnl;
    return;
  }
  document.documentElement.dataset.pnl = scheme;
}

export function parsePnlColorScheme(raw: string | null): PnlColorScheme {
  if (raw === 'blueGray' || raw === 'greenRed') return raw;
  return defaultPnlColorScheme;
}
