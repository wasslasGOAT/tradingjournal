import { createFileRoute } from "@tanstack/react-router"

import { CalendarScreen } from "@/features/calendar/CalendarScreen"

export const Route = createFileRoute("/_shell/calendar")({
  component: CalendarScreen,
})
