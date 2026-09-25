import { createFileRoute } from "@tanstack/react-router"

import { SettingsScreen } from "@/features/settings/SettingsScreen"

export const Route = createFileRoute("/_shell/settings")({
  component: SettingsScreen,
})
