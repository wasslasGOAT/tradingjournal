import { parseAmount } from "@repo/core"
import { describe, expect, it } from "vitest"

import { resolveCalendarDayStateKey } from "./resolveCalendarDayStateKey"

describe("resolveCalendarDayStateKey", () => {
  it("aujourd'hui prime sur le contenu", () => {
    expect(resolveCalendarDayStateKey(parseAmount("120.00"), true, true)).toBe("today")
    expect(resolveCalendarDayStateKey(null, false, true)).toBe("today")
  })

  it("trade positif -> profit, négatif -> loss, nul -> flat", () => {
    expect(resolveCalendarDayStateKey(parseAmount("120.00"), false, false)).toBe("profit")
    expect(resolveCalendarDayStateKey(parseAmount("-45.50"), false, false)).toBe("loss")
    expect(resolveCalendarDayStateKey(parseAmount("0"), false, false)).toBe("flat")
  })

  it("sans trade : journal seul ou vide", () => {
    expect(resolveCalendarDayStateKey(null, true, false)).toBe("journalOnly")
    expect(resolveCalendarDayStateKey(null, false, false)).toBe("empty")
  })
})
