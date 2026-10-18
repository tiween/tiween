/**
 * Unit tests for the shared short-film rules module (plan 01-02, SDATA-01).
 *
 * The module is imported by the server publish guard, the events-manager admin
 * form and the importer, so these tests pin: the code lists, the Zod write
 * validators (error CODES, never prose), the D-19 publish-rule evaluator and
 * the D-04 derived predicates.
 */
import type { ShortFilmRuleInput } from "../short-film-rules"

import {
  AWARD_RESULTS,
  countryCodesSchema,
  evaluateShortFilmPublishRules,
  hasAwards,
  isAvailableOnline,
  isDirectingCredit,
  isHttpsUrl,
  ISO_3166_ALPHA2,
  languageCodesSchema,
  PINNED_COUNTRY_CODE,
  PINNED_LANGUAGE_CODE,
  RESERVED_SHORT_FILM_SLUGS,
  SHORT_FILM_DURATION_WARNING_MINUTES,
  SHORT_FILM_ISSUE_CODES,
  SHORT_FILM_LANGUAGE_CODES,
  STREAMING_ACCESS_TYPES,
  STREAMING_PLATFORMS,
} from "../short-film-rules"

const issueMessages = (result: {
  success: boolean
  error?: { issues: Array<{ message: string }> }
}) => (result.error ? result.error.issues.map((i) => i.message) : [])

describe("ISO_3166_ALPHA2", () => {
  it("holds the 249 officially assigned alpha-2 codes, uppercase and unique", () => {
    expect(ISO_3166_ALPHA2).toHaveLength(249)
    expect(new Set(ISO_3166_ALPHA2).size).toBe(249)
    for (const code of ISO_3166_ALPHA2) {
      expect(code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it("includes the countries the directory relies on", () => {
    for (const code of ["TN", "FR", "CA", "QA"]) {
      expect(ISO_3166_ALPHA2).toContain(code)
    }
  })

  it("does not include user-assigned, exceptional or reserved codes", () => {
    for (const code of ["ZZ", "XK", "EU", "UK", "AC"]) {
      expect(ISO_3166_ALPHA2).not.toContain(code)
    }
  })

  it("resolves every entry to a region name through Intl.DisplayNames", () => {
    const names = new Intl.DisplayNames(["en"], { type: "region" })
    for (const code of ISO_3166_ALPHA2) {
      const name = names.of(code)
      expect(name).toBeTruthy()
      expect(name).not.toBe(code)
    }
  })
})

describe("constants", () => {
  it("pins the curated language list and the pinned defaults (D-02, D-18)", () => {
    expect(SHORT_FILM_LANGUAGE_CODES).toEqual([
      "aeb",
      "ar",
      "fr",
      "en",
      "ber",
      "none",
      "es",
      "it",
      "de",
    ])
    expect(PINNED_COUNTRY_CODE).toBe("TN")
    expect(PINNED_LANGUAGE_CODE).toBe("aeb")
  })

  it("pins the streaming vocabularies (D-03)", () => {
    expect(STREAMING_PLATFORMS).toEqual([
      "youtube",
      "vimeo",
      "dailymotion",
      "artify",
      "arte",
      "mubi",
      "netflix",
      "shahid",
      "tv5monde",
      "other",
    ])
    expect(STREAMING_ACCESS_TYPES).toEqual([
      "free",
      "included",
      "subscription",
      "rental",
    ])
  })

  it("pins the rule vocabulary", () => {
    expect(AWARD_RESULTS).toEqual([
      "winner",
      "grand-prize",
      "special-mention",
      "honorable-mention",
    ])
    expect(SHORT_FILM_DURATION_WARNING_MINUTES).toBe(40)
    expect(RESERVED_SHORT_FILM_SLUGS).toEqual(["featured"])
    expect(SHORT_FILM_ISSUE_CODES).toEqual([
      "SLUG_REQUIRED",
      "SLUG_RESERVED",
      "POSTER_REQUIRED",
      "DIRECTOR_REQUIRED",
      "DIRECTOR_UNPUBLISHED",
      "WATCH_SOURCE_REQUIRED",
    ])
  })
})

describe("countryCodesSchema", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty array", []],
    ["two valid codes", ["TN", "FR"]],
  ])("accepts %s", (_label, value) => {
    expect(countryCodesSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ["a lowercase code", ["tn"]],
    ["an unassigned code", ["ZZ"]],
    ["a duplicate code", ["TN", "TN"]],
    [
      "more than 10 entries",
      ["TN", "FR", "DE", "IT", "ES", "PT", "BE", "NL", "CH", "AT", "CA"],
    ],
    ["a non-array string", "TN"],
  ])("rejects %s with INVALID_COUNTRY_CODES", (_label, value) => {
    const result = countryCodesSchema.safeParse(value)
    expect(result.success).toBe(false)
    const messages = issueMessages(result as any)
    expect(messages.length).toBeGreaterThan(0)
    expect(new Set(messages)).toEqual(new Set(["INVALID_COUNTRY_CODES"]))
  })

  it("does not normalize: the parsed value is returned untouched", () => {
    expect(countryCodesSchema.parse(["TN", "FR"])).toEqual(["TN", "FR"])
  })
})

describe("languageCodesSchema", () => {
  it.each([
    ["one dialect code", ["aeb"]],
    ["two codes", ["aeb", "fr"]],
    ["none on its own", ["none"]],
    ["null", null],
    ["an empty array", []],
  ])("accepts %s", (_label, value) => {
    expect(languageCodesSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ["none combined with another code", ["none", "fr"]],
    ["an uppercase code", ["AEB"]],
    ["an unknown code", ["xx"]],
    ["a duplicate code", ["fr", "fr"]],
    ["a non-array string", "fr"],
  ])("rejects %s with INVALID_LANGUAGE_CODES", (_label, value) => {
    const result = languageCodesSchema.safeParse(value)
    expect(result.success).toBe(false)
    const messages = issueMessages(result as any)
    expect(messages.length).toBeGreaterThan(0)
    expect(new Set(messages)).toEqual(new Set(["INVALID_LANGUAGE_CODES"]))
  })
})

describe("evaluateShortFilmPublishRules", () => {
  const complete = (): ShortFilmRuleInput => ({
    slug: "un-court-metrage",
    poster: { id: 1 },
    credits: [
      {
        creditRole: { slug: "director" },
        person: { documentId: "person-1" },
      },
    ],
    streamingLinks: [{ platform: "youtube" }],
    videos: [],
    duration: 12,
  })

  const codes = (input: ShortFilmRuleInput, options?: any) =>
    evaluateShortFilmPublishRules(input, options).issues.map((i) => i.code)

  it("passes a complete input with no issues and no warnings", () => {
    const result = evaluateShortFilmPublishRules(complete())
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("reports SLUG_REQUIRED at slug for an empty or missing slug", () => {
    for (const slug of ["", "   ", null, undefined]) {
      const result = evaluateShortFilmPublishRules({ ...complete(), slug })
      expect(result.ok).toBe(false)
      expect(result.issues).toEqual([{ code: "SLUG_REQUIRED", path: "slug" }])
    }
  })

  it("reports SLUG_RESERVED at slug for the featured route segment", () => {
    const result = evaluateShortFilmPublishRules({
      ...complete(),
      slug: "featured",
    })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([{ code: "SLUG_RESERVED", path: "slug" }])
  })

  it("reports POSTER_REQUIRED at poster when there is no poster", () => {
    for (const poster of [null, undefined]) {
      const result = evaluateShortFilmPublishRules({ ...complete(), poster })
      expect(result.issues).toEqual([
        { code: "POSTER_REQUIRED", path: "poster" },
      ])
    }
  })

  it("accepts a poster given as a positive numeric id", () => {
    expect(codes({ ...complete(), poster: 12 })).toEqual([])
    expect(codes({ ...complete(), poster: 0 })).toEqual(["POSTER_REQUIRED"])
  })

  it("reports DIRECTOR_REQUIRED at credits when only non-director roles exist", () => {
    const result = evaluateShortFilmPublishRules({
      ...complete(),
      credits: [
        {
          creditRole: { slug: "other" },
          person: { documentId: "person-1" },
        },
      ],
    })
    expect(result.issues).toEqual([
      { code: "DIRECTOR_REQUIRED", path: "credits" },
    ])
  })

  it("matches directors by credit-role slug only, never by a localized name", () => {
    const input: ShortFilmRuleInput = {
      ...complete(),
      credits: [
        {
          // A localized name that means "director" must not count.
          creditRole: { slug: "realisateur", name: "Réalisateur" } as any,
          person: { documentId: "person-1" },
        },
      ],
    }
    expect(codes(input)).toEqual(["DIRECTOR_REQUIRED"])
  })

  it("reports DIRECTOR_REQUIRED for null or empty credits", () => {
    expect(codes({ ...complete(), credits: null })).toEqual([
      "DIRECTOR_REQUIRED",
    ])
    expect(codes({ ...complete(), credits: [] })).toEqual(["DIRECTOR_REQUIRED"])
  })

  it("reports DIRECTOR_UNPUBLISHED when published person ids exclude the director", () => {
    const result = evaluateShortFilmPublishRules(complete(), {
      publishedPersonIds: new Set(["someone-else"]),
    })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      { code: "DIRECTOR_UNPUBLISHED", path: "credits" },
    ])
  })

  it("does not report DIRECTOR_UNPUBLISHED when the director is published", () => {
    const result = evaluateShortFilmPublishRules(complete(), {
      publishedPersonIds: new Set(["person-1"]),
    })
    expect(result.ok).toBe(true)
  })

  it("skips the unpublished-director check when no published ids are supplied", () => {
    expect(codes(complete())).toEqual([])
  })

  it("reports WATCH_SOURCE_REQUIRED at streamingLinks with no link and only a full-length video", () => {
    const result = evaluateShortFilmPublishRules({
      ...complete(),
      streamingLinks: [],
      videos: [{ videoType: "full-length" }],
    })
    expect(result.issues).toEqual([
      { code: "WATCH_SOURCE_REQUIRED", path: "streamingLinks" },
    ])
  })

  it("accepts a trailer video as the watch source when there is no streaming link", () => {
    const result = evaluateShortFilmPublishRules({
      ...complete(),
      streamingLinks: null,
      videos: [{ videoType: "trailer" }],
    })
    expect(result.ok).toBe(true)
  })

  it("warns (without failing) for a 41-minute film", () => {
    const result = evaluateShortFilmPublishRules({
      ...complete(),
      duration: 41,
    })
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([
      { code: "DURATION_OVER_40_MINUTES", path: "duration" },
    ])
  })

  it("does not warn at exactly 40 minutes", () => {
    const result = evaluateShortFilmPublishRules({
      ...complete(),
      duration: 40,
    })
    expect(result.warnings).toEqual([])
  })

  it("honours skip ['POSTER_REQUIRED'] on a posterless input", () => {
    const result = evaluateShortFilmPublishRules(
      { ...complete(), poster: null },
      { skip: ["POSTER_REQUIRED"] }
    )
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  it("refuses to skip any rule other than POSTER_REQUIRED", () => {
    expect(() =>
      evaluateShortFilmPublishRules(complete(), {
        skip: ["DIRECTOR_REQUIRED"],
      })
    ).toThrow("SKIP_NOT_ALLOWED")
  })

  it("returns issues in the fixed rule order", () => {
    const result = evaluateShortFilmPublishRules({
      slug: "",
      poster: null,
      credits: [],
      streamingLinks: [],
      videos: [],
    })
    expect(result.issues.map((i) => i.code)).toEqual([
      "SLUG_REQUIRED",
      "POSTER_REQUIRED",
      "DIRECTOR_REQUIRED",
      "WATCH_SOURCE_REQUIRED",
    ])
    expect(result.issues.map((i) => i.path)).toEqual([
      "slug",
      "poster",
      "credits",
      "streamingLinks",
    ])
  })
})

describe("isDirectingCredit", () => {
  it("is true only for the director credit-role slug", () => {
    expect(isDirectingCredit({ creditRole: { slug: "director" } })).toBe(true)
    expect(isDirectingCredit({ creditRole: { slug: "other" } })).toBe(false)
    expect(isDirectingCredit({ creditRole: null })).toBe(false)
    expect(isDirectingCredit({})).toBe(false)
  })
})

describe("isAvailableOnline (D-04)", () => {
  it("is true with at least one streaming link", () => {
    expect(
      isAvailableOnline({ streamingLinks: [{ platform: "vimeo" }], videos: [] })
    ).toBe(true)
  })

  it("is true with a full-length video only", () => {
    expect(
      isAvailableOnline({
        streamingLinks: [],
        videos: [{ videoType: "full-length" }],
      })
    ).toBe(true)
  })

  it("is false with only a trailer", () => {
    expect(
      isAvailableOnline({
        streamingLinks: [],
        videos: [{ videoType: "trailer" }],
      })
    ).toBe(false)
  })

  it("is false with nothing", () => {
    expect(isAvailableOnline({ streamingLinks: null, videos: null })).toBe(
      false
    )
    expect(isAvailableOnline({})).toBe(false)
  })
})

describe("hasAwards (D-04)", () => {
  it.each(["winner", "grand-prize", "special-mention", "honorable-mention"])(
    "is true for a %s distinction",
    (result) => {
      expect(hasAwards({ distinctions: [{ result }] })).toBe(true)
    }
  )

  it("is false for only selected or nominated distinctions", () => {
    expect(
      hasAwards({
        distinctions: [{ result: "selected" }, { result: "nominated" }],
      })
    ).toBe(false)
  })

  it("is false for no distinctions", () => {
    expect(hasAwards({ distinctions: [] })).toBe(false)
    expect(hasAwards({ distinctions: null })).toBe(false)
    expect(hasAwards({})).toBe(false)
  })
})

describe("isHttpsUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=abc",
    "  https://vimeo.com/1  ",
    "HTTPS://example.org/path",
  ])("accepts %p", (url) => {
    expect(isHttpsUrl(url)).toBe(true)
  })

  it.each([
    "javascript:void(0)",
    " javascript:void(0)",
    "data:text/html,x",
    "http://example.org",
    "//example.org",
    "example.org",
    "",
    null,
    undefined,
    42,
  ])("rejects %p", (url) => {
    expect(isHttpsUrl(url)).toBe(false)
  })
})
