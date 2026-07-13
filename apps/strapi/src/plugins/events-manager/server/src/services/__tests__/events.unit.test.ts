import eventsService from "../events"

/**
 * Unit tests for the public `events` read service (mocked Strapi, Story 3.1a).
 *
 * Document Service API only. We assert the load-bearing invariants:
 *  - list scopes to published rows + MVP category `movie_screening`, paginates,
 *    and returns the v5 shape (`{ data, meta.pagination }`)
 *  - the optional `featured` filter is threaded into the Document Service call
 *  - empty data returns `data: []` with valid pagination (not an error)
 *  - trending ranks by sum(screening.ticketsSold) desc and tolerates events
 *    with no screenings (sum 0, ranked last)
 */

const EVENT_UID = "plugin::events-manager.event"

interface DocApiMock {
  findMany: jest.Mock
  findOne: jest.Mock
  count: jest.Mock
}

function buildStrapi(docApi: Partial<DocApiMock>) {
  const api: DocApiMock = {
    findMany: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    ...docApi,
  }
  const strapi: any = {
    documents: jest.fn(() => api),
    // DW-19: findTrending logs a warn when the fetch hits TRENDING_FETCH_CAP.
    // Every service build gets a real logger mock so that path never throws.
    log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }
  return { strapi, api }
}

describe("events service.findEvents (unit)", () => {
  it("scopes to published + movie_screening, paginates, returns v5 shape", async () => {
    const rows = [{ documentId: "e1" }, { documentId: "e2" }]
    const { strapi, api } = buildStrapi({
      findMany: jest.fn(async () => rows),
      count: jest.fn(async () => 42),
    })
    const service = eventsService({ strapi })

    const result = await service.findEvents({ page: 2, pageSize: 10 })

    expect(strapi.documents).toHaveBeenCalledWith(EVENT_UID)
    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        filters: expect.objectContaining({ category: "movie_screening" }),
        sort: "startDateTime:asc",
        start: 10,
        limit: 10,
      })
    )
    expect(result).toEqual({
      data: rows,
      meta: { pagination: { page: 2, pageSize: 10, pageCount: 5, total: 42 } },
    })
  })

  it("threads the featured + eventStatus + date-range filters through", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({
      page: 1,
      pageSize: 25,
      featured: true,
      eventStatus: "scheduled",
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-07-31T00:00:00.000Z",
    })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          category: "movie_screening",
          featured: true,
          eventStatus: "scheduled",
          startDateTime: {
            $gte: "2026-07-01T00:00:00.000Z",
            $lte: "2026-07-31T00:00:00.000Z",
          },
        },
      })
    )
  })

  it("applies a city-only location filter as venue.cityRef.documentId", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25, city: "city-1" })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          venue: { cityRef: { documentId: "city-1" } },
        }),
      })
    )
  })

  it("applies a region-only location filter as venue.cityRef.region.documentId", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25, region: "region-1" })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          venue: { cityRef: { region: { documentId: "region-1" } } },
        }),
      })
    )
  })

  it("ANDs city + region into a single nested venue.cityRef filter", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({
      page: 1,
      pageSize: 25,
      city: "city-1",
      region: "region-1",
    })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          venue: {
            cityRef: {
              documentId: "city-1",
              region: { documentId: "region-1" },
            },
          },
        }),
      })
    )
  })

  it("applies a venue-only filter as venue.documentId (Story 3.5)", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25, venue: "venue-1" })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          venue: { documentId: "venue-1" },
        }),
      })
    )
  })

  it("merges venue + city into one filters.venue object (venue AND location)", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({
      page: 1,
      pageSize: 25,
      venue: "venue-1",
      city: "city-1",
    })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          venue: {
            documentId: "venue-1",
            cityRef: { documentId: "city-1" },
          },
        }),
      })
    )
  })

  it("merges venue + region into one filters.venue object", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({
      page: 1,
      pageSize: 25,
      venue: "venue-1",
      region: "region-1",
    })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          venue: {
            documentId: "venue-1",
            cityRef: { region: { documentId: "region-1" } },
          },
        }),
      })
    )
  })

  it("applies no venue/location filter when venue/city/region are omitted", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25 })

    const call = api.findMany.mock.calls[0][0]
    expect(call.filters).not.toHaveProperty("venue")
  })

  it("builds a keyword $or across title/movie fields/venue name (Story 3.6)", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25, q: "inception" })

    const call = api.findMany.mock.calls[0][0]
    expect(call.filters.$or).toEqual([
      { title: { $containsi: "inception" } },
      { screenings: { movie: { title: { $containsi: "inception" } } } },
      { screenings: { movie: { originalTitle: { $containsi: "inception" } } } },
      { screenings: { movie: { synopsis: { $containsi: "inception" } } } },
      { venue: { name: { $containsi: "inception" } } },
    ])
  })

  it("keyword $or coexists (AND) with venue/date filters without clobbering filters.venue", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({
      page: 1,
      pageSize: 25,
      q: "jazz",
      venue: "venue-1",
      city: "city-1",
      startDate: "2026-07-01T00:00:00.000Z",
    })

    const call = api.findMany.mock.calls[0][0]
    // Keyword $or is present…
    expect(Array.isArray(call.filters.$or)).toBe(true)
    expect(call.filters.$or).toHaveLength(5)
    // …and the venue relation filter is intact (not overwritten by $or).
    expect(call.filters.venue).toEqual({
      documentId: "venue-1",
      cityRef: { documentId: "city-1" },
    })
    // …and the date filter still applies.
    expect(call.filters.startDateTime).toEqual({
      $gte: "2026-07-01T00:00:00.000Z",
    })
    // …and the MVP category scope is preserved.
    expect(call.filters.category).toBe("movie_screening")
  })

  it("applies no keyword $or when q is omitted", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25 })

    const call = api.findMany.mock.calls[0][0]
    expect(call.filters).not.toHaveProperty("$or")
  })

  it("excludes cancelled events by default when no eventStatus is given", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25 })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          category: "movie_screening",
          eventStatus: { $ne: "cancelled" },
        }),
      })
    )
  })

  it("honours an explicit eventStatus over the default cancelled exclusion", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({
      page: 1,
      pageSize: 25,
      eventStatus: "cancelled",
    })

    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ eventStatus: "cancelled" }),
      })
    )
  })

  it("returns data:[] with valid pagination when there is no data", async () => {
    const { strapi } = buildStrapi({
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    })
    const service = eventsService({ strapi })

    const result = await service.findEvents({ page: 1, pageSize: 25 })

    expect(result).toEqual({
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    })
  })

  it("passes the deepened card/hero populate reaching screenings.movie.{poster,backdrop,genres} + venue.cityRef.region (DW-22)", async () => {
    const { strapi, api } = buildStrapi({ count: jest.fn(async () => 0) })
    const service = eventsService({ strapi })

    await service.findEvents({ page: 1, pageSize: 25 })

    const call = api.findMany.mock.calls[0][0]
    // Movie (creative-work) hero metadata for `toFilmHeroEvent` — poster/
    // backdrop/genres, NOT the deep detail graph (no cast/credits/videos).
    expect(call.populate.screenings.populate.movie.populate).toEqual(
      expect.objectContaining({
        poster: true,
        backdrop: true,
        genres: true,
      })
    )
    // Venue city/region for `generateEventJsonLd` location.address.
    expect(call.populate.venue.populate.cityRef.populate.region).toBe(true)
    expect(call.populate.images).toBe(true)
  })

  it("returns browse rows untransformed when a screening lacks movie or a venue lacks region (DW-22 passthrough)", async () => {
    // The deepened populate only *requests* the movie/region graph; a row whose
    // screening carries no `movie` (or whose venue has no `region`) must pass
    // through the service unchanged — the frontend mappers guard absence.
    const rows = [
      { documentId: "no-movie", screenings: [{ ticketsSold: 3 }], venue: {} },
      {
        documentId: "no-region",
        screenings: [{ ticketsSold: 1, movie: { documentId: "m1" } }],
        venue: { cityRef: { name: "Tunis" } },
      },
    ]
    const { strapi } = buildStrapi({
      findMany: jest.fn(async () => rows),
      count: jest.fn(async () => rows.length),
    })
    const service = eventsService({ strapi })

    const result = await service.findEvents({ page: 1, pageSize: 25 })

    // No transformation layer: the rows are returned exactly as Strapi yields.
    expect(result.data).toBe(rows)
    expect(result.data).toEqual(rows)
  })
})

describe("events service.findEvent (unit)", () => {
  it("fetches the published cinema row by documentId with populate", async () => {
    const { strapi, api } = buildStrapi({
      findOne: jest.fn(async () => ({
        documentId: "e1",
        category: "movie_screening",
      })),
    })
    const service = eventsService({ strapi })

    const event = await service.findEvent("e1")

    expect(api.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "e1", status: "published" })
    )
    expect(event).toEqual({ documentId: "e1", category: "movie_screening" })
  })

  it("passes the deep DETAIL_POPULATE graph to findOne (Story 3.7)", async () => {
    const { strapi, api } = buildStrapi({
      findOne: jest.fn(async () => ({
        documentId: "e1",
        category: "movie_screening",
      })),
    })
    const service = eventsService({ strapi })

    await service.findEvent("e1")

    const call = api.findOne.mock.calls[0][0]
    // Deep populate reaches screenings.movie.{poster,backdrop,videos,genres,
    // cast.person,cast.character,credits.person,credits.creditRole} — NOT the
    // shallow browse `EVENT_POPULATE` (`screenings: true`).
    const moviePopulate = call.populate.screenings.populate.movie.populate
    expect(moviePopulate).toEqual(
      expect.objectContaining({
        poster: true,
        backdrop: true,
        videos: true,
        genres: true,
      })
    )
    expect(moviePopulate.cast.populate.person).toBeTruthy()
    expect(moviePopulate.cast.populate.character).toBe(true)
    expect(moviePopulate.credits.populate.person).toBeTruthy()
    expect(moviePopulate.credits.populate.creditRole).toBe(true)
    // Venue address block: cityRef.region + geo (for the future 3.8 map).
    expect(call.populate.venue.populate.cityRef.populate.region).toBe(true)
    expect(call.populate.venue.populate.geo).toBe(true)
    expect(call.populate.images).toBe(true)
  })

  it("threads locale into the Document Service call", async () => {
    const { strapi, api } = buildStrapi({
      findOne: jest.fn(async () => ({
        documentId: "e1",
        category: "movie_screening",
      })),
    })
    const service = eventsService({ strapi })

    await service.findEvent("e1", "ar")

    expect(api.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "ar" })
    )
  })

  it("treats a non-cinema event as not-found (returns null)", async () => {
    const { strapi } = buildStrapi({
      findOne: jest.fn(async () => ({
        documentId: "t1",
        category: "theater_performance",
      })),
    })
    const service = eventsService({ strapi })

    expect(await service.findEvent("t1")).toBeNull()
  })

  it("returns null when the row is absent", async () => {
    const { strapi } = buildStrapi({ findOne: jest.fn(async () => null) })
    const service = eventsService({ strapi })

    expect(await service.findEvent("missing")).toBeNull()
  })
})

describe("events service.findTrending (unit)", () => {
  it("ranks upcoming events by sum(screening.ticketsSold) desc", async () => {
    const rows = [
      {
        documentId: "low",
        screenings: [{ ticketsSold: 1 }, { ticketsSold: 2 }],
      }, // 3
      {
        documentId: "high",
        screenings: [{ ticketsSold: 40 }, { ticketsSold: 5 }],
      }, // 45
      { documentId: "mid", screenings: [{ ticketsSold: 20 }] }, // 20
    ]
    const { strapi, api } = buildStrapi({
      findMany: jest.fn(async () => rows),
    })
    const service = eventsService({ strapi })

    const result = await service.findTrending({ page: 1, pageSize: 25 })

    // upcoming window: startDateTime $gte now, movie_screening only, cancelled
    // excluded, deterministic fetch order.
    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        sort: "startDateTime:asc",
        filters: expect.objectContaining({
          category: "movie_screening",
          eventStatus: { $ne: "cancelled" },
          startDateTime: expect.objectContaining({ $gte: expect.any(String) }),
        }),
      })
    )
    expect(result.data.map((e: any) => e.documentId)).toEqual([
      "high",
      "mid",
      "low",
    ])
    expect(result.meta.pagination).toEqual({
      page: 1,
      pageSize: 25,
      pageCount: 1,
      total: 3,
    })
  })

  it("treats events with no screenings as sum 0 (ranked last, not dropped)", async () => {
    const rows = [
      { documentId: "empty", screenings: [] },
      { documentId: "withSales", screenings: [{ ticketsSold: 10 }] },
      { documentId: "nullScreenings", screenings: null },
    ]
    const { strapi } = buildStrapi({ findMany: jest.fn(async () => rows) })
    const service = eventsService({ strapi })

    const result = await service.findTrending({ page: 1, pageSize: 25 })

    expect(result.data.map((e: any) => e.documentId)[0]).toBe("withSales")
    expect(result.data).toHaveLength(3)
    expect(result.meta.pagination.total).toBe(3)
  })

  it("paginates the ranked list in JS", async () => {
    const rows = [
      { documentId: "a", screenings: [{ ticketsSold: 5 }] },
      { documentId: "b", screenings: [{ ticketsSold: 4 }] },
      { documentId: "c", screenings: [{ ticketsSold: 3 }] },
    ]
    const { strapi } = buildStrapi({ findMany: jest.fn(async () => rows) })
    const service = eventsService({ strapi })

    const result = await service.findTrending({ page: 2, pageSize: 2 })

    expect(result.data.map((e: any) => e.documentId)).toEqual(["c"])
    expect(result.meta.pagination).toEqual({
      page: 2,
      pageSize: 2,
      pageCount: 2,
      total: 3,
    })
  })

  it("passes the same deepened card/hero populate as browse (DW-22)", async () => {
    const { strapi, api } = buildStrapi({ findMany: jest.fn(async () => []) })
    const service = eventsService({ strapi })

    await service.findTrending({ page: 1, pageSize: 25 })

    const call = api.findMany.mock.calls[0][0]
    expect(call.populate.screenings.populate.movie.populate).toEqual(
      expect.objectContaining({
        poster: true,
        backdrop: true,
        genres: true,
      })
    )
    expect(call.populate.venue.populate.cityRef.populate.region).toBe(true)
    expect(call.populate.images).toBe(true)
  })

  it("still ranks by sum(screening.ticketsSold) desc with the deepened movie graph present (DW-22 regression guard)", async () => {
    // Same ranking scenario as above, but each screening now also carries a
    // populated `movie` object (the deepened populate) — proving the deeper
    // graph does not disturb the scalar `ticketsSold` sum/ranking.
    const rows = [
      {
        documentId: "low",
        screenings: [
          { ticketsSold: 1, movie: { documentId: "m1", genres: [] } },
          { ticketsSold: 2, movie: { documentId: "m2", genres: [] } },
        ],
      }, // 3
      {
        documentId: "high",
        screenings: [
          { ticketsSold: 40, movie: { documentId: "m3", genres: [] } },
          { ticketsSold: 5, movie: { documentId: "m4", genres: [] } },
        ],
      }, // 45
      {
        documentId: "mid",
        screenings: [{ ticketsSold: 20, movie: { documentId: "m5" } }],
      }, // 20
    ]
    const { strapi } = buildStrapi({ findMany: jest.fn(async () => rows) })
    const service = eventsService({ strapi })

    const result = await service.findTrending({ page: 1, pageSize: 25 })

    expect(result.data.map((e: any) => e.documentId)).toEqual([
      "high",
      "mid",
      "low",
    ])
    // Rows are returned untransformed — the populated movie survives intact.
    expect((result.data[0] as any).screenings[0].movie.documentId).toBe("m3")
  })

  it("breaks ties on equal sums by documentId for stable ordering", async () => {
    const rows = [
      { documentId: "zeta", screenings: [{ ticketsSold: 10 }] },
      { documentId: "alpha", screenings: [{ ticketsSold: 10 }] },
      { documentId: "mid", screenings: [{ ticketsSold: 10 }] },
    ]
    const { strapi } = buildStrapi({ findMany: jest.fn(async () => rows) })
    const service = eventsService({ strapi })

    const result = await service.findTrending({ page: 1, pageSize: 25 })

    expect(result.data.map((e: any) => e.documentId)).toEqual([
      "alpha",
      "mid",
      "zeta",
    ])
  })

  // --- DW-19: response cache + cap-hit observability ---

  it("warm cache: a 2nd call with the same key does not re-fetch and returns the same result", async () => {
    const rows = [
      { documentId: "high", screenings: [{ ticketsSold: 40 }] },
      { documentId: "low", screenings: [{ ticketsSold: 1 }] },
    ]
    const findMany = jest.fn(async () => rows)
    const { strapi } = buildStrapi({ findMany })
    const service = eventsService({ strapi })

    const first = await service.findTrending({ page: 1, pageSize: 25 })
    const second = await service.findTrending({ page: 1, pageSize: 25 })

    // Within-TTL hit ⇒ the Document Service findMany runs exactly once.
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
    expect(second.data.map((e: any) => e.documentId)).toEqual(["high", "low"])
  })

  it("distinct keys (page/pageSize) each trigger their own fetch", async () => {
    const findMany = jest.fn(async () => [
      { documentId: "a", screenings: [{ ticketsSold: 5 }] },
    ])
    const { strapi } = buildStrapi({ findMany })
    const service = eventsService({ strapi })

    await service.findTrending({ page: 1, pageSize: 25 })
    await service.findTrending({ page: 2, pageSize: 25 })
    await service.findTrending({ page: 1, pageSize: 10 })

    // Three distinct locale|page|pageSize keys ⇒ three separate computes.
    expect(findMany).toHaveBeenCalledTimes(3)
  })

  it("keys the cache by locale: two locales for the same page do not collide", async () => {
    const findMany = jest.fn(async () => [
      { documentId: "a", screenings: [{ ticketsSold: 5 }] },
    ])
    const { strapi } = buildStrapi({ findMany })
    const service = eventsService({ strapi })

    await service.findTrending({ page: 1, pageSize: 25, locale: "fr" })
    await service.findTrending({ page: 1, pageSize: 25, locale: "ar" })

    // Same page/pageSize but distinct locales ⇒ separate computes (no cross-locale
    // cache bleed).
    expect(findMany).toHaveBeenCalledTimes(2)
  })

  it("logs a warn when the fetch returns TRENDING_FETCH_CAP (500) rows", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      documentId: `e${i}`,
      screenings: [{ ticketsSold: i }],
    }))
    const { strapi } = buildStrapi({ findMany: jest.fn(async () => rows) })
    const service = eventsService({ strapi })

    const result = await service.findTrending({ page: 1, pageSize: 25 })

    expect(strapi.log.warn).toHaveBeenCalledTimes(1)
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining("500"))
    // A valid ranked result is still returned.
    expect(result.meta.pagination.total).toBe(500)
    expect(result.data).toHaveLength(25)
  })

  it("does not warn when the fetch is below the cap", async () => {
    const rows = [{ documentId: "a", screenings: [{ ticketsSold: 1 }] }]
    const { strapi } = buildStrapi({ findMany: jest.fn(async () => rows) })
    const service = eventsService({ strapi })

    await service.findTrending({ page: 1, pageSize: 25 })

    expect(strapi.log.warn).not.toHaveBeenCalled()
  })
})
