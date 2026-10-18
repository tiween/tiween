/**
 * Public short-film read routes over HTTP, against a real booted Strapi
 * (SDATA-03 / SDATA-05).
 *
 * Anonymous requests only: the routes are `auth: false`. The suite pins the
 * contract Phase 2 and Phase 3 bind to — published-only, flat Strapi v5 shape,
 * strictly allowlisted query, coded errors (never a 500), genre filter, every
 * sort, deterministic ties, page boundaries and empty results.
 *
 * Named `*.service.test.ts`: opt-in integration project only
 * (`yarn workspace @tiween/admin test:integration`), run serially from a
 * rebuilt dist/ (`yarn build:test-dist`).
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import {
  GENRE_SLUGS,
  PUBLISHED_SHORT_SLUGS,
  seedShortFilmFixtures,
  SHORT_FILM_SLUGS,
} from "../../../../../../tests/fixtures/short-films"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
// `setupStrapi()` reads it when called, not when the helper is imported.
process.env.DATABASE_FILENAME = ".tmp/short-films.db"

jest.setTimeout(120000)

const LIST = "/api/creative-works/creative-works/short-films"

const S = SHORT_FILM_SLUGS

const SUMMARY_KEYS = [
  "availableOnline",
  "backdrop",
  "country",
  "directors",
  "documentId",
  "duration",
  "featured",
  "featuredRank",
  "genres",
  "hasAwards",
  "language",
  "locale",
  "originalTitle",
  "poster",
  "publishedAt",
  "releaseYear",
  "slug",
  "synopsis",
  "title",
]

const DETAIL_KEYS = [
  ...SUMMARY_KEYS,
  "ageRating",
  "cast",
  "credits",
  "distinctions",
  "photos",
  "rating",
  "streamingLinks",
  "videos",
].sort()

/** Keys that must never appear at any depth of a public response. */
const FORBIDDEN_KEYS = [
  "provider_metadata",
  "hash",
  "provider",
  "folderPath",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
  "externalIds",
  "theatreDetails",
  "id",
]

let strapi: Core.Strapi

const api = () => request((strapi as any).server.httpServer)

const slugsOf = (res: request.Response): string[] =>
  res.body.data.map((item: { slug: string }) => item.slug)

function collectKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, found)
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.add(key)
      collectKeys(child, found)
    }
  }
  return found
}

beforeAll(async () => {
  strapi = await setupStrapi()
  await seedShortFilmFixtures(strapi)
})

afterAll(async () => {
  await cleanupStrapi()
})

describe("GET short-films list (integration)", () => {
  it("serves the six published shorts and excludes the draft and the film", async () => {
    const res = await api().get(LIST).query({ sort: "publishedAt:asc" })

    expect(res.status).toBe(200)
    expect(slugsOf(res)).toEqual([...PUBLISHED_SHORT_SLUGS])
    expect(slugsOf(res)).not.toContain(S.deltaDraft)
    expect(slugsOf(res)).not.toContain(S.film)
  })

  it("answers the flat Strapi v5 shape with exactly the summary keys", async () => {
    const res = await api().get(LIST)

    expect(res.status).toBe(200)
    for (const item of res.body.data) {
      expect(typeof item.documentId).toBe("string")
      expect(item).not.toHaveProperty("attributes")
      expect(Object.keys(item).sort()).toEqual(SUMMARY_KEYS)
    }
    expect(res.body.meta.pagination).toEqual({
      page: 1,
      pageSize: 24,
      pageCount: 1,
      total: 6,
    })
  })

  it("sorts by publishedAt:desc by default", async () => {
    const res = await api().get(LIST)

    expect(slugsOf(res)).toEqual([
      S.golf,
      S.foxtrot,
      S.echo,
      S.charlie,
      S.bravo,
      S.alpha,
    ])
  })

  it("filters by genre slug", async () => {
    const res = await api().get(LIST).query({ genre: GENRE_SLUGS.drame })

    expect(res.status).toBe(200)
    expect(slugsOf(res)).toEqual([S.foxtrot, S.charlie, S.alpha])
    expect(res.body.meta.pagination.total).toBe(3)
  })

  it("answers 200 with an empty list for an unknown genre", async () => {
    const res = await api().get(LIST).query({ genre: "unknown-genre" })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.pagination.total).toBe(0)
  })

  describe("sorts", () => {
    // Equal keys are ordered by id descending, so bravo and echo (both 2021)
    // resolve to echo then bravo in every releaseYear order.
    const cases: Array<[string, string[]]> = [
      [
        "publishedAt:asc",
        [S.alpha, S.bravo, S.charlie, S.echo, S.foxtrot, S.golf],
      ],
      [
        "publishedAt:desc",
        [S.golf, S.foxtrot, S.echo, S.charlie, S.bravo, S.alpha],
      ],
      [
        "releaseYear:asc",
        [S.golf, S.alpha, S.foxtrot, S.echo, S.bravo, S.charlie],
      ],
      [
        "releaseYear:desc",
        [S.charlie, S.echo, S.bravo, S.foxtrot, S.alpha, S.golf],
      ],
      [
        "duration:asc",
        [S.golf, S.charlie, S.alpha, S.foxtrot, S.bravo, S.echo],
      ],
      [
        "duration:desc",
        [S.echo, S.bravo, S.foxtrot, S.alpha, S.charlie, S.golf],
      ],
      ["title:asc", [S.alpha, S.bravo, S.charlie, S.echo, S.foxtrot, S.golf]],
      ["title:desc", [S.golf, S.foxtrot, S.echo, S.charlie, S.bravo, S.alpha]],
    ]

    it.each(cases)(
      "orders %s as computed from the fixture table",
      async (sort, expected) => {
        const res = await api().get(LIST).query({ sort })

        expect(res.status).toBe(200)
        expect(slugsOf(res)).toEqual(expected)
      }
    )

    it("resolves the releaseYear tie by id descending, identically across requests", async () => {
      const first = await api().get(LIST).query({ sort: "releaseYear:desc" })
      const second = await api().get(LIST).query({ sort: "releaseYear:desc" })

      const order = slugsOf(first)
      expect(order.indexOf(S.echo)).toBeLessThan(order.indexOf(S.bravo))
      expect(slugsOf(second)).toEqual(order)
    })
  })

  describe("pagination", () => {
    it("walks every page of two with no duplicate and no gap", async () => {
      const seen: string[] = []
      for (const page of [1, 2, 3]) {
        const res = await api().get(LIST).query({ pageSize: 2, page })
        expect(res.status).toBe(200)
        expect(res.body.data).toHaveLength(2)
        expect(res.body.meta.pagination).toEqual({
          page,
          pageSize: 2,
          pageCount: 3,
          total: 6,
        })
        seen.push(
          ...res.body.data.map((i: { documentId: string }) => i.documentId)
        )
      }

      expect(new Set(seen).size).toBe(6)
      const all = await api().get(LIST).query({ pageSize: 48 })
      expect(seen).toEqual(
        all.body.data.map((i: { documentId: string }) => i.documentId)
      )
    })

    it("answers 200 with an empty page past the end and the real total", async () => {
      const res = await api().get(LIST).query({ pageSize: 2, page: 4 })

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.meta.pagination.total).toBe(6)
    })
  })

  describe("derived fields and projection", () => {
    it("derives directors, availableOnline and hasAwards", async () => {
      const res = await api().get(LIST)
      const bySlug = Object.fromEntries(
        res.body.data.map((i: { slug: string }) => [i.slug, i])
      )

      expect(bySlug[S.alpha].directors).toEqual([
        expect.objectContaining({ slug: "person-one", name: "Personne Un" }),
      ])
      expect(bySlug[S.alpha].availableOnline).toBe(true)
      expect(bySlug[S.alpha].hasAwards).toBe(true)
      expect(bySlug[S.bravo].hasAwards).toBe(false)
      // golf is published with a trailer only: not available online.
      expect(bySlug[S.golf].availableOnline).toBe(false)
    })

    it("projects media to url, alternativeText, width, height, mime and trimmed formats", async () => {
      const res = await api().get(LIST)
      const alpha = res.body.data.find(
        (i: { slug: string }) => i.slug === S.alpha
      )

      expect(Object.keys(alpha.poster).sort()).toEqual([
        "alternativeText",
        "formats",
        "height",
        "mime",
        "url",
        "width",
      ])
      expect(Object.keys(alpha.poster.formats.thumbnail).sort()).toEqual([
        "height",
        "url",
        "width",
      ])
    })

    it("never exposes internal keys at any depth of the list", async () => {
      const res = await api().get(LIST)
      const keys = collectKeys(res.body)

      for (const forbidden of FORBIDDEN_KEYS) {
        expect(keys.has(forbidden)).toBe(false)
      }
    })
  })

  describe("coded errors", () => {
    it.each([
      ["a facet parameter", { country: "TN" }],
      ["a duration facet", { duration: "10" }],
      ["an unknown key", { q: "alpha" }],
      ["an unlisted sort", { sort: "rating:desc" }],
      ["a pageSize above the cap", { pageSize: 49 }],
      ["page zero", { page: 0 }],
    ])("rejects %s with 400 VALIDATION_FAILED", async (_label, query) => {
      const res = await api().get(LIST).query(query)

      expect(res.status).toBe(400)
      expect(res.body.error.details.code).toBe("VALIDATION_FAILED")
    })

    it("rejects an unsupported locale with 400 UNSUPPORTED_LOCALE", async () => {
      const res = await api().get(LIST).query({ locale: "de" })

      expect(res.status).toBe(400)
      expect(res.body.error.details.code).toBe("UNSUPPORTED_LOCALE")
    })
  })
})

describe("GET short-films/:slug (integration)", () => {
  it("returns the detail of a published short with exactly the detail keys", async () => {
    const res = await api().get(`${LIST}/${S.alpha}`)

    expect(res.status).toBe(200)
    expect(res.body.data.slug).toBe(S.alpha)
    expect(res.body.data).not.toHaveProperty("attributes")
    expect(Object.keys(res.body.data).sort()).toEqual(DETAIL_KEYS)
    expect(Object.keys(res.body)).toEqual(["data"])
  })

  it("carries credits by role slug, streaming links, distinctions and an empty cast", async () => {
    const res = await api().get(`${LIST}/${S.alpha}`)
    const detail = res.body.data

    expect(detail.credits).toEqual([
      {
        person: expect.objectContaining({ slug: "person-one" }),
        creditRole: { slug: "director", department: "directing" },
        customRole: null,
        billing: 1,
      },
    ])
    expect(detail.cast).toEqual([])
    expect(detail.streamingLinks).toEqual([
      {
        platform: "youtube",
        url: expect.stringContaining("youtube.com"),
        accessType: "free",
        label: null,
      },
    ])
    expect(detail.distinctions).toEqual([
      expect.objectContaining({ year: 2019, result: "winner" }),
    ])
    expect(detail.videos).toEqual([])
  })

  it.each([
    ["an unknown slug", "no-such-short"],
    ["the draft-only short", S.deltaDraft],
    ["a non-short work", S.film],
    ["a slug prefix (exact match only)", "sf-alph"],
    ["a different case (exact match only)", "SF-ALPHA"],
  ])("answers 404 SHORT_FILM_NOT_FOUND for %s", async (_label, slug) => {
    const res = await api().get(`${LIST}/${slug}`)

    expect(res.status).toBe(404)
    expect(res.body.error.details.code).toBe("SHORT_FILM_NOT_FOUND")
  })

  it("answers 400 VALIDATION_FAILED for a malformed slug and for extra query keys", async () => {
    const malformed = await api().get(`${LIST}/a%20b`)
    const extra = await api()
      .get(`${LIST}/${S.alpha}`)
      .query({ sort: "title:asc" })

    expect(malformed.status).toBe(400)
    expect(malformed.body.error.details.code).toBe("VALIDATION_FAILED")
    expect(extra.status).toBe(400)
    expect(extra.body.error.details.code).toBe("VALIDATION_FAILED")
  })

  it("never exposes internal keys at any depth of the detail", async () => {
    const res = await api().get(`${LIST}/${S.alpha}`)
    expect(res.status).toBe(200)
    expect(res.body.data.slug).toBe(S.alpha)
    const keys = collectKeys(res.body)

    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys.has(forbidden)).toBe(false)
    }
  })
})
