/**
 * Unit tests for the short-film import data contract and payload builders
 * (plan 01-10). Pure: no Strapi, no network.
 *
 * Besides behaviour, these tests assert the thing the DW-13 seed bug needed:
 * every key written to Strapi exists on the real schema JSON, so a phantom field
 * fails the gate instead of being dropped silently.
 */
import type { ShortFilmSeedEntry } from "./short-film-import"

import videoComponent from "../../../src/components/common/video.json"
import castComponent from "../../../src/components/creative-works/cast.json"
import creditComponent from "../../../src/components/creative-works/credit.json"
import distinctionComponent from "../../../src/components/creative-works/distinction.json"
import streamingLinkComponent from "../../../src/components/creative-works/streaming-link.json"
import creativeWorkSchema from "../../../src/plugins/creative-works/server/src/content-types/creative-work/schema.json"
import sampleFile from "../shorts/__fixtures__/short-films.sample.json"
import {
  buildLocalizedData,
  buildShortFilmData,
  collectAiDraftedFields,
  hasArabicIndicDigits,
  listSeedFileIssues,
  mapCountryNames,
  payloadDiffers,
  resolveArabicTitle,
  shortFilmSeedEntrySchema,
  shortFilmSeedFileSchema,
  stripHtml,
} from "./short-film-import"

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const ids = {
  genres: { drame: "g-drame", comedie: "g-comedie" },
  persons: {
    "sample-director-one": "p-dir",
    "sample-writer-one": "p-wri",
    "sample-actor-one": "p-act",
  },
  creditRoles: { director: "r-dir", screenwriter: "r-wri" },
  posterId: 11,
  backdropId: 12,
}

const sampleOne = (): ShortFilmSeedEntry =>
  shortFilmSeedEntrySchema.parse(clone(sampleFile.films[0]))
const sampleTwo = (): ShortFilmSeedEntry =>
  shortFilmSeedEntrySchema.parse(clone(sampleFile.films[1]))

function issuesFor(mutate: (file: any) => void) {
  const file: any = clone(sampleFile)
  mutate(file)
  return listSeedFileIssues(file).map(({ path, code }) => ({ path, code }))
}

describe("shortFilmSeedFileSchema", () => {
  it("parses the sample file", () => {
    const result = shortFilmSeedFileSchema.safeParse(sampleFile)
    expect(result.success).toBe(true)
  })

  it.each([
    [
      "an unknown genre",
      (f: any) => (f.films[0].genres = ["not-a-genre"]),
      { path: "films.0.genres.0", code: "UNKNOWN_GENRE" },
    ],
    [
      "an unknown crew roleSlug",
      (f: any) => (f.films[0].crew[0].roleSlug = "not-a-role"),
      { path: "films.0.crew.0.roleSlug", code: "UNKNOWN_CREDIT_ROLE" },
    ],
    [
      "an http streaming URL",
      (f: any) =>
        (f.films[0].streamingLinks[0].url = "http://www.youtube.com/watch?v=x"),
      { path: "films.0.streamingLinks.0.url", code: "INVALID_HTTPS_URL" },
    ],
    [
      "the reserved slug featured",
      (f: any) => (f.films[0].slug = "featured"),
      { path: "films.0.slug", code: "SLUG_RESERVED" },
    ],
    [
      "a non kebab-case slug",
      (f: any) => (f.films[0].slug = "Not Kebab"),
      { path: "films.0.slug", code: "INVALID_SLUG" },
    ],
    [
      "no directors",
      (f: any) => (f.films[0].directors = []),
      { path: "films.0.directors", code: "DIRECTOR_REQUIRED" },
    ],
    [
      "no watch source",
      (f: any) => {
        f.films[0].streamingLinks = []
        f.films[0].videos = []
      },
      { path: "films.0.streamingLinks", code: "WATCH_SOURCE_REQUIRED" },
    ],
    [
      "a lowercase country code",
      (f: any) => (f.films[0].country = ["tn"]),
      { path: "films.0.country", code: "INVALID_COUNTRY_CODES" },
    ],
    [
      "an empty country list",
      (f: any) => (f.films[0].country = []),
      { path: "films.0.country", code: "COUNTRY_REQUIRED" },
    ],
    [
      "an unknown language",
      (f: any) => (f.films[0].language = ["xx"]),
      { path: "films.0.language", code: "INVALID_LANGUAGE_CODES" },
    ],
    [
      "an Arabic synopsis with Arabic-Indic digits",
      (f: any) => (f.films[1].synopsis.ar = "فيلم عام ٢٠٢٣"),
      { path: "films.1.synopsis.ar", code: "ARABIC_INDIC_DIGITS" },
    ],
    [
      "an Arabic title with extended Arabic-Indic digits",
      (f: any) => (f.films[1].title.ar = "فيلم ۲۰۲۳"),
      { path: "films.1.title.ar", code: "ARABIC_INDIC_DIGITS" },
    ],
    [
      "an Arabic originalTitle with Arabic-Indic digits",
      (f: any) => (f.films[0].originalTitle = "مثال ٢"),
      { path: "films.0.originalTitle", code: "ARABIC_INDIC_DIGITS" },
    ],
    [
      "an unknown key on an entry",
      (f: any) => (f.films[0].bogus = true),
      { path: "films.0.bogus", code: "UNKNOWN_KEY" },
    ],
    [
      "a duplicate slug",
      (f: any) => (f.films[1].slug = "sample-one"),
      { path: "films.1.slug", code: "DUPLICATE_SLUG" },
    ],
    [
      "one person slug with two names",
      (f: any) => (f.films[1].directors[0].slug = "sample-director-one"),
      {
        path: "films.1.directors.0.name",
        code: "PERSON_NAME_CONFLICT",
      },
    ],
    [
      "a retired slug that is also an approved film",
      (f: any) => (f.retiredSlugs = ["sample-two"]),
      { path: "retiredSlugs.0", code: "RETIRED_SLUG_IN_FILMS" },
    ],
    [
      "a media host that is a URL",
      (f: any) => (f.mediaHosts = ["https://cdn.example.org/"]),
      { path: "mediaHosts.0", code: "INVALID_MEDIA_HOST" },
    ],
  ])("rejects %s with a path-specific issue", (_name, mutate, expected) => {
    const issues = issuesFor(mutate as (file: any) => void)
    expect(issues).toContainEqual(expected)
  })

  it("accepts a trailer video as the watch source", () => {
    const issues = issuesFor((f) => {
      f.films[1].streamingLinks = []
      f.films[1].videos = [
        { url: "https://vimeo.com/123456789", videoType: "trailer" },
      ]
    })
    expect(issues).toEqual([])
  })
})

describe("listSeedFileIssues", () => {
  it("is empty for a valid file", () => {
    expect(listSeedFileIssues(sampleFile)).toEqual([])
  })

  it("names the slug of the offending film", () => {
    const file: any = clone(sampleFile)
    file.films[1].country = ["tn"]
    expect(listSeedFileIssues(file)).toEqual([
      {
        slug: "sample-two",
        path: "films.1.country",
        code: "INVALID_COUNTRY_CODES",
      },
    ])
  })

  it("reports a file that is not an object", () => {
    expect(listSeedFileIssues("nope").length).toBeGreaterThan(0)
  })
})

describe("buildShortFilmData: write contract", () => {
  it("writes only keys that exist on creative-work/schema.json", () => {
    const data = buildShortFilmData(sampleOne(), ids)
    const schemaKeys = Object.keys(creativeWorkSchema.attributes)
    expect(
      Object.keys(data).filter((key) => !schemaKeys.includes(key))
    ).toEqual([])
  })

  it("writes component entries whose keys exist on the component JSON", () => {
    const data = buildShortFilmData(sampleOne(), ids)
    const cases: Array<[string, Array<Record<string, unknown>>, object]> = [
      ["credits", data.credits, creditComponent.attributes],
      ["cast", data.cast, castComponent.attributes],
      ["distinctions", data.distinctions, distinctionComponent.attributes],
      ["videos", data.videos, videoComponent.attributes],
      [
        "streamingLinks",
        data.streamingLinks,
        streamingLinkComponent.attributes,
      ],
    ]
    for (const [name, entries, attributes] of cases) {
      // The loop asserts nothing on an empty array, so require entries first.
      expect([name, entries.length > 0]).toEqual([name, true])
      for (const entry of entries) {
        expect(Object.keys(attributes)).toEqual(
          expect.arrayContaining(Object.keys(entry))
        )
      }
    }
  })

  it("does not write the distinction sourceUrl (not a schema field)", () => {
    const data = buildShortFilmData(sampleOne(), ids)
    expect(data.distinctions[0]).not.toHaveProperty("sourceUrl")
  })

  it("maps directors to the director role first, then crew, with 1-based billing", () => {
    const data = buildShortFilmData(sampleOne(), ids)
    expect(data.credits).toEqual([
      { person: "p-dir", creditRole: "r-dir", billing: 1 },
      { person: "p-wri", creditRole: "r-wri", billing: 2 },
    ])
    expect(data.cast).toEqual([{ person: "p-act", billing: 1 }])
  })

  it("maps genres to documentIds and keeps the French source fields", () => {
    const data = buildShortFilmData(sampleTwo(), ids)
    expect(data.genres).toEqual(["g-comedie", "g-drame"])
    expect(data.title).toBe("Deuxième exemple")
    expect(data.type).toBe("short-film")
    expect(data.country).toEqual(["TN"])
  })

  it("omits poster and backdrop when no id was resolved", () => {
    const data = buildShortFilmData(sampleTwo(), {
      ...ids,
      posterId: undefined,
      backdropId: undefined,
    })
    expect(data).not.toHaveProperty("poster")
    expect(data).not.toHaveProperty("backdrop")
  })

  it("strips HTML from the French synopsis", () => {
    expect(buildShortFilmData(sampleTwo(), ids).synopsis).toBe(
      "Un exemple sans affiche."
    )
  })

  it("throws a coded error for an unresolved person", () => {
    expect(() =>
      buildShortFilmData(sampleOne(), { ...ids, persons: {} })
    ).toThrow("UNRESOLVED_PERSON")
  })
})

describe("resolveArabicTitle", () => {
  it("uses an Arabic-script originalTitle first", () => {
    expect(resolveArabicTitle(sampleOne())).toBe("مثال أول")
  })

  it("falls back to title.ar when originalTitle is not Arabic script", () => {
    const entry = { ...sampleTwo(), originalTitle: "Second sample" }
    expect(resolveArabicTitle(entry)).toBe("مثال ثان")
  })

  it("is undefined when there is no Arabic title at all", () => {
    const entry = { ...sampleOne(), originalTitle: undefined }
    expect(resolveArabicTitle(entry)).toBeUndefined()
  })
})

describe("buildLocalizedData", () => {
  it("returns exactly title, synopsis and poster for ar", () => {
    const data = buildLocalizedData(sampleTwo(), "ar", 11)
    expect(Object.keys(data).sort()).toEqual(["poster", "synopsis", "title"])
    expect(data).toEqual({
      title: "مثال ثان",
      synopsis: "فيلم قصير تجريبي بدون ملصق.",
      poster: 11,
    })
  })

  it("serves the Arabic originalTitle as the ar title", () => {
    expect(buildLocalizedData(sampleOne(), "ar", 11).title).toBe("مثال أول")
  })

  it("serves title.en and synopsis.en for en, replicating the poster id", () => {
    expect(buildLocalizedData(sampleOne(), "en", 11)).toEqual({
      title: "First sample",
      synopsis: "A sample short film used to test the import.",
      poster: 11,
    })
  })

  it("leaves a missing translation undefined instead of blanking it", () => {
    const data = buildLocalizedData(sampleOne(), "ar", undefined)
    expect(data.synopsis).toBeUndefined()
    expect(data.poster).toBeUndefined()
  })

  it("strips HTML from a translated synopsis", () => {
    const entry = sampleTwo()
    entry.synopsis.en = "<p>Hi <b>there</b></p><script>alert(1)</script>"
    expect(buildLocalizedData(entry, "en", 1).synopsis).toBe("Hi there")
  })
})

describe("stripHtml", () => {
  it("removes tags and keeps the text", () => {
    expect(stripHtml("<p>Hi <b>there</b></p>")).toBe("Hi there")
  })

  it("drops script and style content", () => {
    expect(stripHtml("a<script>alert(1)</script>b<style>x{}</style>c")).toBe(
      "abc"
    )
  })

  it("removes an unclosed tag", () => {
    expect(stripHtml('ok <img src=x onerror="alert(1)"')).toBe("ok")
  })

  it("keeps a plain comparison sign", () => {
    expect(stripHtml("5 < 6 and 7 > 6")).toBe("5 < 6 and 7 > 6")
  })

  it("collapses whitespace", () => {
    expect(stripHtml("  a \n\n  b  ")).toBe("a b")
  })
})

describe("hasArabicIndicDigits", () => {
  it("detects Arabic-Indic and extended Arabic-Indic digits", () => {
    expect(hasArabicIndicDigits("عام ٢٠٢٣")).toBe(true)
    expect(hasArabicIndicDigits("عام ۲۰۲۳")).toBe(true)
  })

  it("accepts Western digits and plain text", () => {
    expect(hasArabicIndicDigits("عام 2023")).toBe(false)
    expect(hasArabicIndicDigits("مثال")).toBe(false)
  })
})

describe("collectAiDraftedFields", () => {
  it("lists title and synopsis for an ai-drafted language", () => {
    expect(collectAiDraftedFields(sampleTwo())).toEqual([
      { slug: "sample-two", locale: "ar", fields: ["title", "synopsis"] },
      { slug: "sample-two", locale: "en", fields: ["title", "synopsis"] },
    ])
  })

  it("does not list an owner-reviewed language or an original-title ar title", () => {
    expect(collectAiDraftedFields(sampleOne())).toEqual([])
  })

  it("still lists an ar synopsis whose provenance only covers the title", () => {
    const entry = sampleOne()
    entry.synopsis.ar = "ملخص"
    expect(collectAiDraftedFields(entry)).toEqual([
      { slug: "sample-one", locale: "ar", fields: ["synopsis"] },
    ])
  })

  it("lists nothing for a field that is absent", () => {
    const entry = sampleTwo()
    delete entry.synopsis.en
    delete entry.title.en
    expect(
      collectAiDraftedFields(entry).filter((item) => item.locale === "en")
    ).toEqual([])
  })
})

describe("mapCountryNames", () => {
  it("maps the mock free-text values to ISO codes", () => {
    expect(mapCountryNames("Tunisie / France")).toEqual(["TN", "FR"])
    expect(mapCountryNames("Tunisie / Canada / Qatar")).toEqual([
      "TN",
      "CA",
      "QA",
    ])
  })

  it("handles accents, case, English names and separators", () => {
    expect(mapCountryNames("tunisie, Égypte")).toEqual(["TN", "EG"])
    expect(mapCountryNames("États-Unis et Royaume-Uni")).toEqual(["US", "GB"])
    expect(mapCountryNames("Tunisia / Algeria")).toEqual(["TN", "DZ"])
  })

  it("lists a country once", () => {
    expect(mapCountryNames("Tunisie / Tunisie")).toEqual(["TN"])
  })

  it("throws a coded error for an unknown name", () => {
    expect(() => mapCountryNames("Tunisie / Atlantide")).toThrow(
      "UNKNOWN_COUNTRY_NAME: Atlantide"
    )
  })
})

describe("payloadDiffers", () => {
  it("is false for the same data in a different key order", () => {
    const a = buildShortFilmData(sampleOne(), ids)
    const reordered = Object.fromEntries(Object.entries(a).reverse())
    expect(payloadDiffers(a, reordered)).toBe(false)
  })

  it("is true when one credit changes", () => {
    const a = buildShortFilmData(sampleOne(), ids)
    const b = clone(a)
    b.credits[1].person = "p-other"
    expect(payloadDiffers(a, b)).toBe(true)
  })

  it("keeps component order significant", () => {
    const a = buildShortFilmData(sampleOne(), ids)
    const b = { ...a, credits: [...a.credits].reverse() }
    expect(payloadDiffers(a, b)).toBe(true)
  })

  it("is false for a populated Document Service row of the same film", () => {
    const next = buildShortFilmData(sampleOne(), ids)
    const existing = {
      id: 7,
      documentId: "doc-1",
      locale: "fr",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      publishedAt: null,
      ...clone(next),
      genres: [{ id: 1, documentId: "g-drame", name: "Drame", slug: "drame" }],
      credits: next.credits.map((credit, index) => ({
        id: index + 1,
        customRole: null,
        billing: credit.billing,
        person: { id: 9, documentId: credit.person, name: "x" },
        creditRole: { id: 3, documentId: credit.creditRole, slug: "x" },
      })),
      cast: next.cast.map((member) => ({
        id: 1,
        billing: member.billing,
        person: { id: 9, documentId: member.person, name: "x" },
      })),
      distinctions: next.distinctions.map((d) => ({ id: 1, ...d })),
      videos: next.videos.map((v) => ({ id: 1, type: "TEASER", ...v })),
      streamingLinks: next.streamingLinks.map((l) => ({ id: 1, ...l })),
      poster: { id: 11, documentId: "file-doc", url: "/uploads/x.png" },
      backdrop: { id: 12, documentId: "file-doc-2", url: "/uploads/y.png" },
    }
    expect(payloadDiffers(existing, next)).toBe(false)
  })

  it("compares media by upload id", () => {
    const next = buildShortFilmData(sampleOne(), ids)
    const existing = { ...clone(next), poster: { id: 99, documentId: "d" } }
    expect(payloadDiffers(existing, next)).toBe(true)
  })

  it("only compares keys present in next (a hand-added poster survives)", () => {
    const next = buildShortFilmData(sampleTwo(), {
      ...ids,
      posterId: undefined,
    })
    const existing = { ...clone(next), poster: { id: 5, documentId: "d" } }
    expect(payloadDiffers(existing, next)).toBe(false)
  })

  it("treats null and a missing value as equal", () => {
    expect(payloadDiffers({ a: null, b: [{ x: null }] }, { b: [{}] })).toBe(
      false
    )
  })

  it("detects a changed scalar", () => {
    const a = buildShortFilmData(sampleOne(), ids)
    expect(payloadDiffers(a, { ...a, duration: 13 })).toBe(true)
  })
})
