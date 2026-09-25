import { useEffect } from "react"

import { i18n } from "@/lib/i18n"

import { resolveLanguagePreference } from "./language"
import { useLanguagePreferenceStore } from "./language-store"

/**
 * Applique la préférence de langue courante à i18next à chaque changement
 * (W-5) : bascule instantanée, sans rechargement — met aussi à jour
 * `document.documentElement.lang` (accessibilité/SEO). La persistance dans
 * `localStorage` est déjà faite par `useLanguagePreferenceStore.setPreference`.
 * Monté une seule fois (`AppShell`).
 */
export function useLanguagePreferenceSync(): void {
  const preference = useLanguagePreferenceStore((state) => state.preference)

  useEffect(() => {
    const deviceLocale = navigator.languages?.[0] ?? navigator.language
    const resolved = resolveLanguagePreference(preference, deviceLocale)
    if (i18n.language !== resolved) void i18n.changeLanguage(resolved)
    document.documentElement.lang = resolved
  }, [preference])
}
