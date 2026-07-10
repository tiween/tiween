import { describe, expect, it } from "vitest"

import { formatShowtimeLabel } from "./formatShowtimeLabel"

describe("formatShowtimeLabel", () => {
  // 2026-07-12T19:30Z is 20:30 in Africa/Tunis (UTC+1).
  const iso = "2026-07-12T19:30:00.000Z"

  it("renders in Africa/Tunis time regardless of the host timezone", () => {
    // The hour must reflect Tunis (20:30), not UTC (19:30) or the server TZ.
    expect(formatShowtimeLabel(iso, "fr")).toContain("20:30")
  })

  it("uses Western (Latin) numerals for Arabic", () => {
    // Arabic uses a 12-hour clock ("8:30"), but the digits must be Latin.
    const label = formatShowtimeLabel(iso, "ar")
    expect(label).toMatch(/8:30/)
    expect(label).toMatch(/[0-9]/)
    // No Eastern-Arabic digits.
    expect(label).not.toMatch(/[٠-٩]/)
  })

  it("returns an empty string for a missing date", () => {
    expect(formatShowtimeLabel(undefined, "fr")).toBe("")
    expect(formatShowtimeLabel(null, "fr")).toBe("")
    expect(formatShowtimeLabel("", "fr")).toBe("")
  })

  it("returns an empty string for an unparseable date instead of throwing", () => {
    expect(formatShowtimeLabel("not-a-date", "fr")).toBe("")
  })
})
