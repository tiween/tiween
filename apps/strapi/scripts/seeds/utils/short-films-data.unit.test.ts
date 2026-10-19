/**
 * Data-quality gate for the real launch catalog, `data/short-films.json`
 * (plan 01-11, SDATA-04, D-15/D-16).
 *
 * The importer's own tests prove the contract against a fixture; this suite
 * proves the committed catalog file itself. It deliberately does NOT assert
 * `approved` either way: plan 01-11 and 01-12 write every entry unapproved and
 * plan 01-13 flips the owner-approved ones, so the gate must hold in both
 * states.
 */
import shortFilmsData from "../data/short-films.json"
import { DEFAULT_MEDIA_HOSTS } from "./media-upload"
import {
  hasArabicIndicDigits,
  listSeedFileIssues,
  shortFilmSeedFileSchema,
} from "./short-film-import"

const file = shortFilmSeedFileSchema.parse(shortFilmsData)

/** The five fake dev shorts removed from creative-works.json in plan 01-06. */
const FAKE_DEV_SLUGS = [
  "fragments-tunis",
  "derniere-vague",
  "souvenirs-medina",
  "cafe-nocturne",
  "generation-z",
]

/** Organisation words that must never stand in for a director (D-23). */
const ORGANISATION_WORDS =
  /\b(prod|productions?|films?|studios?|collectif|collective|channel)\b/i

/** Hosts a streaming link of each platform may point at. */
const PLATFORM_HOSTS: Record<string, string[]> = {
  youtube: ["www.youtube.com", "youtube.com", "youtu.be"],
  vimeo: ["vimeo.com", "www.vimeo.com"],
  artify: ["artify.tn", "www.artify.tn"],
}

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase()
}

describe("data/short-films.json", () => {
  it("passes the importer schema with no coded issue", () => {
    expect(listSeedFileIssues(shortFilmsData)).toEqual([])
  })

  it("retires exactly the five fake dev shorts", () => {
    expect([...file.retiredSlugs].sort()).toEqual([...FAKE_DEV_SLUGS].sort())
  })

  it("has unique slugs, none of them retired", () => {
    const slugs = file.films.map((film) => film.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(file.retiredSlugs).not.toContain(slug)
    }
  })

  it("cites at least one https source for every film", () => {
    for (const film of file.films) {
      expect(film.sources.length).toBeGreaterThan(0)
      for (const source of film.sources) {
        expect(source.startsWith("https://")).toBe(true)
      }
    }
  })

  it("keeps every film within the D-16 duration limit (45 minutes at most)", () => {
    for (const film of file.films) {
      if (film.duration !== undefined) {
        expect(film.duration).toBeLessThanOrEqual(45)
      }
      if (film.duration !== undefined) {
        expect(film.eligibility.under40Minutes).toBe(film.duration <= 40)
      }
    }
  })

  it("requires a streaming link for official-online availability (D-16)", () => {
    for (const film of file.films) {
      if (film.eligibility.availability === "official-online") {
        expect(film.streamingLinks.length).toBeGreaterThan(0)
      }
    }
  })

  it("requires a distinction and a trailer for festival-trailer-only films (D-16)", () => {
    for (const film of file.films) {
      if (film.eligibility.availability === "festival-trailer-only") {
        expect(film.distinctions.length).toBeGreaterThan(0)
        expect(film.videos.some((video) => video.videoType === "trailer")).toBe(
          true
        )
        expect(film.streamingLinks).toEqual([])
      }
    }
  })

  it("sources every distinction with an https URL", () => {
    for (const film of file.films) {
      for (const distinction of film.distinctions) {
        expect(distinction.sourceUrl.startsWith("https://")).toBe(true)
      }
    }
  })

  it("never credits an organisation as director", () => {
    for (const film of file.films) {
      for (const director of film.directors) {
        expect(director.name).not.toMatch(ORGANISATION_WORDS)
        expect(director.name.trim().split(/\s+/).length).toBeGreaterThan(1)
      }
    }
  })

  it("points each streaming link at the host of its platform", () => {
    for (const film of file.films) {
      for (const link of film.streamingLinks) {
        const hosts = PLATFORM_HOSTS[link.platform]
        if (hosts) expect(hosts).toContain(hostOf(link.url))
      }
    }
  })

  it("keeps Western digits in every Arabic field", () => {
    for (const film of file.films) {
      const arabicFields = [
        film.title.ar,
        film.synopsis.ar,
        film.originalTitle,
      ].filter((value): value is string => value !== undefined)
      for (const text of arabicFields) {
        expect(hasArabicIndicDigits(text)).toBe(false)
      }
    }
  })

  it("only downloads images from default or declared media hosts", () => {
    const allowed = new Set([...DEFAULT_MEDIA_HOSTS, ...file.mediaHosts])
    for (const film of file.films) {
      for (const image of [film.poster, film.backdrop]) {
        if (image) expect(allowed.has(hostOf(image.sourceUrl))).toBe(true)
      }
    }
  })

  it("backs an original-title provenance with an Arabic-script originalTitle (D-13)", () => {
    for (const film of file.films) {
      if (film.translationProvenance.ar === "original-title") {
        expect(film.originalTitle).toMatch(/[\u0600-\u06FF]/)
        expect(film.originalTitle).not.toMatch(/[A-Za-z]/)
      }
    }
  })
})
