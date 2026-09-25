import { createFileRoute } from "@tanstack/react-router"
import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ScreenPlaceholder } from "@/features/shell/ScreenPlaceholder"

export const Route = createFileRoute("/_shell/rules")({
  component: RulesPage,
})

/** Règles (W-5) : placeholder `EmptyState` — règles/checklists réelles en M8. */
function RulesPage() {
  const { t } = useTranslation()

  return (
    <ScreenPlaceholder
      testId="screen-rules"
      icon={ShieldCheck}
      title={t("nav.rules")}
      description={t("comingSoon.description")}
    />
  )
}
