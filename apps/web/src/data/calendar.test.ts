import { toTradingDay } from "@repo/core"
import { describe, expect, it } from "vitest"

import { getCalendarMonthSummary } from "./calendar"

const SEPTEMBER = { year: 2026, month: 9, weekStartsOn: 1 as const }

describe("getCalendarMonthSummary — filtre compte", () => {
  it("un compte précis n'affiche que ses propres jours", async () => {
    const main = await getCalendarMonthSummary({ accountId: "acc-demo-main", ...SEPTEMBER })
    const day = main.dayByTradingDay.get(toTradingDay("2026-09-01"))
    expect(day?.pnl?.toFixed(2)).toBe("312.40")
    // Le compte prop n'a pas de trade le 2026-09-01 avec la même valeur (le mock diffère) : 'all' >= compte seul.
    const all = await getCalendarMonthSummary({ accountId: "all", ...SEPTEMBER })
    const dayAll = all.dayByTradingDay.get(toTradingDay("2026-09-01"))
    expect(dayAll?.pnl?.greaterThan(day?.pnl ?? 0)).toBe(true)
  })

  it("compte inconnu : rejette", async () => {
    await expect(getCalendarMonthSummary({ accountId: "acc-inconnu", ...SEPTEMBER })).rejects.toThrow(
      /Compte inconnu/,
    )
  })
})

describe("getCalendarMonthSummary — filtre mois", () => {
  it("changer de mois change les jours renvoyés (jamais de données périmées)", async () => {
    const september = await getCalendarMonthSummary({ accountId: "acc-demo-main", ...SEPTEMBER })
    const august = await getCalendarMonthSummary({
      accountId: "acc-demo-main",
      year: 2026,
      month: 8,
      weekStartsOn: 1,
    })

    expect(september.dayByTradingDay.has(toTradingDay("2026-09-01"))).toBe(true)
    expect(august.dayByTradingDay.has(toTradingDay("2026-09-01"))).toBe(false)
    expect(august.dayByTradingDay.has(toTradingDay("2026-08-03"))).toBe(true)
  })

  it("un jour journal-only (sans trade) reste présent avec pnl null", async () => {
    const september = await getCalendarMonthSummary({ accountId: "acc-demo-main", ...SEPTEMBER })
    const journalOnlyDay = september.dayByTradingDay.get(toTradingDay("2026-09-03"))
    expect(journalOnlyDay?.pnl).toBeNull()
    expect(journalOnlyDay?.hasJournalEntry).toBe(true)
  })
})

describe("getCalendarMonthSummary — cohérence avec @repo/core", () => {
  it("les stats du mois affichées égalent computeMonthStats sur les mêmes jours", async () => {
    const summary = await getCalendarMonthSummary({ accountId: "acc-demo-main", ...SEPTEMBER })

    expect(summary.monthStats.netPnl.toFixed(2)).toBe("1167.00")
    expect(summary.monthStats.winningDays).toBe(7)
    expect(summary.monthStats.losingDays).toBe(4)
    expect(summary.monthStats.tradesCount).toBe(13)
  })

  it("la grille (`buildCalendarGrid`) couvre bien tous les jours du mois", async () => {
    const summary = await getCalendarMonthSummary({ accountId: "acc-demo-main", ...SEPTEMBER })
    const inMonthCount = summary.weeks.flat().filter((cell) => cell.inCurrentMonth).length
    expect(inMonthCount).toBe(30)
  })
})
