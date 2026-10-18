/**
 * Publish helpers for the Works form (plan 01-09, D-19 form side).
 */
import type { CreativeWork } from "../../hooks/useCreativeWorks"

import {
  evaluateShortFilmPublishRules,
  SHORT_FILM_ISSUE_CODES,
} from "../../../../../../shared/short-film-rules"
import {
  extractPublishError,
  publishErrorMessages,
  publishIssueMessage,
  TRANSLATION_TARGET_MISSING,
  workToRuleInput,
} from "./publishRules"

/** Identity translator: returns the default message. */
const t = (_id: string, defaultMessage: string) => defaultMessage

const baseWork = (overrides: Partial<CreativeWork> = {}): CreativeWork =>
  ({
    id: 1,
    documentId: "abc",
    title: "Le Silence",
    type: "short-film",
    slug: "le-silence",
    duration: 12,
    poster: { id: 5, url: "/uploads/p.jpg", name: "p.jpg" },
    credits: [
      {
        person: { documentId: "p1", name: "Ines" },
        creditRole: { documentId: "r1", name: "Director", slug: "director" },
      },
    ],
    streamingLinks: [
      {
        platform: "youtube",
        url: "https://youtu.be/x",
        accessType: "free",
      },
    ],
    videos: [],
    ...overrides,
  }) as CreativeWork

describe("workToRuleInput", () => {
  it("maps a content-manager work to the shared evaluator input", () => {
    const input = workToRuleInput(baseWork())

    expect(input).toEqual({
      slug: "le-silence",
      poster: { id: 5, url: "/uploads/p.jpg", name: "p.jpg" },
      credits: [
        { creditRole: { slug: "director" }, person: { documentId: "p1" } },
      ],
      streamingLinks: [
        { platform: "youtube", url: "https://youtu.be/x", accessType: "free" },
      ],
      videos: [],
      duration: 12,
    })
  })

  it("makes the evaluator pass for a complete draft", () => {
    const result = evaluateShortFilmPublishRules(workToRuleInput(baseWork()))

    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  it("reports every missing rule of an incomplete draft in the evaluator's order", () => {
    const result = evaluateShortFilmPublishRules(
      workToRuleInput(
        baseWork({
          slug: null,
          poster: null,
          credits: [],
          streamingLinks: [],
        })
      )
    )

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "SLUG_REQUIRED",
      "POSTER_REQUIRED",
      "DIRECTOR_REQUIRED",
      "WATCH_SOURCE_REQUIRED",
    ])
  })

  it("accepts a trailer video instead of a streaming link", () => {
    const result = evaluateShortFilmPublishRules(
      workToRuleInput(
        baseWork({
          streamingLinks: [],
          videos: [{ url: "https://youtu.be/t", videoType: "trailer" }],
        })
      )
    )

    expect(result.ok).toBe(true)
  })

  it("warns without blocking when the duration is over 40 minutes", () => {
    const result = evaluateShortFilmPublishRules(
      workToRuleInput(baseWork({ duration: 55 }))
    )

    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([
      { code: "DURATION_OVER_40_MINUTES", path: "duration" },
    ])
  })

  it("survives a work with no components populated", () => {
    const input = workToRuleInput({
      id: 2,
      documentId: "z",
      title: "Bare",
      type: "short-film",
    } as CreativeWork)

    expect(input.credits).toEqual([])
    expect(input.streamingLinks).toEqual([])
    expect(input.slug).toBeNull()
  })
})

describe("extractPublishError", () => {
  const rejection = (error: Record<string, unknown>) => ({
    response: { data: { error } },
  })

  it("reads the code and the coded issues of a blocked publish", () => {
    const error = extractPublishError(
      rejection({
        message: "Short film cannot be published",
        details: {
          code: "SHORT_FILM_PUBLISH_BLOCKED",
          issues: [
            { code: "POSTER_REQUIRED", path: "poster" },
            { code: "DIRECTOR_REQUIRED", path: "credits" },
          ],
        },
      })
    )

    expect(error).toEqual({
      code: "SHORT_FILM_PUBLISH_BLOCKED",
      issues: [
        { code: "POSTER_REQUIRED", path: "poster" },
        { code: "DIRECTOR_REQUIRED", path: "credits" },
      ],
    })
  })

  it("reads a write-validation code with its single issue", () => {
    const error = extractPublishError(
      rejection({
        details: {
          code: "INVALID_COUNTRY_CODES",
          issues: [{ code: "INVALID_COUNTRY_CODES", path: "country" }],
        },
      })
    )

    expect(error.code).toBe("INVALID_COUNTRY_CODES")
    expect(error.issues).toEqual([
      { code: "INVALID_COUNTRY_CODES", path: "country" },
    ])
  })

  it("ignores malformed issue entries", () => {
    const error = extractPublishError(
      rejection({
        details: {
          code: "SHORT_FILM_PUBLISH_BLOCKED",
          issues: [null, {}, { code: 7 }, { code: "SLUG_REQUIRED" }],
        },
      })
    )

    expect(error.issues).toEqual([{ code: "SLUG_REQUIRED" }])
  })

  it("recognises Strapi's locale-not-found message without returning the prose", () => {
    const error = extractPublishError(
      rejection({
        message: 'Document with id "abc", locale "ar" not found',
        details: {},
      })
    )

    expect(error).toEqual({ code: TRANSLATION_TARGET_MISSING, issues: [] })
  })

  it("returns an empty result for an error without a server body", () => {
    expect(extractPublishError(new Error("Network down"))).toEqual({
      code: undefined,
      issues: [],
    })
    expect(extractPublishError(null)).toEqual({ code: undefined, issues: [] })
  })
})

describe("publishIssueMessage", () => {
  it.each([
    ["SLUG_REQUIRED", "Add a slug before publishing"],
    ["SLUG_RESERVED", "This slug is reserved, choose another one"],
    ["POSTER_REQUIRED", "Add a poster before publishing"],
    ["DIRECTOR_REQUIRED", "Add at least one director credit"],
    ["DIRECTOR_UNPUBLISHED", "Publish the director's person record first"],
    ["WATCH_SOURCE_REQUIRED", "Add a streaming link or a trailer video"],
    ["INVALID_COUNTRY_CODES", "One of the countries is not a valid ISO code"],
    ["INVALID_LANGUAGE_CODES", "One of the languages is not in the list"],
    ["INVALID_STREAMING_URL", "A streaming link must start with https://"],
    [
      "DURATION_OVER_40_MINUTES",
      "Longer than 40 minutes: check this is a short film",
    ],
    ["SHORT_FILM_PUBLISH_BLOCKED", "This short film cannot be published yet"],
  ])("maps %s to a sentence", (code, expected) => {
    expect(publishIssueMessage(code, t)).toBe(expected)
  })

  it("has a sentence for every code the shared evaluator can return", () => {
    for (const code of SHORT_FILM_ISSUE_CODES) {
      expect(publishIssueMessage(code, t)).not.toBe("Publishing failed")
    }
  })

  it("explains a missing translation target", () => {
    expect(publishIssueMessage(TRANSLATION_TARGET_MISSING, t)).toMatch(
      /no entry in this language/
    )
  })

  it("falls back to a generic sentence for unknown or missing codes", () => {
    expect(publishIssueMessage("SOMETHING_NEW", t)).toBe("Publishing failed")
    expect(publishIssueMessage(undefined, t)).toBe("Publishing failed")
  })

  it("looks the sentence up under publish.issue.<CODE>", () => {
    const seen: string[] = []
    publishIssueMessage("POSTER_REQUIRED", (id, fallback) => {
      seen.push(id)
      return fallback
    })

    expect(seen).toEqual(["publish.issue.POSTER_REQUIRED"])
  })
})

describe("publishErrorMessages", () => {
  it("lists one sentence per coded issue, de-duplicated", () => {
    const messages = publishErrorMessages(
      {
        code: "SHORT_FILM_PUBLISH_BLOCKED",
        issues: [
          { code: "POSTER_REQUIRED" },
          { code: "POSTER_REQUIRED" },
          { code: "DIRECTOR_REQUIRED" },
        ],
      },
      t
    )

    expect(messages).toEqual([
      "Add a poster before publishing",
      "Add at least one director credit",
    ])
  })

  it("falls back to the top-level code when there are no issues", () => {
    expect(
      publishErrorMessages({ code: "INVALID_STREAMING_URL", issues: [] }, t)
    ).toEqual(["A streaming link must start with https://"])
  })

  it("never echoes raw server text", () => {
    expect(publishErrorMessages({ issues: [] }, t)).toEqual([
      "Publishing failed",
    ])
  })
})
