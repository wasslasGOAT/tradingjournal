import { createFileRoute } from "@tanstack/react-router"
import { BarChart3 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ScreenPlaceholder } from "@/features/shell/ScreenPlaceholder"

export const Route = createFileRoute("/_shell/analytics")({
  component: AnalyticsPage,
})

/** Analytics (W-5) : placeholder `EmptyState` — rapports réels en M7. */
function AnalyticsPage() {
  const { t } = useTranslation()

  return (
    <ScreenPlaceholder
      testId="screen-analytics"
      icon={BarChart3}
      title={t("nav.analytics")}
      description={t("comingSoon.description")}
    />
  )
}
