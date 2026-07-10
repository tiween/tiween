import publicApiService from "../public-api"

/**
 * Unit tests for events-manager `public-api.adjustInventory` (mocked Strapi).
 *
 * adjustInventory is a Document Service read-modify-write (no raw SQL). We assert
 * its load-bearing invariants:
 *  - it reads the PUBLISHED row (status: "published") of the draftAndPublish doc
 *  - a sale that fits writes ticketsSold = current + delta
 *  - a sale that exceeds capacity throws TICKET_SOLD_OUT and does NOT write
 *  - a refund (delta < 0) decrements, floored at zero
 *  - unknown kind / zero delta / missing document are rejected
 *
 * Concurrency is intentionally NOT covered — it is deferred to Epic 6
 * (read-modify-write is racy by design for now; see deferred-work.md).
 */

interface DocApiMock {
  findOne: jest.Mock
  update: jest.Mock
}

function buildStrapi(
  doc: { ticketsSold: number; ticketsAvailable: number } | null
) {
  const docApi: DocApiMock = {
    findOne: jest.fn(async () =>
      doc ? { documentId: "screening-1", ...doc } : null
    ),
    update: jest.fn(async () => ({ documentId: "screening-1" })),
  }

  const strapi: any = {
    documents: jest.fn(() => docApi),
  }

  return { strapi, docApi }
}

describe("public-api.adjustInventory (unit)", () => {
  it("reads the published row and writes current + delta on a fitting sale", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 3,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", 2)

    expect(strapi.documents).toHaveBeenCalledWith(
      "plugin::events-manager.screening"
    )
    expect(docApi.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "screening-1",
        status: "published",
      })
    )
    expect(docApi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "screening-1",
        status: "published",
        data: { ticketsSold: 5 },
      })
    )
  })

  it("throws TICKET_SOLD_OUT and does not write when the sale exceeds capacity", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 9,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 2)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
    expect(docApi.update).not.toHaveBeenCalled()
  })

  it("allows a sale that exactly fills remaining capacity", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 8,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 2)
    ).resolves.toBeUndefined()
    expect(docApi.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ticketsSold: 10 } })
    )
  })

  it("refund (delta < 0) decrements sold count", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 4,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", -1)

    expect(docApi.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ticketsSold: 3 } })
    )
  })

  it("refund cannot drive sold count below zero", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 0,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", -1)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
    expect(docApi.update).not.toHaveBeenCalled()
  })

  it("throws when the sub-event document does not exist", async () => {
    const { strapi, docApi } = buildStrapi(null)
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("missing", "screening", 1)
    ).rejects.toThrow(/not found/)
    expect(docApi.update).not.toHaveBeenCalled()
  })

  it("rejects an unknown sub-event kind", async () => {
    const { strapi } = buildStrapi({ ticketsSold: 0, ticketsAvailable: 10 })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("x", "balloon" as any, 1)
    ).rejects.toThrow(/Unknown sub-event kind/)
  })

  it("rejects a zero delta", async () => {
    const { strapi } = buildStrapi({ ticketsSold: 0, ticketsAvailable: 10 })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 0)
    ).rejects.toThrow(/non-zero integer/)
  })
})

/**
 * Unit tests for the Story 5.3 cross-plugin enrichment
 * `findScreeningInfoByMovies` (mocked Strapi).
 *
 * The method runs ONE event-side query (`screenings.movie.documentId $in`) and
 * folds each matched screening's `movie.documentId` into a record tracking the
 * earliest upcoming (`>= now`) and latest past (`< now`) event, attributing the
 * chosen event's venue. `now` is an argument (not read internally) so bucketing
 * is deterministic. We lock:
 *  - empty ids short-circuits to `{}` without hitting the Document Service
 *  - mixed past/future events → earliest-future `nextScreeningDate`, latest-past
 *    `lastScreeningDate`, and `venueName` from the upcoming event
 *  - a past-only movie → `next=null`, `last=<latest past>`, venue from that past
 *  - an id with no events is absent from the record
 *  - one event referencing two saved movies keys BOTH
 */
interface EnrichDocApiMock {
  findMany: jest.Mock
}

const NOW = "2026-07-10T00:00:00.000Z"
const iso = (isoStr: string) => isoStr

function buildEnrichStrapi(events: unknown[]) {
  const docApi: EnrichDocApiMock = {
    findMany: jest.fn(async () => events),
  }
  const strapi: any = {
    documents: jest.fn(() => docApi),
  }
  return { strapi, docApi }
}

describe("public-api.findScreeningInfoByMovies (unit)", () => {
  it("returns {} and does NOT hit the Document Service for empty ids", async () => {
    const { strapi, docApi } = buildEnrichStrapi([])
    const service = publicApiService({ strapi })

    const result = await service.findScreeningInfoByMovies([], NOW)

    expect(result).toEqual({})
    expect(docApi.findMany).not.toHaveBeenCalled()
  })

  it("queries published events by screenings.movie.documentId $in", async () => {
    const { strapi, docApi } = buildEnrichStrapi([])
    const service = publicApiService({ strapi })

    await service.findScreeningInfoByMovies(["A", "B"], NOW)

    expect(strapi.documents).toHaveBeenCalledWith(
      "plugin::events-manager.event"
    )
    expect(docApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        filters: {
          screenings: { movie: { documentId: { $in: ["A", "B"] } } },
        },
        sort: "startDateTime:asc",
      })
    )
  })

  it("picks earliest-future next, latest-past last, and the upcoming venue", async () => {
    const events = [
      {
        startDateTime: iso("2026-07-08T00:00:00.000Z"), // now-2d
        venue: { name: "Past Venue" },
        screenings: [{ movie: { documentId: "A" } }],
      },
      {
        startDateTime: iso("2026-07-13T00:00:00.000Z"), // now+3d
        venue: { name: "Next Venue" },
        screenings: [{ movie: { documentId: "A" } }],
      },
      {
        startDateTime: iso("2026-07-20T00:00:00.000Z"), // now+10d
        venue: { name: "Later Venue" },
        screenings: [{ movie: { documentId: "A" } }],
      },
    ]
    const { strapi } = buildEnrichStrapi(events)
    const service = publicApiService({ strapi })

    const result = await service.findScreeningInfoByMovies(["A"], NOW)

    expect(result.A).toEqual({
      nextScreeningDate: "2026-07-13T00:00:00.000Z",
      lastScreeningDate: "2026-07-08T00:00:00.000Z",
      venueName: "Next Venue",
    })
  })

  it("a past-only movie yields next=null and last=<latest past> with the past venue", async () => {
    const events = [
      {
        startDateTime: iso("2026-07-01T00:00:00.000Z"),
        venue: { name: "Older Venue" },
        screenings: [{ movie: { documentId: "B" } }],
      },
      {
        startDateTime: iso("2026-07-05T00:00:00.000Z"), // now-5d, latest past
        venue: { name: "Recent Past Venue" },
        screenings: [{ movie: { documentId: "B" } }],
      },
    ]
    const { strapi } = buildEnrichStrapi(events)
    const service = publicApiService({ strapi })

    const result = await service.findScreeningInfoByMovies(["B"], NOW)

    expect(result.B).toEqual({
      nextScreeningDate: null,
      lastScreeningDate: "2026-07-05T00:00:00.000Z",
      venueName: "Recent Past Venue",
    })
  })

  it("omits an id that has no matching event", async () => {
    const events = [
      {
        startDateTime: iso("2026-07-13T00:00:00.000Z"),
        venue: { name: "Venue A" },
        screenings: [{ movie: { documentId: "A" } }],
      },
    ]
    const { strapi } = buildEnrichStrapi(events)
    const service = publicApiService({ strapi })

    const result = await service.findScreeningInfoByMovies(["A", "C"], NOW)

    expect(result.A).toBeDefined()
    expect(result.C).toBeUndefined()
  })

  it("keys BOTH movies when one event's screenings reference two saved ids", async () => {
    const events = [
      {
        startDateTime: iso("2026-07-11T00:00:00.000Z"), // now+1d
        venue: { name: "Shared Venue" },
        screenings: [
          { movie: { documentId: "X" } },
          { movie: { documentId: "Y" } },
        ],
      },
    ]
    const { strapi } = buildEnrichStrapi(events)
    const service = publicApiService({ strapi })

    const result = await service.findScreeningInfoByMovies(["X", "Y"], NOW)

    expect(result.X).toEqual({
      nextScreeningDate: "2026-07-11T00:00:00.000Z",
      lastScreeningDate: null,
      venueName: "Shared Venue",
    })
    expect(result.Y).toEqual({
      nextScreeningDate: "2026-07-11T00:00:00.000Z",
      lastScreeningDate: null,
      venueName: "Shared Venue",
    })
  })
})
