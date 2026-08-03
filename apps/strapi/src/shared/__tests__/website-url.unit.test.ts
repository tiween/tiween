/**
 * Unit tests for the canonical venue website-URL rule (DW-15).
 *
 * Two jobs:
 * 1. Pin every row of the spec's I/O & edge-case matrix against
 *    `isValidWebsiteUrl`.
 * 2. Guard the single-source-of-truth invariant — the venue `schema.json`
 *    `regex` must stay byte-for-byte equal to `WEBSITE_URL_PATTERN`. Without
 *    this assertion the two layers could silently drift and only the non-draft
 *    write path would change behavior.
 */
import venueSchema from "../../plugins/venues/server/src/content-types/venue/schema.json"
import {
  INVALID_WEBSITE_URL,
  isValidWebsiteUrl,
  WEBSITE_URL_MAX_LENGTH,
  WEBSITE_URL_PATTERN,
} from "../website-url"

describe("isValidWebsiteUrl (unit)", () => {
  it.each([
    ["valid https", "https://cinemamadart.tn"],
    ["port + path + query + fragment", "http://www.abc.com.tn:8080/a/b?x=1#f"],
    ["uppercase scheme", "HTTPS://Cinema.TN"],
    ["mixed-case scheme", "HtTpS://cinema.tn"],
    ["hyphenated host", "https://cinema-madart.com.tn"],
  ])("accepts %s", (_label, value) => {
    expect(isValidWebsiteUrl(value)).toBe(true)
  })

  it.each([
    ["undefined (absent key)", undefined],
    ["null", null],
    ["empty string", ""],
  ])("treats %s as unset and valid", (_label, value) => {
    expect(isValidWebsiteUrl(value)).toBe(true)
  })

  it.each([
    ["missing scheme", "cinemamadart.tn"],
    ["javascript scheme", "javascript:alert(1)"],
    ["ftp scheme", "ftp://a.tn"],
    ["no dotted TLD (localhost)", "http://localhost"],
    ["no dotted TLD (intranet)", "https://intranet"],
    ["underscore in host label", "https://sub_domain.tn"],
    ["leading hyphen in host label", "https://-cinema.tn"],
    ["trailing hyphen in host label", "https://cinema-.tn"],
    ["inner whitespace", "https://a b.tn"],
    ["leading whitespace", " https://a.tn"],
    ["trailing whitespace", "https://a.tn "],
    ["free text", "pas de site"],
    // Control characters in the tail: NUL never reaches our error path — the
    // Postgres driver aborts first with an opaque `22021` — and bidi controls
    // let rendered link text disagree with the URL it resolves to.
    ["NUL in path", "https://a.tn/\u0000"],
    ["newline in path", "https://a.tn/a\nb"],
    ["DEL in query", "https://a.tn/?q=\u007F"],
    ["bidi override in path", "https://a.tn/\u202Egnp.exe"],
    ["bidi isolate in path", "https://a.tn/\u2066x"],
    // Bidi MARKS steer rendering just like the overrides above, and the
    // zero-width family lets two visually identical URLs be stored as two
    // different values.
    ["left-to-right mark in path", "https://a.tn/\u200Ex"],
    ["right-to-left mark in path", "https://a.tn/\u200Fx"],
    ["arabic letter mark in path", "https://a.tn/\u061Cx"],
    ["zero-width space in path", "https://a.tn/\u200Bx"],
    ["zero-width non-joiner in path", "https://a.tn/\u200Cx"],
    ["word joiner in query", "https://a.tn/?q=\u2060x"],
    ["BOM in path", "https://a.tn/\uFEFFx"],
  ])("rejects %s", (_label, value) => {
    expect(isValidWebsiteUrl(value)).toBe(false)
  })

  it("still accepts a non-ASCII path — only control chars were excluded", () => {
    expect(isValidWebsiteUrl("https://a.tn/café")).toBe(true)
  })

  it("rejects a value over the max length", () => {
    const tooLong = `https://a.tn/${"x".repeat(250)}`

    expect(tooLong.length).toBeGreaterThan(WEBSITE_URL_MAX_LENGTH)
    expect(isValidWebsiteUrl(tooLong)).toBe(false)
  })

  it("accepts a value exactly at the max length", () => {
    const prefix = "https://a.tn/"
    const exact = prefix + "x".repeat(WEBSITE_URL_MAX_LENGTH - prefix.length)

    expect(exact).toHaveLength(WEBSITE_URL_MAX_LENGTH)
    expect(isValidWebsiteUrl(exact)).toBe(true)
  })

  it.each([
    ["number", 42],
    ["object", {}],
    ["array", []],
    ["boolean", true],
  ])("rejects a non-string %s rather than coercing it", (_label, value) => {
    expect(isValidWebsiteUrl(value)).toBe(false)
  })

  it("exposes the error CODE, not a prose message", () => {
    expect(INVALID_WEBSITE_URL).toBe("INVALID_WEBSITE_URL")
  })
})

describe("venue schema.json sync (unit)", () => {
  const website = (
    venueSchema as {
      attributes: { website: { regex?: string; maxLength?: number } }
    }
  ).attributes.website

  it("carries a regex byte-for-byte equal to WEBSITE_URL_PATTERN", () => {
    expect(website.regex).toBe(WEBSITE_URL_PATTERN)
  })

  it("carries a maxLength equal to WEBSITE_URL_MAX_LENGTH", () => {
    expect(website.maxLength).toBe(WEBSITE_URL_MAX_LENGTH)
  })

  /**
   * String equality above proves the two layers hold the SAME pattern; it does
   * not prove they reach the same verdict, because the length bound lives in
   * the predicate (`isValidWebsiteUrl`) and in a separate `maxLength` on the
   * schema, not in the pattern. This reconstructs the schema layer the way
   * Strapi applies it — `new RegExp(attr.regex)` plus `maxLength` — and pins
   * that it agrees with the predicate on every input the suite exercises.
   */
  it("reaches the same verdict as isValidWebsiteUrl on every input", () => {
    const schemaRe = new RegExp(website.regex as string)
    const acceptedBySchema = (value: string) =>
      value.length <= (website.maxLength as number) && schemaRe.test(value)

    const inputs = [
      "https://cinemamadart.tn",
      "http://www.abc.com.tn:8080/a/b?x=1#f",
      "HTTPS://Cinema.TN",
      "https://cinema-madart.com.tn",
      "https://a.tn/café",
      "",
      "cinemamadart.tn",
      "javascript:alert(1)",
      "ftp://a.tn",
      "http://localhost",
      "https://sub_domain.tn",
      "https://-cinema.tn",
      "https://a b.tn",
      " https://a.tn",
      "pas de site",
      "https://a.tn/\u0000",
      "https://a.tn/?q=\u007F",
      "https://a.tn/\u202Egnp.exe",
      "https://a.tn/\u200Ex",
      "https://a.tn/\u200Bx",
      "https://a.tn/\uFEFFx",
      `https://a.tn/${"x".repeat(250)}`,
      `https://a.tn/${"x".repeat(WEBSITE_URL_MAX_LENGTH - 13)}`,
    ]

    for (const value of inputs) {
      expect([value, acceptedBySchema(value)]).toEqual([
        value,
        isValidWebsiteUrl(value),
      ])
    }
  })
})
