import { describe, expect, it } from "vitest"

import type { StrapiCreativeWork, StrapiEvent } from "../types/strapi.types"

import {
  deriveScreeningFormats,
  getEventPosterUrl,
  getEventStartDate,
  getEventVenueName,
  getMinEventPrice,
  mapEventCategoryLabel,
  toEventCardEvent,
  toEventDetail,
  toFilmHeroEvent,
} from "./eventMappers"

/** Minimal real-schema cinema event; override per test. */
function makeEvent(partial: Partial<StrapiEvent> = {}): StrapiEvent {
  return {
    id: 1,
    documentId: "evt-1",
    title: "Le Voyage",
    slug: "le-voyage",
    category: "movie_screening",
    startDateTime: "2026-07-06T18:30:00.000Z",
    eventStatus: "scheduled",
    featured: false,
    venue: { id: 10, documentId: "ven-1", name: "Le Rio", slug: "le-rio" },
    screenings: [
      { id: 100, price: 12, ticketsAvailable: 40, ticketsSold: 60 },
      { id: 101, price: 9, ticketsAvailable: 0, ticketsSold: 120 },
    ],
    images: [
      {
        url: "/uploads/poster.jpg",
        formats: {
          medium: { url: "/uploads/poster_medium.jpg" },
          large: { url: "/uploads/poster_large.jpg" },
        },
      },
    ],
    ...partial,
  }
}

describe("mapEventCategoryLabel", () => {
  it("maps the real category enum to a display label", () => {
    expect(mapEventCategoryLabel(makeEvent())).toBe("Cinéma")
    expect(
      mapEventCategoryLabel(makeEvent({ category: "theater_performance" }))
    ).toBe("Théâtre")
    expect(mapEventCategoryLabel(makeEvent({ category: "concert" }))).toBe(
      "Musique"
    )
  })

  it("falls back to the legacy creativeWork type when category is absent", () => {
    const event = makeEvent({
      category: undefined,
      creativeWork: {
        id: 5,
        documentId: "cw-1",
        title: "X",
        slug: "x",
        type: "play",
      },
    })
    expect(mapEventCategoryLabel(event)).toBe("Théâtre")
  })
})

describe("getEventStartDate", () => {
  it("prefers startDateTime and falls back to legacy startDate", () => {
    expect(getEventStartDate(makeEvent())).toBe("2026-07-06T18:30:00.000Z")
    expect(
      getEventStartDate(
        makeEvent({ startDateTime: undefined, startDate: "2026-01-01" })
      )
    ).toBe("2026-01-01")
    expect(getEventStartDate(makeEvent({ startDateTime: undefined }))).toBe("")
  })
})

describe("getMinEventPrice", () => {
  it("returns the lowest screening price", () => {
    expect(getMinEventPrice(makeEvent())).toBe(9)
  })

  it("returns undefined when there are no priced screenings", () => {
    expect(getMinEventPrice(makeEvent({ screenings: [] }))).toBeUndefined()
    expect(
      getMinEventPrice(makeEvent({ screenings: undefined }))
    ).toBeUndefined()
  })

  it("reads legacy showtimes when screenings are absent", () => {
    const event = makeEvent({
      screenings: undefined,
      showtimes: [
        {
          id: 1,
          documentId: "s1",
          time: "18:00",
          price: 15,
          ticketsAvailable: 5,
          ticketsSold: 1,
        },
      ],
    })
    expect(getMinEventPrice(event)).toBe(15)
  })
})

describe("getEventPosterUrl", () => {
  it("uses the event image (medium format preferred)", () => {
    expect(getEventPosterUrl(makeEvent())).toBe("/uploads/poster_medium.jpg")
  })

  it("falls back to the raw url when no medium format exists", () => {
    const event = makeEvent({
      images: [{ url: "/uploads/only.jpg" }],
    })
    expect(getEventPosterUrl(event)).toBe("/uploads/only.jpg")
  })

  it("returns undefined when the event has no images", () => {
    expect(getEventPosterUrl(makeEvent({ images: [] }))).toBeUndefined()
  })
})

describe("getEventVenueName", () => {
  it("returns the venue name, or empty string when absent", () => {
    expect(getEventVenueName(makeEvent())).toBe("Le Rio")
    expect(getEventVenueName(makeEvent({ venue: undefined }))).toBe("")
  })
})

describe("toEventCardEvent", () => {
  it("maps a fully-populated event to the card shape", () => {
    expect(toEventCardEvent(makeEvent())).toEqual({
      id: "evt-1",
      title: "Le Voyage",
      posterUrl: "/uploads/poster_medium.jpg",
      category: "Cinéma",
      venueName: "Le Rio",
      date: "2026-07-06T18:30:00.000Z",
      price: 9,
      currency: "TND",
    })
  })

  it("degrades gracefully for a sparse event (no venue/screenings/images)", () => {
    const sparse = makeEvent({
      venue: undefined,
      screenings: [],
      images: [],
    })
    const card = toEventCardEvent(sparse)
    expect(card.venueName).toBe("")
    expect(card.posterUrl).toBeUndefined()
    expect(card.price).toBeUndefined()
    expect(card.title).toBe("Le Voyage")
  })
})

describe("toFilmHeroEvent", () => {
  it("maps event-level fields and leaves movie metadata undefined", () => {
    const hero = toFilmHeroEvent(makeEvent())
    expect(hero.title).toBe("Le Voyage")
    expect(hero.category).toBe("Cinéma")
    expect(hero.backdropUrl).toBe("/uploads/poster_large.jpg")
    expect(hero.venueCount).toBe(1)
    // No creativeWork populated by the browse endpoint.
    expect(hero.genres).toBeUndefined()
    expect(hero.rating).toBeUndefined()
  })

  it("has no venueCount when the venue is absent", () => {
    expect(
      toFilmHeroEvent(makeEvent({ venue: undefined })).venueCount
    ).toBeUndefined()
  })

  it("reads movie metadata from the real screenings[0].movie", () => {
    const hero = toFilmHeroEvent(makeDetailEvent())
    expect(hero.title).toBe("Inception")
    expect(hero.genres).toEqual(["Sci-Fi", "Action"])
    expect(hero.rating).toBe(8.8)
    expect(hero.duration).toBe(148)
    expect(hero.year).toBe(2010)
    expect(hero.backdropUrl).toBe("/uploads/b.jpg")
  })
})

// ---------------------------------------------------------------------------
// Event detail mapping (Story 3.7)
// ---------------------------------------------------------------------------

const MOVIE: StrapiCreativeWork = {
  id: 5,
  documentId: "cw-1",
  title: "Inception",
  originalTitle: "Inception (VO)",
  slug: "inception",
  type: "film",
  synopsis: "<p>A dream heist.</p>",
  duration: 148,
  releaseYear: 2010,
  rating: 8.8,
  ageRating: "PG12",
  poster: {
    url: "/uploads/p.jpg",
    formats: {
      medium: { url: "/uploads/p_m.jpg" },
      large: { url: "/uploads/p_l.jpg" },
    },
  },
  backdrop: { url: "/uploads/b.jpg" },
  genres: [
    { id: 1, name: "Sci-Fi", slug: "sci-fi" },
    { id: 2, name: "Action", slug: "action" },
  ],
  videos: [
    { url: "https://videos/clip", videoType: "clip" },
    { url: "https://videos/trailer", videoType: "trailer" },
  ],
  cast: [
    {
      person: {
        id: 20,
        name: "Leonardo",
        slug: "leo",
        photo: { url: "/leo.jpg" },
      },
      character: { id: 1, name: "Cobb", slug: "cobb" },
      billing: 1,
    },
    { person: { id: 21, name: "Ellen", slug: "ellen" }, billing: 3 },
    { person: { id: 22, name: "Tom", slug: "tom" }, billing: 2 },
  ],
  credits: [
    {
      person: { id: 30, name: "Christopher Nolan", slug: "nolan" },
      creditRole: {
        name: "Director",
        slug: "director",
        department: "directing",
      },
      billing: 1,
    },
    {
      person: { id: 31, name: "Writer Bob", slug: "bob" },
      creditRole: { name: "Writer", slug: "writer", department: "writing" },
    },
  ],
}

/** A deep-populated cinema detail event (real 3.7 `DETAIL_POPULATE` shape). */
function makeDetailEvent(partial: Partial<StrapiEvent> = {}): StrapiEvent {
  return makeEvent({
    description: "Event blurb",
    venue: {
      id: 10,
      documentId: "ven-1",
      name: "Le Rio",
      slug: "le-rio",
      address: "12 Rue de Marseille",
      cityRef: {
        id: 1,
        name: "Tunis",
        slug: "tunis",
        region: { id: 2, name: "Grand Tunis", slug: "grand-tunis" },
      },
    },
    screenings: [
      {
        id: 100,
        documentId: "scr-late",
        startDateTime: "2026-07-06T21:00:00.000Z",
        videoFormat: "threeD",
        subtitleLanguage: "ar",
        price: 14,
        ticketsAvailable: 0,
        ticketsSold: 200,
        movie: MOVIE,
      },
      {
        id: 101,
        documentId: "scr-early",
        startDateTime: "2026-07-06T18:00:00.000Z",
        videoFormat: "standard",
        audioLanguage: "fr",
        price: 12,
        ticketsAvailable: 30,
        ticketsSold: 10,
        movie: MOVIE,
      },
    ],
    ...partial,
  })
}

describe("deriveScreeningFormats", () => {
  it("maps premium video formats to badges", () => {
    expect(deriveScreeningFormats({ videoFormat: "threeD" })).toEqual(["3D"])
    expect(deriveScreeningFormats({ videoFormat: "imax" })).toEqual(["IMAX"])
    expect(deriveScreeningFormats({ videoFormat: "fourDX" })).toEqual(["4DX"])
  })

  it("omits a badge for standard / 70mm / unknown video formats", () => {
    expect(deriveScreeningFormats({ videoFormat: "standard" })).toEqual([])
    expect(deriveScreeningFormats({ videoFormat: "format70mm" })).toEqual([])
    expect(deriveScreeningFormats({})).toEqual([])
  })

  it("derives VOST when subtitles are present", () => {
    expect(
      deriveScreeningFormats({ audioLanguage: "en", subtitleLanguage: "fr" })
    ).toEqual(["VOST"])
  })

  it("derives VF only for a French-dub audio track with no subtitles", () => {
    expect(deriveScreeningFormats({ audioLanguage: "fr" })).toEqual(["VF"])
    expect(deriveScreeningFormats({ audioLanguage: "Français" })).toEqual([
      "VF",
    ])
  })

  it("derives VO for a non-French audio track with no subtitles", () => {
    // Arabic audio is the original version for an Arabic film — never "VF"
    // (Version Française).
    expect(deriveScreeningFormats({ audioLanguage: "en" })).toEqual(["VO"])
    expect(deriveScreeningFormats({ audioLanguage: "Arabic" })).toEqual(["VO"])
  })

  it("combines a premium video format with an audio/subtitle badge", () => {
    expect(
      deriveScreeningFormats({ videoFormat: "threeD", subtitleLanguage: "ar" })
    ).toEqual(["3D", "VOST"])
  })
})

describe("toEventDetail", () => {
  it("maps the real screenings[0].movie into the detail fields", () => {
    const detail = toEventDetail(makeDetailEvent())
    expect(detail.title).toBe("Inception")
    expect(detail.originalTitle).toBe("Inception (VO)")
    expect(detail.synopsis).toBe("A dream heist.")
    expect(detail.genres).toEqual(["Sci-Fi", "Action"])
    expect(detail.rating).toBe(8.8)
    expect(detail.duration).toBe(148)
    expect(detail.year).toBe(2010)
    expect(detail.ageRating).toBe("PG12")
    expect(detail.posterUrl).toBe("/uploads/p_m.jpg")
    expect(detail.backdropUrl).toBe("/uploads/b.jpg")
    expect(detail.currency).toBe("TND")
    expect(detail.minPrice).toBe(12)
  })

  it("extracts the trailer from videos[videoType==='trailer']", () => {
    expect(toEventDetail(makeDetailEvent()).trailerUrl).toBe(
      "https://videos/trailer"
    )
  })

  it("extracts cast from movie.cast[].person ordered by billing, with character role", () => {
    const detail = toEventDetail(makeDetailEvent())
    expect(detail.cast.map((c) => c.name)).toEqual(["Leonardo", "Tom", "Ellen"])
    expect(detail.cast[0]).toEqual({
      name: "Leonardo",
      photoUrl: "/leo.jpg",
      role: "Cobb",
    })
    // No character → no role key.
    expect(detail.cast[1]!.role).toBeUndefined()
  })

  it("extracts directors ONLY from credits with the directing department", () => {
    const detail = toEventDetail(makeDetailEvent())
    expect(detail.directors.map((d) => d.name)).toEqual(["Christopher Nolan"])
    // Writer (writing department) is excluded.
    expect(detail.directors.map((d) => d.name)).not.toContain("Writer Bob")
  })

  it("builds showtimes sorted by startDateTime asc with derived formats + status", () => {
    const detail = toEventDetail(makeDetailEvent())
    expect(detail.showtimes.map((s) => s.id)).toEqual(["scr-early", "scr-late"])
    // Early: standard + fr audio → VF, available.
    expect(detail.showtimes[0]).toMatchObject({
      id: "scr-early",
      formats: ["VF"],
      status: "available",
      price: 12,
    })
    // Late: 3D + ar subtitles → [3D, VOST], sold-out (ticketsAvailable 0).
    expect(detail.showtimes[1]).toMatchObject({
      id: "scr-late",
      formats: ["3D", "VOST"],
      status: "sold-out",
    })
  })

  it("resolves the venue address / city / region", () => {
    expect(toEventDetail(makeDetailEvent()).venue).toEqual({
      name: "Le Rio",
      address: "12 Rue de Marseille",
      city: "Tunis",
      region: "Grand Tunis",
    })
  })

  it("degrades gracefully with no screenings (event-title fallback, empty sections)", () => {
    const detail = toEventDetail(makeDetailEvent({ screenings: [] }))
    expect(detail.title).toBe("Le Voyage") // event.title fallback
    expect(detail.synopsis).toBe("Event blurb") // event.description fallback
    expect(detail.showtimes).toEqual([])
    expect(detail.cast).toEqual([])
    expect(detail.directors).toEqual([])
    expect(detail.genres).toEqual([])
    expect(detail.minPrice).toBeUndefined()
  })

  it("degrades gracefully with a screening but no populated movie", () => {
    const detail = toEventDetail(
      makeDetailEvent({
        screenings: [
          {
            id: 1,
            documentId: "scr-x",
            startDateTime: "2026-07-06T18:00:00.000Z",
            price: 10,
            ticketsAvailable: 5,
          },
        ],
      })
    )
    expect(detail.title).toBe("Le Voyage")
    expect(detail.cast).toEqual([])
    expect(detail.directors).toEqual([])
    expect(detail.trailerUrl).toBeUndefined()
    // The showtime is still produced from the screening.
    expect(detail.showtimes).toHaveLength(1)
    expect(detail.showtimes[0]!.id).toBe("scr-x")
  })

  it("degrades gracefully with no venue (undefined venue block, no throw)", () => {
    expect(
      toEventDetail(makeDetailEvent({ venue: undefined })).venue
    ).toBeUndefined()
  })

  it("does not throw on a fully empty event", () => {
    const bare = {
      id: 1,
      documentId: "evt-bare",
      title: "Bare",
      slug: "bare",
      featured: false,
    } as StrapiEvent
    const detail = toEventDetail(bare)
    expect(detail.title).toBe("Bare")
    expect(detail.showtimes).toEqual([])
    expect(detail.venue).toBeUndefined()
  })
})
