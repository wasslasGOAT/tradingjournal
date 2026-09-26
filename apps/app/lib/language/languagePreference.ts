import { resolveLocale, supportedLocales } from '@repo/i18n';
import type { SupportedLocale } from '@repo/i18n';

/** Préférence de langue (M1-9) : `system` suit la locale de l'appareil, sinon langue forcée. */
export type LanguagePreference = 'system' | SupportedLocale;

/** Clé de stockage de la préférence de langue (`apps/app/lib/storage/preferencesStorage`). */
export const LANGUAGE_PREFERENCE_STORAGE_KEY = 'edgebook.preferences.language';

/** Lit une préférence de langue stockée ; `system` par défaut ou si la valeur est invalide. */
export function parseLanguagePreference(raw: string | null): LanguagePreference {
  if (raw !== null && (supportedLocales as readonly string[]).includes(raw)) {
    return raw as SupportedLocale;
  }
  return 'system';
}

/**
 * Résout la locale effective à appliquer à i18next : la langue forcée, ou la
 * locale système ramenée à une locale supportée (`resolveLocale`, `@repo/i18n`)
 * quand la préférence est `system`.
 */
export function resolveLanguagePreference(
  preference: LanguagePreference,
  deviceLocale: string | null,
): SupportedLocale {
  if (preference === 'system') return resolveLocale(deviceLocale);
  return preference;
}
