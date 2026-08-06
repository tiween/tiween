import type { ConfirmationEmailInput } from "../confirmation-email"

import {
  buildConfirmationEmail,
  buildGoogleCalendarUrl,
  buildIcs,
  escapeHtml,
  formatEmailPrice,
  sanitizeHeader,
  ticketTypeLabel,
} from "../confirmation-email"

/**
 * Unit tests for the pure confirmation-email builder (Story 6.5). No Strapi,
 * no I/O — content, localization, sanitization and the calendar artifacts.
 */

function input(
  overrides: Partial<ConfirmationEmailInput> = {}
): ConfirmationEmailInput {
  return {
    orderNumber: "TW-ABC-1234",
    recipientName: "Amine",
    totalAmount: 35,
    currency: "TND",
    eventTitle: "Dune 3",
    startDateTime: "2026-09-01T19:00:00.000Z",
    venueName: "Le Colisée",
    tickets: [
      { ticketNumber: "TW-ABC-1234-1", type: "standard", price: 10 },
      { ticketNumber: "TW-ABC-1234-2", type: "vip", price: 25 },
    ],
    ...overrides,
  }
}

describe("buildConfirmationEmail (unit)", () => {
  it("fr: subject + html carry order number, event, venue, tickets, total and calendar link", () => {
    const { subject, html } = buildConfirmationEmail("fr", input())

    expect(subject).toBe("Vos billets — Dune 3")
    expect(html).toContain("TW-ABC-1234")
    expect(html).toContain("Dune 3")
    expect(html).toContain("Le Colisée")
    expect(html).toContain("TW-ABC-1234-1")
    expect(html).toContain("TW-ABC-1234-2")
    expect(html).toContain("Plein tarif")
    expect(html).toContain("VIP")
    expect(html).toContain("calendar.google.com/calendar/render")
    expect(html).toContain("Bonjour Amine,")
    // Total uses the order currency, localized decimal (TND has 3 minor units).
    expect(html).toContain("TND")
  })

  it("en: english copy with the same data", () => {
    const { subject, html } = buildConfirmationEmail("en", input())

    expect(subject).toBe("Your tickets — Dune 3")
    expect(html).toContain("Hello Amine,")
    expect(html).toContain("Full price")
  })

  it("ar: arabic copy, RTL container, Western numerals only", () => {
    const { subject, html } = buildConfirmationEmail("ar", input())

    expect(subject).toContain("تذاكرك")
    expect(html).toContain('dir="rtl"')
    expect(html).toContain("مرحباً Amine،")
    // The always-Western-numerals rule: no Arabic-Indic digits anywhere.
    expect(html).not.toMatch(/[٠-٩۰-۹]/)
    // Date renders in Africa/Tunis with Latin digits. Assert the segments
    // individually — ICU interleaves invisible RTL marks whose exact placement
    // varies across ICU versions, so a full-date regex would be brittle.
    const dateLine = html.match(/التاريخ:[^<]*/)?.[0] ?? ""
    expect(dateLine).toContain("01")
    expect(dateLine).toContain("09")
    expect(dateLine).toContain("2026")
  })

  it("greets anonymously when no recipient name exists", () => {
    const { html } = buildConfirmationEmail(
      "fr",
      input({ recipientName: null })
    )
    expect(html).toContain("Bonjour,")
    expect(html).not.toContain("Bonjour null")
  })

  it("header injection: CR/LF in the title is stripped from the subject and the title is escaped in the body", () => {
    const evil = "Dune 3\r\n<Bcc: attacker@evil.tld>"
    const { subject, html } = buildConfirmationEmail(
      "fr",
      input({ eventTitle: evil })
    )

    // Subject is an email header: control chars collapse to a single space.
    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject).toContain("Dune 3 <Bcc: attacker@evil.tld>")
    // Body escapes the title's HTML metacharacters.
    expect(html).not.toContain("<Bcc:")
    expect(html).toContain("&lt;Bcc: attacker@evil.tld&gt;")
  })

  it("escapes HTML in every interpolated value", () => {
    const { html } = buildConfirmationEmail(
      "fr",
      input({
        eventTitle: "<script>alert(1)</script>",
        venueName: 'Le "Colisée" <b>',
        recipientName: "<img src=x>",
      })
    )

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<img src=x>")
    expect(html).toContain("&quot;Colisée&quot;")
  })

  it("never contains token material (no TWQ1., accessToken, qrNonce)", () => {
    const { subject, html, text } = buildConfirmationEmail("fr", input())
    for (const needle of ["TWQ1.", "accessToken", "qrNonce"]) {
      expect(subject).not.toContain(needle)
      expect(html).not.toContain(needle)
      expect(text).not.toContain(needle)
    }
  })

  it("returns a plain-text alternative carrying the content without any markup", () => {
    const { text } = buildConfirmationEmail("fr", input())

    expect(text).toContain("TW-ABC-1234")
    expect(text).toContain("Dune 3")
    expect(text).toContain("Le Colisée")
    expect(text).toContain("TW-ABC-1234-1")
    expect(text).toContain("Plein tarif")
    expect(text).toContain("TND")
    expect(text).toContain("calendar.google.com/calendar/render")
    // No HTML tags and no entity-escaping artifacts in the text part.
    expect(text).not.toMatch(/<[a-z][^>]*>/i)
    expect(text).not.toContain("&lt;")
    expect(text).not.toContain("&amp;")
  })

  it("renders prices from the order currency, never a hardcoded TND", () => {
    const { html } = buildConfirmationEmail("fr", input({ currency: "EUR" }))
    expect(html).toContain("EUR")
    expect(html).not.toContain("TND")
  })

  it("omits date and calendar link when the sub-event has no start time", () => {
    const { html } = buildConfirmationEmail(
      "fr",
      input({ startDateTime: null })
    )
    expect(html).not.toContain("calendar.google.com")
    expect(html).not.toContain("Date :")
  })
})

describe("buildGoogleCalendarUrl (unit)", () => {
  it("builds an action=TEMPLATE url with UTC start/start+2h", () => {
    const url = buildGoogleCalendarUrl(input())

    expect(url).toContain("https://calendar.google.com/calendar/render?")
    expect(url).toContain("action=TEMPLATE")
    expect(url).toContain("dates=20260901T190000Z%2F20260901T210000Z")
    expect(url).toContain("location=Le+Colis%C3%A9e")
    // Description carries the order number, never tokens.
    expect(url).toContain("TW-ABC-1234")
  })

  it("returns null without a parseable start time", () => {
    expect(buildGoogleCalendarUrl(input({ startDateTime: null }))).toBeNull()
    expect(
      buildGoogleCalendarUrl(input({ startDateTime: "garbage" }))
    ).toBeNull()
  })
})

describe("buildIcs (unit)", () => {
  it("emits a CRLF VCALENDAR with UTC times, summary, location and order-number description", () => {
    const ics = buildIcs(input())

    expect(ics).not.toBeNull()
    expect(ics).toContain("BEGIN:VCALENDAR\r\n")
    expect(ics).toContain("DTSTART:20260901T190000Z")
    expect(ics).toContain("DTEND:20260901T210000Z")
    expect(ics).toContain("SUMMARY:Dune 3")
    expect(ics).toContain("LOCATION:Le Colisée")
    expect(ics).toContain("DESCRIPTION:Tiween — TW-ABC-1234")
    expect(ics).toContain("END:VCALENDAR")
    // No token material in the calendar artifact either.
    expect(ics).not.toContain("TWQ1.")
  })

  it("escapes iCalendar special characters", () => {
    const ics = buildIcs(input({ eventTitle: "A;B,C\nD" }))
    expect(ics).toContain("SUMMARY:A\\;B\\,C\\nD")
  })

  it("escapes a lone \\r as a literal \\n", () => {
    const ics = buildIcs(input({ eventTitle: "A\rB" }))
    expect(ics).toContain("SUMMARY:A\\nB")
    // The raw CR must not survive into the artifact as a stray line break.
    expect(ics).not.toContain("A\rB")
  })

  it("folds content lines over 75 octets with a space-prefixed continuation that unfolds losslessly", () => {
    const longTitle = "L".repeat(120)
    const ics = buildIcs(input({ eventTitle: longTitle }))!

    // Every physical line stays within 75 octets.
    for (const line of ics.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75)
    }

    // The SUMMARY was folded: a continuation line starts with a single space…
    expect(ics).toMatch(/\r\n [^\r\n]*L/)
    // …and unfolding (CRLF + space removal, RFC 5545 §3.1) restores it.
    const unfolded = ics.replace(/\r\n /g, "")
    expect(unfolded).toContain(`SUMMARY:${longTitle}`)
  })

  it("returns null without a start time", () => {
    expect(buildIcs(input({ startDateTime: null }))).toBeNull()
  })
})

describe("helpers (unit)", () => {
  it("sanitizeHeader collapses control runs to one space", () => {
    expect(sanitizeHeader("a\r\n\tb")).toBe("a b")
  })

  it("escapeHtml escapes the five metacharacters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;")
  })

  it("ticketTypeLabel localizes the three types and passes unknowns through", () => {
    expect(ticketTypeLabel("fr", "standard")).toBe("Plein tarif")
    expect(ticketTypeLabel("fr", "reduced")).toBe("Tarif réduit")
    expect(ticketTypeLabel("en", "vip")).toBe("VIP")
    expect(ticketTypeLabel("ar", "mystery")).toBe("mystery")
  })

  it("formatEmailPrice keeps Western numerals for Arabic", () => {
    const price = formatEmailPrice(35, "TND", "ar")
    expect(price).not.toMatch(/[٠-٩]/)
    expect(price).toContain("TND")
  })

  it("formatEmailPrice falls back to the raw amount on an unknown currency code", () => {
    // No minor-unit guess: TND has 3 minor units, most codes have 2, so the
    // fallback must not fabricate a decimal precision.
    expect(formatEmailPrice(10, "NOPE!", "fr")).toBe("10 NOPE!")
    expect(formatEmailPrice(12.5, "NOPE!", "fr")).toBe("12.5 NOPE!")
  })
})
