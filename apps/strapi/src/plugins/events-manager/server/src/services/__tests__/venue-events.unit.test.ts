/**
 * `venue-events` service (Story 7.3), mocked Strapi — Document Service +
 * facades only. The branches pinned here are the ones no live-DB test could
 * reach cheaply and that the spec's I/O matrix names explicitly:
 *  - the venue is resolved from the CALLER via the venues facade; no venue id
 *    from a request ever reaches the Document Service
 *  - `category` derivation + screening-vs-performance split by work type
 *  - slug generation (no `targetField` on the schema)
 *  - locale replication of the localized fields to all configured locales
 *  - atomicity (all writes inside `strapi.db.transaction`)
 *  - the publish gate (`VENUE_NOT_APPROVED`) + the loud cascade failure
 *  - foreign event ⇒ the same `EVENT_NOT_FOUND` as an absent one
 */
import venueEventsService, {
  assertEventDatesAndShowtimes,
  generateEventSlug,
} from "../venue-events"

const EVENT_UID = "plugin::events-manager.event"
const SCREENING_UID = "plugin::events-manager.screening"
const PERFORMANCE_UID = "plugin::events-manager.performance"

const USER = { id: 42 }

const VENUE = { documentId: "venue-1", status: "approved", name: "Le Rio" }

const FILM = { documentId: "work-1", title: "Dune", type: "film" }
const PLAY = { documentId: "work-2", title: "Hamlet", type: "play" }

function eventInput(overrides: Record<string, unknown> = {}) {
  return {
    creativeWorkId: "work-1",
    title: "Dune — avant-première",
    description: "Une soirée spéciale",
    startDateTime: "2026-09-01T18:00:00.000Z",
    endDateTime: "2026-09-03T23:00:00.000Z",
    featured: true,
    imageIds: [7],
    showtimes: [
      {
        startDateTime: "2026-09-01T20:00:00.000Z",
        videoFormat: "imax",
        audioLanguage: "fr",
        subtitleLanguage: "ar",
      },
      { startDateTime: "2026-09-02T20:00:00.000Z" },
    ],
    ...overrides,
  } as never
}

interface BuildOptions {
  venue?: Record<string, unknown> | null
  work?: Record<string, unknown> | null
  locales?: string[]
  eventApi?: Partial<Record<string, jest.Mock>>
  screeningApi?: Partial<Record<string, jest.Mock>>
  performanceApi?: Partial<Record<string, jest.Mock>>
}

function buildStrapi(options: BuildOptions = {}) {
  const { venue = VENUE, work = FILM, locales = ["fr", "ar", "en"] } = options

  const createdEvent = {
    documentId: "event-1",
    locale: "fr",
    venue: { documentId: (venue as { documentId?: string })?.documentId },
  }

  const eventApi = {
    create: jest.fn(async () => createdEvent),
    update: jest.fn(async () => createdEvent),
    publish: jest.fn(async () => ({})),
    findOne: jest.fn(async ({ status }: { status?: string }) =>
      status === "published"
        ? null
        : {
            documentId: "event-1",
            title: "Dune — avant-première",
            venue: { documentId: VENUE.documentId },
            screenings: [{ documentId: "scr-1" }, { documentId: "scr-2" }],
            performances: [],
          }
    ),
    findMany: jest.fn(async ({ status }: { status?: string }) =>
      status === "published" ? [] : []
    ),
    ...options.eventApi,
  }
  const screeningApi = {
    create: jest.fn(async () => ({ documentId: "scr-new" })),
    publish: jest.fn(async () => ({})),
    ...options.screeningApi,
  }
  const performanceApi = {
    create: jest.fn(async () => ({ documentId: "perf-new" })),
    publish: jest.fn(async () => ({})),
    ...options.performanceApi,
  }

  const venuesFacade = {
    findVenueForManager: jest.fn(async () => venue),
  }
  const creativeWorksFacade = {
    searchWorks: jest.fn(async () => [FILM]),
    findWork: jest.fn(async () => work),
    createWork: jest.fn(async () => FILM),
  }
  const localesService = {
    find: jest.fn(async () => locales.map((code) => ({ code }))),
  }

  const strapi: any = {
    documents: jest.fn((uid: string) => {
      if (uid === EVENT_UID) return eventApi
      if (uid === SCREENING_UID) return screeningApi
      if (uid === PERFORMANCE_UID) return performanceApi
      throw new Error(`Unexpected UID ${uid} reached the Document Service`)
    }),
    plugin: jest.fn((name: string) => ({
      service: jest.fn((serviceName: string) => {
        if (name === "venues" && serviceName === "public-api") {
          return venuesFacade
        }
        if (name === "creative-works" && serviceName === "public-api") {
          return creativeWorksFacade
        }
        if (name === "i18n" && serviceName === "locales") {
          return localesService
        }
        throw new Error(`Unexpected service ${name}.${serviceName}`)
      }),
    })),
    db: {
      // The callback runs inside; the tests assert every write happened within.
      transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return {
    strapi,
    eventApi,
    screeningApi,
    performanceApi,
    venuesFacade,
    creativeWorksFacade,
  }
}

/** Run `fn` and return the thrown error's `code`. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn()
  } catch (err) {
    return (err as { code?: string }).code
  }
  return undefined
}

describe("venue-events.createEvent (unit)", () => {
  it("resolves the venue from the CALLER via the venues facade", async () => {
    const { strapi, venuesFacade } = buildStrapi()
    const service = venueEventsService({ strapi })

    await service.createEvent(USER, eventInput())

    expect(venuesFacade.findVenueForManager).toHaveBeenCalledWith(USER.id)
  })

  it("throws VENUE_NOT_FOUND (writing nothing) when the manager has no venue", async () => {
    const { strapi, eventApi } = buildStrapi({ venue: null })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.createEvent(USER, eventInput()))).toBe(
      "VENUE_NOT_FOUND"
    )
    expect(eventApi.create).not.toHaveBeenCalled()
  })

  it("throws CREATIVE_WORK_NOT_FOUND (writing nothing) for an unknown work", async () => {
    const { strapi, eventApi } = buildStrapi({ work: null })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.createEvent(USER, eventInput()))).toBe(
      "CREATIVE_WORK_NOT_FOUND"
    )
    expect(eventApi.create).not.toHaveBeenCalled()
  })

  it("throws EVENT_SHOWTIMES_REQUIRED on an empty showtime list, writing nothing", async () => {
    const { strapi, eventApi } = buildStrapi()
    const service = venueEventsService({ strapi })

    expect(
      await codeOf(() =>
        service.createEvent(USER, eventInput({ showtimes: [] }))
      )
    ).toBe("EVENT_SHOWTIMES_REQUIRED")
    expect(eventApi.create).not.toHaveBeenCalled()
  })

  it("throws EVENT_DATES_INVALID when endDateTime precedes startDateTime", async () => {
    const { strapi, eventApi } = buildStrapi()
    const service = venueEventsService({ strapi })

    expect(
      await codeOf(() =>
        service.createEvent(
          USER,
          eventInput({ endDateTime: "2026-08-31T10:00:00.000Z" })
        )
      )
    ).toBe("EVENT_DATES_INVALID")
    expect(eventApi.create).not.toHaveBeenCalled()
  })

  it("throws SHOWTIME_OUTSIDE_EVENT_RANGE for a showtime outside the run window", async () => {
    const { strapi, eventApi } = buildStrapi()
    const service = venueEventsService({ strapi })

    expect(
      await codeOf(() =>
        service.createEvent(
          USER,
          eventInput({
            showtimes: [{ startDateTime: "2026-09-10T20:00:00.000Z" }],
          })
        )
      )
    ).toBe("SHOWTIME_OUTSIDE_EVENT_RANGE")
    expect(eventApi.create).not.toHaveBeenCalled()
  })

  it("creates the DRAFT event at the CALLER's venue with the derived category and a generated slug", async () => {
    const { strapi, eventApi } = buildStrapi()
    const service = venueEventsService({ strapi })

    await service.createEvent(USER, eventInput(), "fr")

    expect(eventApi.create).toHaveBeenCalledTimes(1)
    const call = eventApi.create.mock.calls[0][0]
    expect(call.status).toBe("draft")
    expect(call.locale).toBe("fr")
    expect(call.data.venue).toBe(VENUE.documentId)
    expect(call.data.category).toBe("movie_screening")
    expect(call.data.featured).toBe(true)
    expect(call.data.images).toEqual([7])
    expect(call.data.slug).toMatch(/^dune-avant-premiere-[a-z0-9]+$/)
    // NO ticketing surface: nothing sets price / tickets on the event.
    expect(call.data).not.toHaveProperty("price")
  })

  it("replicates the localized fields VERBATIM to every OTHER configured locale", async () => {
    const { strapi, eventApi } = buildStrapi({ locales: ["fr", "ar", "en"] })
    const service = venueEventsService({ strapi })

    await service.createEvent(USER, eventInput(), "fr")

    const updateLocales = eventApi.update.mock.calls.map((c) => c[0].locale)
    expect(updateLocales.sort()).toEqual(["ar", "en"])
    for (const call of eventApi.update.mock.calls) {
      expect(call[0].documentId).toBe("event-1")
      expect(call[0].data).toEqual({
        title: "Dune — avant-première",
        description: "Une soirée spéciale",
      })
    }
  })

  it("creates SCREENINGS for a film, without any price/tickets fields", async () => {
    const { strapi, screeningApi, performanceApi } = buildStrapi()
    const service = venueEventsService({ strapi })

    await service.createEvent(USER, eventInput())

    expect(screeningApi.create).toHaveBeenCalledTimes(2)
    expect(performanceApi.create).not.toHaveBeenCalled()

    const first = screeningApi.create.mock.calls[0][0].data
    expect(first.event).toBe("event-1")
    expect(first.movie).toBe(FILM.documentId)
    expect(first.videoFormat).toBe("imax")
    expect(first.subtitleLanguage).toBe("ar")
    expect(first).not.toHaveProperty("surtitleLanguage")
    // Dormant ticketing: schema defaults stand, nothing is written.
    expect(first).not.toHaveProperty("price")
    expect(first).not.toHaveProperty("ticketsAvailable")
  })

  it("creates PERFORMANCES for a play (surtitleLanguage, no videoFormat)", async () => {
    const { strapi, screeningApi, performanceApi } = buildStrapi({
      work: PLAY,
    })
    const service = venueEventsService({ strapi })

    await service.createEvent(
      USER,
      eventInput({
        creativeWorkId: "work-2",
        showtimes: [
          {
            startDateTime: "2026-09-01T20:00:00.000Z",
            surtitleLanguage: "fr",
          },
        ],
      })
    )

    expect(performanceApi.create).toHaveBeenCalledTimes(1)
    expect(screeningApi.create).not.toHaveBeenCalled()

    const data = performanceApi.create.mock.calls[0][0].data
    expect(data.play).toBe(PLAY.documentId)
    expect(data.surtitleLanguage).toBe("fr")
    expect(data).not.toHaveProperty("videoFormat")
    expect(data).not.toHaveProperty("movie")
  })

  it("derives theater_performance for a play", async () => {
    const { strapi, eventApi } = buildStrapi({ work: PLAY })
    const service = venueEventsService({ strapi })

    await service.createEvent(
      USER,
      eventInput({
        creativeWorkId: "work-2",
        showtimes: [{ startDateTime: "2026-09-01T20:00:00.000Z" }],
      })
    )

    expect(eventApi.create.mock.calls[0][0].data.category).toBe(
      "theater_performance"
    )
  })

  it("runs EVERY write inside strapi.db.transaction (atomicity)", async () => {
    const { strapi, eventApi, screeningApi } = buildStrapi()
    let inTransaction = false
    strapi.db.transaction.mockImplementation(
      async (cb: () => Promise<unknown>) => {
        inTransaction = true
        try {
          return await cb()
        } finally {
          inTransaction = false
        }
      }
    )
    eventApi.create.mockImplementation(async () => {
      expect(inTransaction).toBe(true)
      return { documentId: "event-1", locale: "fr" }
    })
    screeningApi.create.mockImplementation(async () => {
      expect(inTransaction).toBe(true)
      return {}
    })

    const service = venueEventsService({ strapi })
    await service.createEvent(USER, eventInput())

    expect(strapi.db.transaction).toHaveBeenCalledTimes(1)
    expect(eventApi.create).toHaveBeenCalled()
    expect(screeningApi.create).toHaveBeenCalled()
  })

  it("collapses a raw write failure to EVENT_CREATE_FAILED and logs it", async () => {
    const { strapi } = buildStrapi({
      eventApi: {
        create: jest.fn(async () => {
          throw new Error("db is on fire")
        }),
      },
    })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.createEvent(USER, eventInput()))).toBe(
      "EVENT_CREATE_FAILED"
    )
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue-events.listMine (unit)", () => {
  it("lists only the caller's venue's DRAFTS, marked with publication state", async () => {
    const { strapi, eventApi } = buildStrapi({
      eventApi: {
        findMany: jest.fn(async ({ status }: { status?: string }) =>
          status === "published"
            ? [{ documentId: "event-1" }]
            : [
                { documentId: "event-1", title: "A" },
                { documentId: "event-2", title: "B" },
              ]
        ),
      },
    })
    const service = venueEventsService({ strapi })

    const result = await service.listMine(USER)

    expect(result).toEqual([
      { documentId: "event-1", title: "A", isPublished: true },
      { documentId: "event-2", title: "B", isPublished: false },
    ])
    for (const call of eventApi.findMany.mock.calls) {
      expect(call[0].filters).toEqual({
        venue: { documentId: { $eq: VENUE.documentId } },
      })
    }
  })

  it("throws VENUE_NOT_FOUND when the manager has no venue", async () => {
    const { strapi } = buildStrapi({ venue: null })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.listMine(USER))).toBe("VENUE_NOT_FOUND")
  })
})

describe("venue-events.findMine (unit)", () => {
  it("answers EVENT_NOT_FOUND for a FOREIGN event (indistinguishable from absent)", async () => {
    const { strapi } = buildStrapi({
      eventApi: {
        findOne: jest.fn(async () => ({
          documentId: "event-9",
          venue: { documentId: "someone-elses-venue" },
        })),
      },
    })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.findMine(USER, "event-9"))).toBe(
      "EVENT_NOT_FOUND"
    )
  })

  it("answers EVENT_NOT_FOUND for an absent event", async () => {
    const { strapi } = buildStrapi({
      eventApi: { findOne: jest.fn(async () => null) },
    })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.findMine(USER, "nope"))).toBe(
      "EVENT_NOT_FOUND"
    )
  })

  it("returns the DRAFT projection with its publication state", async () => {
    const { strapi } = buildStrapi()
    const service = venueEventsService({ strapi })

    const result = await service.findMine(USER, "event-1")

    expect(result.documentId).toBe("event-1")
    expect(result.isPublished).toBe(false)
  })

  it("asks for the PREVIEW populate — the projection the detail component needs", async () => {
    const { strapi, eventApi } = buildStrapi()
    const service = venueEventsService({ strapi })

    await service.findMine(USER, "event-1")

    // Pinned because every failure here is SILENT: drop `screenings` and the
    // preview renders a live-looking page with no dates; drop `venue` and the
    // ownership check below turns EVERY preview into EVENT_NOT_FOUND.
    const populate = eventApi.findOne.mock.calls[0][0].populate
    expect(populate).toEqual(
      expect.objectContaining({
        images: expect.anything(),
        venue: expect.anything(),
        screenings: expect.anything(),
        performances: expect.anything(),
      })
    )
  })
})

describe("venue-events.publishEvent (unit)", () => {
  it("refuses with VENUE_NOT_APPROVED when the venue is pending (event stays draft)", async () => {
    const { strapi, eventApi } = buildStrapi({
      venue: { ...VENUE, status: "pending" },
    })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.publishEvent(USER, "event-1"))).toBe(
      "VENUE_NOT_APPROVED"
    )
    expect(eventApi.publish).not.toHaveBeenCalled()
  })

  it("cascades to every showtime FIRST, then publishes the event in ALL locales", async () => {
    const order: string[] = []
    const { strapi, eventApi, screeningApi } = buildStrapi({
      eventApi: {
        publish: jest.fn(async () => {
          order.push("event")
          return {}
        }),
      },
      screeningApi: {
        publish: jest.fn(async (args: any) => {
          order.push(args.documentId)
          return {}
        }),
      },
    })
    const service = venueEventsService({ strapi })

    const result = await service.publishEvent(USER, "event-1")

    expect(eventApi.publish).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "event-1", locale: "*" })
    )
    expect(screeningApi.publish.mock.calls.map((c) => c[0].documentId)).toEqual(
      ["scr-1", "scr-2"]
    )
    // ORDER IS LOAD-BEARING: the public detail populate only runs under a
    // published event root, so showtimes published under a still-draft event
    // are invisible — but an event published before its showtimes is a live
    // event with no dates.
    expect(order).toEqual(["scr-1", "scr-2", "event"])
    expect(result).toEqual({ documentId: "event-1", isPublished: true })
  })

  it("cascades to PERFORMANCES too — a play publishes with its dates", async () => {
    const order: string[] = []
    const { strapi, eventApi, performanceApi } = buildStrapi({
      eventApi: {
        findOne: jest.fn(async ({ status }: { status?: string }) =>
          status === "published"
            ? null
            : {
                documentId: "event-1",
                title: "Hamlet",
                venue: { documentId: VENUE.documentId },
                screenings: [],
                performances: [
                  { documentId: "perf-1" },
                  { documentId: "perf-2" },
                ],
              }
        ),
        publish: jest.fn(async () => {
          order.push("event")
          return {}
        }),
      },
      performanceApi: {
        publish: jest.fn(async (args: any) => {
          order.push(args.documentId)
          return {}
        }),
      },
    })
    const service = venueEventsService({ strapi })

    await service.publishEvent(USER, "event-1")

    // The theatre half of the story: without this the play goes live with an
    // empty schedule, and the screening-only fixture above would never notice.
    expect(
      performanceApi.publish.mock.calls.map((c) => c[0].documentId)
    ).toEqual(["perf-1", "perf-2"])
    expect(order).toEqual(["perf-1", "perf-2", "event"])
    expect(eventApi.publish).toHaveBeenCalledTimes(1)
  })

  it("collapses a cascade failure to a LOUD EVENT_PUBLISH_FAILED, leaving the event a DRAFT", async () => {
    const { strapi, eventApi } = buildStrapi({
      screeningApi: {
        publish: jest.fn(async () => {
          throw new Error("halfway there")
        }),
      },
    })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.publishEvent(USER, "event-1"))).toBe(
      "EVENT_PUBLISH_FAILED"
    )
    expect(strapi.log.error).toHaveBeenCalled()
    // Nothing reached the public surface: a failed publish is retryable, not a
    // live event missing its showtimes.
    expect(eventApi.publish).not.toHaveBeenCalled()
  })

  it("answers EVENT_NOT_FOUND before the approval gate for a foreign event", async () => {
    const { strapi } = buildStrapi({
      venue: { ...VENUE, status: "pending" },
      eventApi: {
        findOne: jest.fn(async () => ({
          documentId: "event-9",
          venue: { documentId: "someone-elses-venue" },
        })),
      },
    })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.publishEvent(USER, "event-9"))).toBe(
      "EVENT_NOT_FOUND"
    )
  })
})

describe("venue-events creative-works passthroughs (unit)", () => {
  it("projects the search result to what the picker renders", async () => {
    const { strapi, creativeWorksFacade } = buildStrapi()
    creativeWorksFacade.searchWorks.mockResolvedValue([
      {
        documentId: "work-1",
        title: "Dune",
        type: "film",
        releaseYear: 2021,
        poster: { url: "/p.jpg" },
        synopsis: "should not leak",
      },
    ])
    const service = venueEventsService({ strapi })

    const result = await service.searchCreativeWorks(USER, "dune")

    expect(creativeWorksFacade.searchWorks).toHaveBeenCalledWith("dune", 20)
    expect(result).toEqual([
      {
        documentId: "work-1",
        title: "Dune",
        type: "film",
        releaseYear: 2021,
        poster: { url: "/p.jpg" },
      },
    ])
  })

  it("collapses a facade create failure to WORK_CREATE_FAILED", async () => {
    const { strapi, creativeWorksFacade } = buildStrapi()
    creativeWorksFacade.createWork.mockRejectedValue(new Error("boom"))
    const service = venueEventsService({ strapi })

    expect(
      await codeOf(() =>
        service.createCreativeWork(USER, { title: "X", type: "film" }, "fr")
      )
    ).toBe("WORK_CREATE_FAILED")
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue-events catalog endpoints are TENANT-GATED (unit)", () => {
  // "Manager without venue -> 404" is stated for the /venue/* PREFIX, not for
  // the event endpoints alone. Without these, a venue-manager role-holder with
  // no venue could still write a PUBLISHED row into the shared catalog.
  it("refuses the search with VENUE_NOT_FOUND when the caller manages no venue", async () => {
    const { strapi, creativeWorksFacade } = buildStrapi({ venue: null })
    const service = venueEventsService({ strapi })

    expect(await codeOf(() => service.searchCreativeWorks(USER, "dune"))).toBe(
      "VENUE_NOT_FOUND"
    )
    expect(creativeWorksFacade.searchWorks).not.toHaveBeenCalled()
  })

  it("refuses the work create with VENUE_NOT_FOUND and writes NOTHING", async () => {
    const { strapi, creativeWorksFacade } = buildStrapi({ venue: null })
    const service = venueEventsService({ strapi })

    expect(
      await codeOf(() =>
        service.createCreativeWork(USER, { title: "X", type: "film" }, "fr")
      )
    ).toBe("VENUE_NOT_FOUND")
    expect(creativeWorksFacade.createWork).not.toHaveBeenCalled()
  })
})

describe("assertEventDatesAndShowtimes / generateEventSlug (unit)", () => {
  it("accepts a showtime on the boundary days", () => {
    expect(() =>
      assertEventDatesAndShowtimes({
        startDateTime: "2026-09-01T18:00:00.000Z",
        endDateTime: "2026-09-03T23:00:00.000Z",
        showtimes: [
          { startDateTime: "2026-09-01T00:30:00.000Z" },
          { startDateTime: "2026-09-03T23:30:00.000Z" },
        ],
      })
    ).not.toThrow()
  })

  it("reads run-date days in Africa/Tunis, so an evening showtime on a ONE-DAY event is accepted", () => {
    // The regression this pins: the client resolves the manager's wall clock
    // in `Africa/Tunis`, so a single-day event starting `2026-09-01 00:00`
    // local arrives as `2026-08-31T23:00Z`. Compared as UTC days its window
    // would be [08-31, 08-31] and a legitimate 20:00 showtime the form just
    // accepted would bounce as SHOWTIME_OUTSIDE_EVENT_RANGE — i.e. no
    // single-day event could ever be created from Tunisia.
    expect(() =>
      assertEventDatesAndShowtimes({
        startDateTime: "2026-08-31T23:00:00.000Z", // 2026-09-01 00:00 Tunis
        showtimes: [{ startDateTime: "2026-09-01T19:00:00.000Z" }], // 20:00 Tunis
      })
    ).not.toThrow()
  })

  it("still refuses a showtime on the Tunis day AFTER a one-day event", () => {
    expect(() =>
      assertEventDatesAndShowtimes({
        startDateTime: "2026-08-31T23:00:00.000Z", // 2026-09-01 Tunis
        showtimes: [{ startDateTime: "2026-09-01T23:30:00.000Z" }], // 2026-09-02 Tunis
      })
    ).toThrow(expect.objectContaining({ code: "SHOWTIME_OUTSIDE_EVENT_RANGE" }))
  })

  it("bounds a no-end event to its start day", () => {
    expect(() =>
      assertEventDatesAndShowtimes({
        startDateTime: "2026-09-01T18:00:00.000Z",
        showtimes: [{ startDateTime: "2026-09-02T10:00:00.000Z" }],
      })
    ).toThrow(expect.objectContaining({ code: "SHOWTIME_OUTSIDE_EVENT_RANGE" }))
  })

  it("generates a kebab slug with a uniqueness suffix, falling back for non-Latin titles", () => {
    expect(generateEventSlug("Dune — Avant-Première !")).toMatch(
      /^dune-avant-premiere-[a-z0-9]+$/
    )
    expect(generateEventSlug("سهرة سينمائية")).toMatch(/^event-[a-z0-9]+$/)
    // Two calls never collide on the base alone.
    expect(generateEventSlug("Same")).not.toBe(generateEventSlug("Same"))
  })
})
