import { describe, expect, it } from "vitest"

import { NARROW_CALENDAR_BREAKPOINT, dayNumberFromTradingDay, isNarrowCalendarLayout } from "./calendarLayout"

describe("isNarrowCalendarLayout", () => {
  it("étroit sous le seuil (ex. iPhone SE 320 px, iPhone standard 390 px)", () => {
    expect(isNarrowCalendarLayout(320)).toBe(true)
    expect(isNarrowCalendarLayout(375)).toBe(true)
    expect(isNarrowCalendarLayout(390)).toBe(true)
  })

  it("large à partir du seuil (limite incluse)", () => {
    expect(isNarrowCalendarLayout(NARROW_CALENDAR_BREAKPOINT)).toBe(false)
    expect(isNarrowCalendarLayout(430)).toBe(false)
  })
})

describe("dayNumberFromTradingDay", () => {
  it("retire le zéro non significatif (même sortie que formatDayNumber, @repo/core)", () => {
    expect(dayNumberFromTradingDay("2026-08-05")).toBe("5")
    expect(dayNumberFromTradingDay("2026-08-31")).toBe("31")
    expect(dayNumberFromTradingDay("2026-01-01")).toBe("1")
    expect(dayNumberFromTradingDay("2026-12-10")).toBe("10")
  })
})
