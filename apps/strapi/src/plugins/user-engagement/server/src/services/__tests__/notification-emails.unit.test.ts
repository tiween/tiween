import { buildScheduleChangeEmail } from "../notification-emails"

/**
 * Unit tests for `buildScheduleChangeEmail` (Story 5.6) — pure, no Strapi.
 *
 * Locks: localized subject/html per fr/ar/en, Western (Latin) numerals in the
 * Arabic body (project rule), HTML-escaped event title, and the cancelled-vs-
 * changed body shape.
 */

describe("buildScheduleChangeEmail (unit)", () => {
  const base = {
    eventTitle: "Dune",
    oldDateTime: "2026-07-13T18:00:00.000Z",
    newDateTime: "2026-07-13T20:00:00.000Z",
  }

  it("builds a localized showtime-changed email in French", () => {
    const { subject, html } = buildScheduleChangeEmail("fr", {
      ...base,
      changeType: "showtime_changed",
    })
    expect(subject).toContain("Dune")
    expect(subject.toLowerCase()).toContain("horaire")
    expect(html).toContain("Dune")
    // old + new times both present
    expect(html.toLowerCase()).toContain("ancien")
    expect(html.toLowerCase()).toContain("nouvel")
  })

  it("builds a localized email in English", () => {
    const { subject, html } = buildScheduleChangeEmail("en", {
      ...base,
      changeType: "rescheduled",
    })
    expect(subject).toBe("Schedule change: Dune")
    expect(html).toContain("rescheduled")
  })

  it("builds a localized email in Arabic with Western (Latin) numerals only", () => {
    const { subject, html } = buildScheduleChangeEmail("ar", {
      ...base,
      changeType: "postponed",
    })
    expect(subject).toContain("Dune")
    // No Arabic-Indic digits (٠-٩) anywhere in the rendered body.
    expect(/[٠-٩]/.test(html)).toBe(false)
    // A Western-numeral date fragment IS present (e.g. the year 2026).
    expect(/2026/.test(html)).toBe(true)
  })

  it("cancelled omits the new time and announces the cancellation", () => {
    const { html } = buildScheduleChangeEmail("fr", {
      eventTitle: "Dune",
      changeType: "cancelled",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: null,
    })
    expect(html.toLowerCase()).toContain("annul")
    expect(html.toLowerCase()).not.toContain("nouvel horaire")
  })

  it("escapes HTML in the event title (XSS-safe body)", () => {
    const { html } = buildScheduleChangeEmail("en", {
      eventTitle: '<script>alert("x")</script>',
      changeType: "showtime_changed",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-13T20:00:00.000Z",
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("formats old/new times at the Africa/Tunis wall-clock offset (UTC+1), not UTC", () => {
    const { html } = buildScheduleChangeEmail("en", {
      eventTitle: "Dune",
      changeType: "showtime_changed",
      // 18:00Z / 20:00Z → 19:00 / 21:00 local in Africa/Tunis (UTC+1, no DST).
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-13T20:00:00.000Z",
    })
    expect(html).toContain("19:00")
    expect(html).toContain("21:00")
    // Guards against a dropped `timeZone: "Africa/Tunis"` (which would render
    // the raw UTC hours and ship hour-wrong showtimes).
    expect(html).not.toContain("18:00")
    expect(html).not.toContain("20:00")
  })

  it("omits the new-time line when a postponed/rescheduled change did not move the time", () => {
    const sameTime = "2026-07-13T18:00:00.000Z"
    const { html } = buildScheduleChangeEmail("fr", {
      eventTitle: "Dune",
      changeType: "postponed",
      oldDateTime: sameTime,
      newDateTime: sameTime,
    })
    expect(html.toLowerCase()).toContain("reporté")
    expect(html.toLowerCase()).toContain("ancien horaire")
    // No redundant identical "new time" line (mirrors the in-app "to be
    // confirmed" collapse).
    expect(html.toLowerCase()).not.toContain("nouvel horaire")
  })

  it("strips CR/LF and control chars from the subject (no header injection)", () => {
    const { subject } = buildScheduleChangeEmail("en", {
      eventTitle: "Dune\r\nBcc: attacker@evil.com",
      changeType: "showtime_changed",
      oldDateTime: "2026-07-13T18:00:00.000Z",
      newDateTime: "2026-07-13T20:00:00.000Z",
    })
    // No raw CR/LF survives into the header line.
    expect(subject).not.toContain("\n")
    expect(subject).not.toContain("\r")
    // The visible text is preserved (collapsed to a single space).
    expect(subject).toContain("Dune Bcc: attacker@evil.com")
  })
})
