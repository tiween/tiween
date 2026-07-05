import { describe, expect, it } from "vitest"

import type { StrapiEvent } from "../types/strapi.types"

import {
  getEventPosterUrl,
  getEventStartDate,
  getEventVenueName,
  getMinEventPrice,
  mapEventCategoryLabel,
  toEventCardEvent,
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
})
