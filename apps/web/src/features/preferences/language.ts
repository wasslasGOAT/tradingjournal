import { resolveLocale, supportedLocales } from "@repo/i18n"
import type { SupportedLocale } from "@repo/i18n"

/**
 * Préférence de langue (W-5, ARCHITECTURE §6.2) : `system` suit la locale du
 * navigateur, sinon langue forcée — copie web de
 * `apps/app/lib/language/languagePreference.ts` (gelé, ADR-023).
 */
export type LanguagePreference = "system" | SupportedLocale

/** Clé de stockage web (préfixée, distincte du natif — ADR-023, stockages séparés). */
export const LANGUAGE_PREFERENCE_STORAGE_KEY = "edgebook.web.preferences.language"

/** Lit une préférence de langue stockée ; `system` par défaut ou si la valeur est invalide. */
export function parseLanguagePreference(raw: string | null): LanguagePreference {
  if (raw !== null && (supportedLocales as readonly string[]).includes(raw)) {
    return raw as SupportedLocale
  }
  return "system"
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
  if (preference === "system") return resolveLocale(deviceLocale)
  return preference
}
