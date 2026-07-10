/**
 * Tests for `formatRelativeTime` (Story 5.4) — the localized, Western-numeral
 * "last synced X ago" formatter behind the offline watchlist banner.
 *
 * `now` is injected so bucketing is deterministic. The Arabic locale MUST render
 * Latin (Western) numerals per Tunisian convention — never Arabic-Indic digits.
 */
import { describe, expect, it } from "vitest"

import { formatRelativeTime } from "./dates"

const NOW = new Date("2026-07-10T12:00:00.000Z")

/** Matches any Arabic-Indic digit (٠–٩) — none may appear in output. */
const ARABIC_INDIC_DIGITS = /[٠-٩]/

describe("formatRelativeTime", () => {
  it("buckets minutes for a ~5-minute-old timestamp", () => {
    const iso = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString()
    const out = formatRelativeTime(iso, "fr", NOW)
    expect(out).toContain("5")
    expect(out.toLowerCase()).toContain("minute")
  })

  it("buckets hours for a ~3-hour-old timestamp", () => {
    const iso = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString()
    const out = formatRelativeTime(iso, "en", NOW)
    expect(out).toContain("3")
    expect(out.toLowerCase()).toContain("hour")
  })

  it("buckets days for a ~2-day-old timestamp", () => {
    const iso = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const out = formatRelativeTime(iso, "en", NOW)
    expect(out).toContain("2")
    expect(out.toLowerCase()).toContain("day")
  })

  it("renders Arabic wording with Latin numerals (no Arabic-Indic digits)", () => {
    const iso = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString()
    const out = formatRelativeTime(iso, "ar", NOW)
    // Western (Latin) numerals per Tunisian convention.
    expect(out).toContain("5")
    expect(ARABIC_INDIC_DIGITS.test(out)).toBe(false)
    // Arabic language is preserved (Arabic script present) — NOT swapped to
    // French words, so the output differs from the French rendering.
    expect(/[؀-ۿ]/.test(out)).toBe(true)
    expect(out).not.toBe(formatRelativeTime(iso, "fr", NOW))
  })

  it("clamps a future timestamp to the present (never 'in the future')", () => {
    const iso = new Date(NOW.getTime() + 10 * 60 * 1000).toISOString()
    const out = formatRelativeTime(iso, "en", NOW)
    // numeric:"auto" renders the clamped zero bucket as "now"; never "in 10
    // minutes".
    expect(out.toLowerCase()).not.toContain("in ")
  })

  it("returns an empty string for a null / undefined iso", () => {
    expect(formatRelativeTime(null, "fr", NOW)).toBe("")
    expect(formatRelativeTime(undefined, "fr", NOW)).toBe("")
  })

  it("returns an empty string for an unparseable iso", () => {
    expect(formatRelativeTime("not-a-date", "fr", NOW)).toBe("")
  })
})
