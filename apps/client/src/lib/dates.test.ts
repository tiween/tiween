/**
 * Tests for `formatRelativeTime` (Story 5.4) — the localized, Western-numeral
 * "last synced X ago" formatter behind the offline watchlist banner.
 *
 * `now` is injected so bucketing is deterministic. The Arabic locale MUST render
 * Latin (Western) numerals per Tunisian convention — never Arabic-Indic digits.
 */
import { describe, expect, it } from "vitest"

import { formatRelativeTime, formatVenueDate, toTunisIsoInstant } from "./dates"

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

describe("toTunisIsoInstant", () => {
  // Venue schedules are Tunisian local time. Tunisia is a fixed UTC+1 with no
  // DST, so the expected instants are exact — and independent of the machine
  // the suite runs on, which is the whole point of the helper.
  it("reads the wall clock in Africa/Tunis regardless of the host timezone", () => {
    expect(toTunisIsoInstant("2026-09-01", "00:00")).toBe(
      "2026-08-31T23:00:00.000Z"
    )
    expect(toTunisIsoInstant("2026-09-01", "20:00")).toBe(
      "2026-09-01T19:00:00.000Z"
    )
    // Midwinter — still UTC+1, no DST shift.
    expect(toTunisIsoInstant("2026-01-15", "12:30")).toBe(
      "2026-01-15T11:30:00.000Z"
    )
  })
})

describe("formatVenueDate", () => {
  // The READ side of the same contract: a run date written as 00:00 Tunis is
  // stored as the PREVIOUS UTC day, so formatting it in the browser's zone
  // showed every manager west of Tunis the wrong date.
  it("renders the Tunisian wall-clock day, not the host's", () => {
    expect(formatVenueDate("2026-08-31T23:00:00.000Z")).toBe("01/09/2026")
    expect(formatVenueDate("2026-09-01T22:59:00.000Z")).toBe("01/09/2026")
    expect(formatVenueDate("2026-09-01T23:00:00.000Z")).toBe("02/09/2026")
  })

  it("keeps Western numerals for Arabic", () => {
    const out = formatVenueDate("2026-08-31T23:00:00.000Z", "ar")
    expect(out).toBe("01/09/2026")
    expect(ARABIC_INDIC_DIGITS.test(out)).toBe(false)
  })

  it("returns an empty string for a missing date", () => {
    expect(formatVenueDate(undefined)).toBe("")
  })
})
