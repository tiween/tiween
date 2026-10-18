/**
 * Pure projection and locale-overlay helpers of the public short-film service
 * (SDATA-03): allowlist projections, pg numeric coercion, derived fields, and
 * the French-fallback overlay that must never touch relations or pagination.
 */
import {
  overlayGenreNames,
  overlayLocalizedFields,
  toPublicMedia,
  toShortFilmDetail,
  toShortFilmSummary,
} from "../short-films"

const person = (slug: string) => ({
  documentId: `doc-${slug}`,
  slug,
  name: `Name ${slug}`,
  id: 99,
  createdAt: "2026-01-01",
})

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  documentId: "doc-alpha",
  slug: "sf-alpha",
  locale: "fr",
  title: "alpha",
  originalTitle: null,
  synopsis: "Synopsis fr",
  duration: "12",
  releaseYear: 2019,
  country: ["TN"],
  language: ["aeb"],
  featured: true,
  featuredRank: "2",
  publishedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  createdBy: { id: 1 },
  externalIds: { imdb: "tt1" },
  theatreDetails: { x: 1 },
  poster: null,
  backdrop: null,
  genres: [{ id: 3, documentId: "g-drame", slug: "drame", name: "Drame" }],
  credits: [
    {
      id: 1,
      billing: 1,
      person: person("p1"),
      creditRole: { slug: "director", department: "directing" },
    },
    {
      id: 2,
      billing: 2,
      person: person("p2"),
      creditRole: { slug: "screenwriter", department: "writing" },
    },
  ],
  streamingLinks: [],
  videos: [],
  distinctions: [],
  ...overrides,
})

describe("toPublicMedia", () => {
  it("keeps the public fields and trims every format to url, width, height", () => {
    const media = toPublicMedia({
      id: 5,
      documentId: "f1",
      name: "poster.jpg",
      hash: "poster_abc",
      ext: ".jpg",
      provider: "local",
      folderPath: "/1",
      provider_metadata: { public_id: "secret" },
      url: "/uploads/poster.jpg",
      alternativeText: "Affiche",
      width: "800",
      height: 1200,
      mime: "image/jpeg",
      formats: {
        thumbnail: {
          hash: "thumb_abc",
          provider_metadata: { public_id: "secret-thumb" },
          url: "/uploads/thumb.jpg",
          width: 104,
          height: 156,
        },
      },
    })

    expect(media).toEqual({
      url: "/uploads/poster.jpg",
      alternativeText: "Affiche",
      width: 800,
      height: 1200,
      mime: "image/jpeg",
      formats: {
        thumbnail: { url: "/uploads/thumb.jpg", width: 104, height: 156 },
      },
    })
  })

  it("returns null for a missing file", () => {
    expect(toPublicMedia(null)).toBeNull()
    expect(toPublicMedia(undefined)).toBeNull()
  })
})

describe("toShortFilmSummary", () => {
  it("builds a new object with exactly the summary keys and no internals", () => {
    const summary = toShortFilmSummary(baseRow())

    expect(Object.keys(summary).sort()).toEqual([
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
    ])
    expect(JSON.stringify(summary)).not.toMatch(
      /createdBy|externalIds|theatreDetails|createdAt|updatedAt|"id"/
    )
  })

  it("coerces pg string numerics to numbers", () => {
    const summary = toShortFilmSummary(baseRow())

    expect(summary.duration).toBe(12)
    expect(summary.featuredRank).toBe(2)
  })

  it("derives directors only from credits whose role slug is director", () => {
    const summary = toShortFilmSummary(baseRow())

    expect(summary.directors).toEqual([
      { documentId: "doc-p1", slug: "p1", name: "Name p1" },
    ])
  })

  it("derives availableOnline and hasAwards with the shared helpers", () => {
    const none = toShortFilmSummary(baseRow())
    expect(none.availableOnline).toBe(false)
    expect(none.hasAwards).toBe(false)

    const full = toShortFilmSummary(
      baseRow({
        streamingLinks: [
          {
            platform: "youtube",
            url: "https://www.youtube.com/watch?v=x",
            accessType: "free",
          },
        ],
        distinctions: [{ name: "x", year: 2019, result: "winner" }],
      })
    )
    expect(full.availableOnline).toBe(true)
    expect(full.hasAwards).toBe(true)

    const trailerOnly = toShortFilmSummary(
      baseRow({ videos: [{ url: "u", videoType: "trailer" }] })
    )
    expect(trailerOnly.availableOnline).toBe(false)
  })

  it("does not count a non-https streaming link as available online", () => {
    const summary = toShortFilmSummary(
      baseRow({
        streamingLinks: [
          { platform: "other", url: "javascript:void(0)", accessType: "free" },
          { platform: "other", url: "http://example.org", accessType: "free" },
        ],
      })
    )
    expect(summary.availableOnline).toBe(false)
  })
})

describe("toShortFilmDetail: streaming links", () => {
  it("drops every streaming link whose URL is not https", () => {
    const detail = toShortFilmDetail(
      baseRow({
        streamingLinks: [
          { platform: "other", url: "javascript:void(0)", accessType: "free" },
          { platform: "other", url: "data:text/html,x", accessType: "free" },
          { platform: "other", url: "http://example.org", accessType: "free" },
          {
            platform: "vimeo",
            url: "https://vimeo.com/1",
            accessType: "free",
            label: null,
          },
        ],
      })
    )

    expect(detail.streamingLinks).toEqual([
      {
        platform: "vimeo",
        url: "https://vimeo.com/1",
        accessType: "free",
        label: null,
      },
    ])
  })
})

describe("toShortFilmDetail", () => {
  it("coerces the pg decimal rating from a string", () => {
    expect(toShortFilmDetail(baseRow({ rating: "7.5" })).rating).toBe(7.5)
  })

  it("returns credits by role slug and drops a credit with no published person", () => {
    const detail = toShortFilmDetail(
      baseRow({
        credits: [
          {
            billing: 2,
            person: null,
            creditRole: { slug: "director", department: "directing" },
          },
          {
            billing: 1,
            person: person("p1"),
            creditRole: { slug: "director", department: "directing" },
            customRole: null,
          },
        ],
      })
    )

    expect(detail.credits).toEqual([
      {
        person: { documentId: "doc-p1", slug: "p1", name: "Name p1" },
        creditRole: { slug: "director", department: "directing" },
        customRole: null,
        billing: 1,
      },
    ])
  })
})

describe("overlayLocalizedFields", () => {
  const base = () => [
    toShortFilmSummary(
      baseRow({
        poster: { url: "/uploads/fr.jpg", width: 1, height: 2, mime: "i/j" },
      })
    ),
  ]

  it("replaces title and synopsis and sets the locale when the translation has a title", () => {
    const [item] = overlayLocalizedFields(
      base(),
      [{ documentId: "doc-alpha", title: "ألفا", synopsis: "ملخص" }],
      "ar"
    )

    expect(item.title).toBe("ألفا")
    expect(item.synopsis).toBe("ملخص")
    expect(item.locale).toBe("ar")
  })

  it.each([
    ["an empty title", { documentId: "doc-alpha", title: "", synopsis: "x" }],
    ["a blank title", { documentId: "doc-alpha", title: "  ", synopsis: "x" }],
    ["a missing title", { documentId: "doc-alpha", synopsis: "x" }],
    ["no localized row", { documentId: "other", title: "autre" }],
  ])("keeps the base title and locale for %s", (_label, row) => {
    const [item] = overlayLocalizedFields(base(), [row], "ar")

    expect(item.title).toBe("alpha")
    expect(item.synopsis).toBe("Synopsis fr")
    expect(item.locale).toBe("fr")
  })

  it("keeps the base synopsis when the translation has none", () => {
    const [item] = overlayLocalizedFields(
      base(),
      [{ documentId: "doc-alpha", title: "ألفا", synopsis: null }],
      "ar"
    )

    expect(item.title).toBe("ألفا")
    expect(item.synopsis).toBe("Synopsis fr")
  })

  it("replaces the poster only when the localized row has one", () => {
    const withPoster = overlayLocalizedFields(
      base(),
      [
        {
          documentId: "doc-alpha",
          title: "ألفا",
          poster: { url: "/uploads/ar.jpg", hash: "h", provider_metadata: {} },
        },
      ],
      "ar"
    )
    expect(withPoster[0].poster?.url).toBe("/uploads/ar.jpg")
    expect(withPoster[0].poster).not.toHaveProperty("hash")

    const withoutPoster = overlayLocalizedFields(
      base(),
      [{ documentId: "doc-alpha", title: "ألفا", poster: null }],
      "ar"
    )
    expect(withoutPoster[0].poster?.url).toBe("/uploads/fr.jpg")
  })

  it("never changes relations or derived fields", () => {
    const [before] = base()
    const [after] = overlayLocalizedFields(
      base(),
      [{ documentId: "doc-alpha", title: "ألفا", genres: [], credits: [] }],
      "ar"
    )

    expect(after.genres).toEqual(before.genres)
    expect(after.directors).toEqual(before.directors)
    expect(after.documentId).toBe(before.documentId)
  })

  it("does not mutate its inputs", () => {
    const items = base()
    const snapshot = JSON.stringify(items)

    overlayLocalizedFields(
      items,
      [{ documentId: "doc-alpha", title: "ألفا" }],
      "ar"
    )

    expect(JSON.stringify(items)).toBe(snapshot)
  })
})

describe("overlayGenreNames", () => {
  it("replaces names that exist in the requested locale and keeps the rest", () => {
    const items = [
      toShortFilmSummary(
        baseRow({
          genres: [
            { documentId: "g-drame", slug: "drame", name: "Drame" },
            { documentId: "g-comedie", slug: "comedie", name: "Comedie" },
          ],
        })
      ),
    ]

    const [item] = overlayGenreNames(items, [
      { documentId: "g-drame", name: "دراما" },
      { documentId: "g-comedie", name: "" },
    ])

    expect(item.genres).toEqual([
      { documentId: "g-drame", slug: "drame", name: "دراما" },
      { documentId: "g-comedie", slug: "comedie", name: "Comedie" },
    ])
  })
})
