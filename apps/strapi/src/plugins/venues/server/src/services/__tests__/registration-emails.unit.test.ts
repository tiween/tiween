import {
  buildAdminNotificationEmail,
  buildApplicantConfirmationEmail,
  escapeHtml,
  normalizeLocale,
  sanitizeHeader,
} from "../registration-emails"

/**
 * Unit tests for the pure venue-registration email builders (Story 7.1).
 *
 * These templates interpolate attacker-controlled strings (a venue name and an
 * applicant name straight off a PUBLIC, unauthenticated form) into an HTML body
 * and an email header. The two things that must hold are therefore:
 *  - the HTML body escapes markup, so a `<script>`-bearing venue name cannot
 *    execute in the recipient's mail client, and
 *  - the subject strips CR/LF, so a newline-bearing name cannot inject extra
 *    email headers (a smuggled `Bcc:`).
 * Plus the locale fallback, since the applicant's `preferredLanguage` is
 * optional and arbitrary values reach `normalizeLocale`.
 */

const XSS_NAME = '<script>alert("x")</script>'

describe("normalizeLocale (unit)", () => {
  it.each(["ar", "fr", "en"])("keeps the supported locale %s", (locale) => {
    expect(normalizeLocale(locale)).toBe(locale)
  })

  it("narrows a regional tag to its base locale", () => {
    expect(normalizeLocale("ar-TN")).toBe("ar")
    expect(normalizeLocale("en-GB")).toBe("en")
  })

  it("falls back to fr for unknown, absent or non-string values", () => {
    expect(normalizeLocale("de")).toBe("fr")
    expect(normalizeLocale(undefined)).toBe("fr")
    expect(normalizeLocale(null)).toBe("fr")
    expect(normalizeLocale(42)).toBe("fr")
  })
})

describe("escapeHtml / sanitizeHeader (unit)", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;")
  })

  it("strips CR/LF and control characters from a header value", () => {
    expect(sanitizeHeader("Venue\r\nBcc: attacker@evil.test")).toBe(
      "Venue Bcc: attacker@evil.test"
    )
  })
})

describe("buildApplicantConfirmationEmail (unit)", () => {
  it("returns a distinct localized subject per locale", () => {
    const fr = buildApplicantConfirmationEmail("fr", {
      applicantName: "Alice",
      venueName: "Le Rio",
    })
    const en = buildApplicantConfirmationEmail("en", {
      applicantName: "Alice",
      venueName: "Le Rio",
    })
    const ar = buildApplicantConfirmationEmail("ar", {
      applicantName: "Alice",
      venueName: "Le Rio",
    })

    expect(fr.subject).toContain("Le Rio")
    expect(en.subject).toContain("Le Rio")
    expect(ar.subject).toContain("Le Rio")
    expect(new Set([fr.subject, en.subject, ar.subject]).size).toBe(3)
    expect(new Set([fr.html, en.html, ar.html]).size).toBe(3)
  })

  it("escapes a <script>-bearing venue name in the HTML body", () => {
    const { html } = buildApplicantConfirmationEmail("fr", {
      applicantName: "Alice",
      venueName: XSS_NAME,
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("escapes a <script>-bearing applicant name in the HTML body", () => {
    const { html } = buildApplicantConfirmationEmail("en", {
      applicantName: XSS_NAME,
      venueName: "Le Rio",
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("strips CRLF from the subject so no extra header can be injected", () => {
    const { subject } = buildApplicantConfirmationEmail("fr", {
      applicantName: "Alice",
      venueName: "Le Rio\r\nBcc: attacker@evil.test",
    })

    expect(subject).not.toContain("\r")
    expect(subject).not.toContain("\n")
  })

  it("tolerates empty names without throwing", () => {
    const { subject, html } = buildApplicantConfirmationEmail("fr", {
      applicantName: "",
      venueName: "",
    })

    expect(typeof subject).toBe("string")
    expect(typeof html).toBe("string")
  })
})

describe("buildAdminNotificationEmail (unit)", () => {
  it("carries the venue name, applicant, contact email and documentId", () => {
    const { subject, html } = buildAdminNotificationEmail({
      venueName: "Le Rio",
      contactEmail: "contact@rio.test",
      applicantName: "Alice Dupont",
      venueDocumentId: "doc123",
    })

    expect(subject).toContain("Le Rio")
    expect(html).toContain("Le Rio")
    expect(html).toContain("contact@rio.test")
    expect(html).toContain("Alice Dupont")
    expect(html).toContain("doc123")
  })

  it("escapes every interpolated value in the HTML body", () => {
    const { html } = buildAdminNotificationEmail({
      venueName: XSS_NAME,
      contactEmail: XSS_NAME,
      applicantName: XSS_NAME,
      venueDocumentId: XSS_NAME,
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("strips CRLF from the subject", () => {
    const { subject } = buildAdminNotificationEmail({
      venueName: "Le Rio\nBcc: attacker@evil.test",
      contactEmail: "contact@rio.test",
      applicantName: "Alice",
      venueDocumentId: "doc123",
    })

    expect(subject).not.toContain("\n")
  })
})
