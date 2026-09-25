import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Segmented } from "@/components/ui/segmented"
import type { SegmentedOption } from "@/components/ui/segmented"
import type { LanguagePreference } from "@/features/preferences/language"
import { useLanguagePreferenceStore } from "@/features/preferences/language-store"
import type { PnlColorScheme } from "@/lib/theme/tokens"
import { useThemeStore } from "@/features/preferences/theme-store"
import type { ThemePreference } from "@/features/preferences/theme"
import { useVisibilityStore } from "@/features/preferences/visibility-store"

/**
 * Écran Réglages (W-5, ARCHITECTURE §6.2) : thème, couleurs P&L, masquage
 * des montants et langue — chaque bascule modifie directement le store
 * global correspondant (déjà branché partout ailleurs dans l'app : header,
 * futur calendrier/dashboard…) et persisté entre deux sessions
 * (`localStorage`, pas de bouton « enregistrer »). Copie web de
 * `apps/app/features/settings/SettingsScreen.tsx` (gelé, ADR-023).
 */
export function SettingsScreen() {
  const { t } = useTranslation()

  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)
  const pnlColorScheme = useThemeStore((state) => state.pnlColorScheme)
  const setPnlColorScheme = useThemeStore((state) => state.setPnlColorScheme)
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts)
  const setHideAmounts = useVisibilityStore((state) => state.setHideAmounts)
  const languagePreference = useLanguagePreferenceStore((state) => state.preference)
  const setLanguagePreference = useLanguagePreferenceStore((state) => state.setPreference)

  const themeOptions: readonly SegmentedOption<ThemePreference>[] = [
    { value: "system", label: t("settings.theme.system") },
    { value: "dark", label: t("settings.theme.dark") },
    { value: "light", label: t("settings.theme.light") },
  ]

  const pnlColorOptions: readonly SegmentedOption<PnlColorScheme>[] = [
    { value: "blueGray", label: t("settings.pnlColors.blueGray") },
    { value: "greenRed", label: t("settings.pnlColors.greenRed") },
  ]

  const hideAmountsOptions: readonly SegmentedOption<"visible" | "hidden">[] = [
    { value: "visible", label: t("settings.hideAmounts.visible") },
    { value: "hidden", label: t("settings.hideAmounts.hidden") },
  ]

  const languageOptions: readonly SegmentedOption<LanguagePreference>[] = [
    { value: "system", label: t("settings.language.system") },
    { value: "fr", label: t("settings.language.fr") },
    { value: "en", label: t("settings.language.en") },
  ]

  return (
    <div data-testid="screen-settings" className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <h1 data-testid="settings-title" className="text-lg font-semibold text-foreground">
        {t("settings.title")}
      </h1>

      <Card data-testid="settings-card-appearance" className="p-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">{t("settings.sections.appearance")}</h2>

          <SettingsRow label={t("settings.theme.label")}>
            <Segmented
              testId="settings-theme"
              options={themeOptions}
              value={themePreference}
              onChange={setThemePreference}
              aria-label={t("settings.theme.label")}
            />
          </SettingsRow>

          <SettingsRow label={t("settings.pnlColors.label")}>
            <Segmented
              testId="settings-pnl-colors"
              options={pnlColorOptions}
              value={pnlColorScheme}
              onChange={setPnlColorScheme}
              aria-label={t("settings.pnlColors.label")}
            />
          </SettingsRow>

          <SettingsRow label={t("settings.hideAmounts.label")}>
            <Segmented
              testId="settings-hide-amounts"
              options={hideAmountsOptions}
              value={hideAmounts ? "hidden" : "visible"}
              onChange={(value) => setHideAmounts(value === "hidden")}
              aria-label={t("settings.hideAmounts.label")}
            />
          </SettingsRow>
        </div>
      </Card>

      <Card data-testid="settings-card-language" className="p-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">{t("settings.sections.language")}</h2>

          <SettingsRow label={t("settings.language.label")}>
            <Segmented
              testId="settings-language"
              options={languageOptions}
              value={languagePreference}
              onChange={setLanguagePreference}
              aria-label={t("settings.language.label")}
            />
          </SettingsRow>
        </div>
      </Card>
    </div>
  )
}

interface SettingsRowProps {
  readonly label: string
  readonly children: ReactNode
}

/** Ligne réglage : libellé au-dessus du contrôle — pleine largeur, lisible aux grandes tailles de police. */
function SettingsRow({ label, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
