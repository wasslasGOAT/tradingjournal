import { toTradingDay } from "@repo/core"
import { describe, expect, it } from "vitest"

import { getDashboardSummary } from "@/data/dashboard"

import { toEquitySeriesPoints } from "./equitySeries"

describe("toEquitySeriesPoints", () => {
  it("produit un point par jour de la période — jamais moins (régression « courbe invisible »)", async () => {
    const summary = await getDashboardSummary({
      accountId: "all",
      from: toTradingDay("2026-09-01"),
      to: toTradingDay("2026-09-25"),
    })

    const points = toEquitySeriesPoints(summary.equityPoints)

    expect(points).toHaveLength(summary.equityPoints.length)
    expect(points.length).toBeGreaterThan(1)
    // Index x strictement croissant, une valeur y finie par point (aucun trou, aucun NaN) —
    // sinon `recharts` ne trace qu'un point isolé au lieu de la courbe complète.
    points.forEach((point, index) => {
      expect(point.x).toBe(index)
      expect(Number.isFinite(point.y)).toBe(true)
    })
  })
})
