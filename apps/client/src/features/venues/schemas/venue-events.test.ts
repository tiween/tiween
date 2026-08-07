/**
 * Venue-event schema tests (Story 7.3): the cross-field date rules, the min-1
 * showtime rule, the payload builders' screening-vs-performance narrowing, and
 * the error-code vocabulary staying translatable in all three catalogs.
 */
import { describe, expect, it } from "vitest"

import ar from "../../../../locales/ar.json"
import en from "../../../../locales/en.json"
import fr from "../../../../locales/fr.json"
import {
  emptyShowtimeRow,
  emptyVenueEventFormValues,
  extractVenueEventErrorCode,
  toPreviewStrapiEvent,
  toVenueEventCreatePayload,
  toVenueWorkCreatePayload,
  VENUE_EVENT_ERROR_CODES,
  venueEventFormSchema,
  venueWorkFormSchema,
} from "./venue-events"

function validValues() {
  return {
    ...emptyVenueEventFormValues(),
    title: "Dune",
    startDate: "2026-09-01",
    endDate: "2026-09-03",
    showtimes: [{ ...emptyShowtimeRow(), date: "2026-09-02", time: "20:00" }],
  }
}

function messagesOf(result: ReturnType<typeof venueEventFormSchema.safeParse>) {
  return result.success ? [] : result.error.issues.map((i) => i.message)
}

describe("venueEventFormSchema", () => {
  it("accepts a complete, in-range form", () => {
    expect(venueEventFormSchema.safeParse(validValues()).success).toBe(true)
  })

  it("requires at least one showtime (EVENT_SHOWTIMES_REQUIRED)", () => {
    const result = venueEventFormSchema.safeParse({
      ...validValues(),
      showtimes: [],
    })
    expect(messagesOf(result)).toContain("EVENT_SHOWTIMES_REQUIRED")
  })

  it("rejects an end date before the start date (EVENT_DATES_INVALID)", () => {
    const result = venueEventFormSchema.safeParse({
      ...validValues(),
      endDate: "2026-08-31",
    })
    expect(messagesOf(result)).toContain("EVENT_DATES_INVALID")
  })

  it("rejects a showtime outside the run window (SHOWTIME_OUTSIDE_EVENT_RANGE)", () => {
    const result = venueEventFormSchema.safeParse({
      ...validValues(),
      showtimes: [{ ...emptyShowtimeRow(), date: "2026-09-10", time: "20:00" }],
    })
    expect(messagesOf(result)).toContain("SHOWTIME_OUTSIDE_EVENT_RANGE")
  })

  it("bounds a no-end-date event to its start day", () => {
    const result = venueEventFormSchema.safeParse({
      ...validValues(),
      endDate: "",
      showtimes: [{ ...emptyShowtimeRow(), date: "2026-09-02", time: "20:00" }],
    })
    expect(messagesOf(result)).toContain("SHOWTIME_OUTSIDE_EVENT_RANGE")
  })

  it("rejects a malformed showtime time (SHOWTIME_START_INVALID)", () => {
    const result = venueEventFormSchema.safeParse({
      ...validValues(),
      showtimes: [{ ...emptyShowtimeRow(), date: "2026-09-02", time: "25:99" }],
    })
    expect(messagesOf(result)).toContain("SHOWTIME_START_INVALID")
  })

  it("requires a title (EVENT_TITLE_REQUIRED)", () => {
    const result = venueEventFormSchema.safeParse({
      ...validValues(),
      title: "",
    })
    expect(messagesOf(result)).toContain("EVENT_TITLE_REQUIRED")
  })
})

describe("toVenueEventCreatePayload", () => {
  const WORK_FILM = { documentId: "work-1", type: "film" as const }
  const WORK_PLAY = { documentId: "work-2", type: "play" as const }

  it("builds the FULL payload with screening fields for a film", () => {
    const values = {
      ...validValues(),
      featured: true,
      showtimes: [
        {
          date: "2026-09-02",
          time: "20:00",
          videoFormat: "imax" as const,
          audioLanguage: "fr",
          subtitleLanguage: "ar",
          surtitleLanguage: "should-be-dropped",
        },
      ],
    }

    const payload = toVenueEventCreatePayload(values, WORK_FILM, {
      imageIds: [7],
    })

    expect(payload.creativeWorkId).toBe("work-1")
    expect(payload.title).toBe("Dune")
    expect(payload.featured).toBe(true)
    expect(payload.imageIds).toEqual([7])
    expect(payload.startDateTime).toBeTruthy()
    expect(payload.endDateTime).toBeTruthy()
    expect(payload.showtimes).toHaveLength(1)
    const showtime = payload.showtimes[0]!
    expect(showtime.videoFormat).toBe("imax")
    expect(showtime.subtitleLanguage).toBe("ar")
    expect(showtime.audioLanguage).toBe("fr")
    // Performance-only field never rides on a screening.
    expect(showtime).not.toHaveProperty("surtitleLanguage")
    // NO ticketing surface, ever.
    expect(JSON.stringify(payload)).not.toMatch(/price|ticket/i)
  })

  it("resolves the wall clock in Africa/Tunis, not the browser's timezone", () => {
    // The backend re-checks the run window in `Africa/Tunis`. If these
    // instants were built from the browser's zone the two would disagree at
    // the day boundary and a same-day evening showtime this schema just
    // accepted would come back SHOWTIME_OUTSIDE_EVENT_RANGE. Tunisia is a
    // fixed UTC+1 (no DST), so the expected instants are exact.
    const payload = toVenueEventCreatePayload(
      {
        ...validValues(),
        startDate: "2026-09-01",
        endDate: "",
        showtimes: [
          { ...emptyShowtimeRow(), date: "2026-09-01", time: "20:00" },
        ],
      },
      WORK_FILM
    )

    expect(payload.startDateTime).toBe("2026-08-31T23:00:00.000Z")
    expect(payload.showtimes[0]!.startDateTime).toBe("2026-09-01T19:00:00.000Z")
  })

  it("narrows to performance fields for a play", () => {
    const values = {
      ...validValues(),
      showtimes: [
        {
          date: "2026-09-02",
          time: "20:00",
          videoFormat: "imax" as const,
          audioLanguage: "ar",
          subtitleLanguage: "should-be-dropped",
          surtitleLanguage: "fr",
        },
      ],
    }

    const payload = toVenueEventCreatePayload(values, WORK_PLAY)

    const showtime = payload.showtimes[0]!
    expect(showtime.surtitleLanguage).toBe("fr")
    expect(showtime).not.toHaveProperty("videoFormat")
    expect(showtime).not.toHaveProperty("subtitleLanguage")
  })

  it("omits blank optionals instead of sending empty strings", () => {
    const payload = toVenueEventCreatePayload(validValues(), WORK_FILM)

    expect(payload).not.toHaveProperty("description")
    expect(payload).not.toHaveProperty("imageIds")
    const showtime = payload.showtimes[0]!
    expect(showtime).not.toHaveProperty("videoFormat")
    expect(showtime).not.toHaveProperty("audioLanguage")
  })
})

describe("venueWorkFormSchema / toVenueWorkCreatePayload", () => {
  it("requires title and a real type", () => {
    const result = venueWorkFormSchema.safeParse({
      title: "",
      type: "",
      synopsis: "",
      duration: "",
      releaseYear: "",
    })
    expect(result.success).toBe(false)
    const messages = result.success
      ? []
      : result.error.issues.map((i) => i.message)
    expect(messages).toContain("WORK_TITLE_REQUIRED")
    expect(messages).toContain("WORK_TYPE_INVALID")
  })

  it("converts numeric strings and omits blanks", () => {
    const payload = toVenueWorkCreatePayload(
      {
        title: "Dune",
        type: "film",
        synopsis: "",
        duration: "155",
        releaseYear: "",
      },
      { posterId: 9 }
    )

    expect(payload).toEqual({
      title: "Dune",
      type: "film",
      duration: 155,
      posterId: 9,
    })
  })
})

describe("toPreviewStrapiEvent", () => {
  it("passes screenings through and defaults the required scalar fields", () => {
    const event = toPreviewStrapiEvent({
      documentId: "event-1",
      title: "Dune",
      screenings: [{ id: 1, startDateTime: "2026-09-02T20:00:00.000Z" }],
    })

    expect(event.documentId).toBe("event-1")
    expect(event.title).toBe("Dune")
    expect(event.screenings).toHaveLength(1)
    expect(event.featured).toBe(false)
  })

  it("re-expresses a play's performances as screening-shaped showtimes", () => {
    const event = toPreviewStrapiEvent({
      documentId: "event-2",
      title: "Hamlet",
      screenings: [],
      performances: [
        {
          id: 5,
          documentId: "perf-1",
          startDateTime: "2026-09-02T20:00:00.000Z",
          play: { documentId: "work-2", title: "Hamlet" },
        },
      ],
    })

    expect(event.screenings).toHaveLength(1)
    expect(event.screenings?.[0]?.startDateTime).toBe(
      "2026-09-02T20:00:00.000Z"
    )
    expect(event.screenings?.[0]?.movie).toMatchObject({
      documentId: "work-2",
    })
  })
})

describe("error vocabulary", () => {
  type Catalog = { venues: { events: { errors: Record<string, string> } } }

  it.each([
    ["en", en as unknown as Catalog],
    ["fr", fr as unknown as Catalog],
    ["ar", ar as unknown as Catalog],
  ])("has a %s translation for every code", (_name, catalog) => {
    for (const code of VENUE_EVENT_ERROR_CODES) {
      expect(catalog.venues.events.errors[code]).toBeTruthy()
    }
  })

  it("extracts the backend code from the Strapi client's error envelope", () => {
    const err = new Error(
      JSON.stringify({ details: { code: "VENUE_NOT_APPROVED" } })
    )
    expect(extractVenueEventErrorCode(err)).toBe("VENUE_NOT_APPROVED")
  })

  it("collapses anything unknown to INTERNAL_ERROR", () => {
    expect(extractVenueEventErrorCode(new Error("raw driver text"))).toBe(
      "INTERNAL_ERROR"
    )
    expect(
      extractVenueEventErrorCode(
        new Error(JSON.stringify({ details: { code: "NEW_CODE" } }))
      )
    ).toBe("INTERNAL_ERROR")
  })
})
