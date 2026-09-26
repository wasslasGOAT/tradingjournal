import { defaultPnlColorScheme } from '../tokens';
import type { PnlColorScheme } from '../tokens';
import type { ThemePreference } from './themeMode';

/**
 * Interface minimale de stockage requise pour persister les préférences
 * (M1-9). Volontairement réduite à `getItem`/`setItem` (pas de dépendance à
 * un stockage concret côté `packages/ui`, ARCHITECTURE §6/§10) : l'app
 * l'injecte depuis `apps/app/lib/storage` (AsyncStorage natif /
 * `localStorage` web), qui expose déjà cette forme (`AsyncKeyValueStorage`).
 */
export interface PreferencesStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Clés de stockage des préférences persistées (M1-9). */
export const PREFERENCES_STORAGE_KEYS = {
  themePreference: 'edgebook.preferences.themePreference',
  pnlColorScheme: 'edgebook.preferences.pnlColorScheme',
  hideAmounts: 'edgebook.preferences.hideAmounts',
} as const;

/** Lit une préférence de thème stockée ; `system` par défaut ou si la valeur est invalide. */
export function parseThemePreference(raw: string | null): ThemePreference {
  if (raw === 'system' || raw === 'dark' || raw === 'light') return raw;
  return 'system';
}

/** Lit un schéma de couleurs P&L stocké ; valeur par défaut (`defaultPnlColorScheme`) si absent ou invalide. */
export function parsePnlColorScheme(raw: string | null): PnlColorScheme {
  if (raw === 'blueGray' || raw === 'greenRed') return raw;
  return defaultPnlColorScheme;
}

/** Lit le masquage des montants stocké ; `false` par défaut ou si la valeur est invalide. */
export function parseHideAmounts(raw: string | null): boolean {
  return raw === 'true';
}

export interface PersistedPreferences {
  readonly preference: ThemePreference;
  readonly pnlColorScheme: PnlColorScheme;
  readonly hideAmounts: boolean;
}

/**
 * Charge les trois préférences persistées en une fois (M1-9), à appeler une
 * seule fois au démarrage avant le premier rendu (comme le chargement des
 * polices, `apps/app/app/_layout.tsx`) — évite tout clignotement entre la
 * valeur par défaut et la valeur restaurée.
 */
export async function loadPersistedPreferences(
  storage: PreferencesStorage,
): Promise<PersistedPreferences> {
  const [preferenceRaw, pnlColorSchemeRaw, hideAmountsRaw] = await Promise.all([
    storage.getItem(PREFERENCES_STORAGE_KEYS.themePreference),
    storage.getItem(PREFERENCES_STORAGE_KEYS.pnlColorScheme),
    storage.getItem(PREFERENCES_STORAGE_KEYS.hideAmounts),
  ]);

  return {
    preference: parseThemePreference(preferenceRaw),
    pnlColorScheme: parsePnlColorScheme(pnlColorSchemeRaw),
    hideAmounts: parseHideAmounts(hideAmountsRaw),
  };
}

export function persistThemePreference(
  storage: PreferencesStorage,
  preference: ThemePreference,
): Promise<void> {
  return storage.setItem(PREFERENCES_STORAGE_KEYS.themePreference, preference);
}

export function persistPnlColorScheme(
  storage: PreferencesStorage,
  pnlColorScheme: PnlColorScheme,
): Promise<void> {
  return storage.setItem(PREFERENCES_STORAGE_KEYS.pnlColorScheme, pnlColorScheme);
}

export function persistHideAmounts(
  storage: PreferencesStorage,
  hideAmounts: boolean,
): Promise<void> {
  return storage.setItem(PREFERENCES_STORAGE_KEYS.hideAmounts, hideAmounts ? 'true' : 'false');
}
