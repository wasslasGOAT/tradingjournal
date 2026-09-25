import { Eye, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"

import { IconButton } from "@/components/ui/icon-button"
import { useVisibilityStore } from "@/features/preferences/visibility-store"

/**
 * Bascule de masquage global des montants (icône œil — W-5, ARCHITECTURE
 * §6.2 : « Masquage des montants (icône œil) global, persistant »). Branchée
 * sur `useVisibilityStore` : tout écran affichant des montants (StatTile,
 * DayCell…) lit le même état.
 */
export function HideAmountsToggle() {
  const { t } = useTranslation()
  const hideAmounts = useVisibilityStore((state) => state.hideAmounts)
  const toggleHideAmounts = useVisibilityStore((state) => state.toggleHideAmounts)

  return (
    <IconButton
      testId="header-hide-amounts"
      icon={hideAmounts ? EyeOff : Eye}
      variant={hideAmounts ? "outline" : "ghost"}
      aria-label={hideAmounts ? t("header.hideAmounts.show") : t("header.hideAmounts.hide")}
      onClick={toggleHideAmounts}
    />
  )
}
