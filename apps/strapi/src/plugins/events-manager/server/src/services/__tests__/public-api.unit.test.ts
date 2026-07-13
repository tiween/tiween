import publicApiService from "../public-api"

/**
 * Unit tests for events-manager `public-api.adjustInventory` (mocked Strapi).
 *
 * adjustInventory is now a single guarded, *relative* atomic increment on the
 * PUBLISHED sub-event row (raw knex), not a Document Service read-modify-write.
 * We assert its load-bearing invariants against a mocked knex query-builder
 * chain (`where`/`whereNotNull`/`andWhereRaw`/`update`/`first`):
 *  - it targets the physical table, scoped to `document_id` + `published_at`
 *  - a sale applies the in-SQL guard `tickets_sold + ? <= tickets_available`
 *    and writes `tickets_sold = tickets_sold + delta` (relative, via knex.raw)
 *  - the loser of a race (guarded UPDATE matches 0 rows) throws TICKET_SOLD_OUT
 *  - a refund (delta < 0) uses the `tickets_sold + ? >= 0` guard
 *  - 0 rows with no published row present → "not found"; with one present →
 *    TICKET_SOLD_OUT
 *  - unknown kind / zero delta are rejected before any DB access
 *  - the write binds to the caller's ambient transaction when one is active,
 *    else the base connection
 *
 * The atomic write means concurrency is now a contract, not a deferral: the
 * guard and the write are one statement, so an oversell simply matches 0 rows.
 */

interface QbMock {
  where: jest.Mock
  whereNotNull: jest.Mock
  andWhereRaw: jest.Mock
  update: jest.Mock
  first: jest.Mock
}

interface KnexMock {
  knex: jest.Mock & { raw: jest.Mock }
  qb: QbMock
}

function buildKnex(affected: number, exists: unknown): KnexMock {
  const qb: any = {
    where: jest.fn(() => qb),
    whereNotNull: jest.fn(() => qb),
    andWhereRaw: jest.fn(() => qb),
    update: jest.fn(async () => affected),
    first: jest.fn(async () => exists),
  }
  const knex: any = jest.fn(() => qb)
  knex.raw = jest.fn((sql: string, bindings: unknown[]) => ({
    __raw: sql,
    bindings,
  }))
  return { knex, qb }
}

/**
 * Two DISTINCT knex mocks (one for `db.connection`, one for the ambient trx
 * returned by `db.transaction().get()`) so a test can prove WHICH one the write
 * bound to. `active` is the builder adjustInventory will actually drive given
 * `inTransaction`.
 */
function buildStrapi({
  affected = 1,
  exists = { id: 1 },
  inTransaction = false,
}: { affected?: number; exists?: unknown; inTransaction?: boolean } = {}) {
  const conn = buildKnex(affected, exists)
  const trx = buildKnex(affected, exists)

  const strapi: any = {
    db: {
      inTransaction: jest.fn(() => inTransaction),
      connection: conn.knex,
      // `adjustInventory` awaits this then calls `.get()`; awaiting a plain
      // object is a no-op, so a sync-returning mock is fine.
      transaction: jest.fn(() => ({ get: () => trx.knex })),
    },
  }

  const active = inTransaction ? trx : conn
  return { strapi, conn, trx, knex: active.knex, qb: active.qb }
}

describe("public-api.adjustInventory (unit)", () => {
  it("runs one guarded relative increment on the published row for a fitting sale", async () => {
    const { strapi, knex, qb } = buildStrapi({ affected: 1 })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 2)
    ).resolves.toBeUndefined()

    expect(knex).toHaveBeenCalledWith("screenings")
    expect(qb.where).toHaveBeenCalledWith("document_id", "screening-1")
    expect(qb.whereNotNull).toHaveBeenCalledWith("published_at")
    expect(qb.andWhereRaw).toHaveBeenCalledWith(
      "tickets_sold + ? <= tickets_available",
      [2]
    )
    expect(knex.raw).toHaveBeenCalledWith("tickets_sold + ?", [2])
    expect(qb.update).toHaveBeenCalledWith({
      tickets_sold: { __raw: "tickets_sold + ?", bindings: [2] },
    })
    // Guard passed (affected > 0): no existence probe.
    expect(qb.first).not.toHaveBeenCalled()
  })

  it("resolves when the sale exactly fills capacity (affected 1)", async () => {
    const { strapi, qb } = buildStrapi({ affected: 1 })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("performance-1", "performance", 2)
    ).resolves.toBeUndefined()
    expect(qb.update).toHaveBeenCalled()
  })

  it("targets the performances table for the performance kind", async () => {
    const { strapi, knex } = buildStrapi({ affected: 1 })
    const service = publicApiService({ strapi })

    await service.adjustInventory("performance-1", "performance", 1)

    expect(knex).toHaveBeenCalledWith("performances")
  })

  it("throws TICKET_SOLD_OUT when the guarded UPDATE matches 0 rows (oversell)", async () => {
    const { strapi, qb } = buildStrapi({ affected: 0, exists: { id: 1 } })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 2)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
    // The guard is in-SQL: the UPDATE ran, then the existence probe disambiguated.
    expect(qb.update).toHaveBeenCalled()
    expect(qb.first).toHaveBeenCalled()
  })

  it("uses the >= 0 guard and resolves for a valid refund (delta < 0)", async () => {
    const { strapi, qb } = buildStrapi({ affected: 1 })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", -1)

    expect(qb.andWhereRaw).toHaveBeenCalledWith("tickets_sold + ? >= 0", [-1])
    expect(qb.andWhereRaw).not.toHaveBeenCalledWith(
      "tickets_sold + ? <= tickets_available",
      expect.anything()
    )
  })

  it("throws TICKET_SOLD_OUT when a refund would drive sold below zero (affected 0)", async () => {
    const { strapi } = buildStrapi({ affected: 0, exists: { id: 1 } })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", -1)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
  })

  it("throws /not found/ when no published row exists (affected 0, probe empty)", async () => {
    const { strapi, qb } = buildStrapi({ affected: 0, exists: null })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("missing", "screening", 1)
    ).rejects.toThrow(/not found/)
    expect(qb.first).toHaveBeenCalled()
  })

  it("rejects an unknown sub-event kind before touching the DB", async () => {
    const { strapi, conn, trx } = buildStrapi()
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("x", "balloon" as any, 1)
    ).rejects.toThrow(/Unknown sub-event kind/)
    expect(conn.knex).not.toHaveBeenCalled()
    expect(trx.knex).not.toHaveBeenCalled()
    expect(strapi.db.inTransaction).not.toHaveBeenCalled()
  })

  it("rejects a zero delta before touching the DB", async () => {
    const { strapi, conn } = buildStrapi()
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 0)
    ).rejects.toThrow(/non-zero integer/)
    expect(conn.knex).not.toHaveBeenCalled()
  })

  it("binds to the ambient transaction when inTransaction() is true", async () => {
    const { strapi, conn, trx } = buildStrapi({
      affected: 1,
      inTransaction: true,
    })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", 1)

    expect(strapi.db.transaction).toHaveBeenCalled()
    // The trx builder ran the write; the base connection was never used.
    expect(trx.qb.update).toHaveBeenCalled()
    expect(conn.qb.update).not.toHaveBeenCalled()
    expect(conn.knex).not.toHaveBeenCalled()
  })

  it("binds to the base connection when inTransaction() is false", async () => {
    const { strapi, conn, trx } = buildStrapi({
      affected: 1,
      inTransaction: false,
    })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", 1)

    expect(strapi.db.transaction).not.toHaveBeenCalled()
    expect(conn.qb.update).toHaveBeenCalled()
    expect(trx.qb.update).not.toHaveBeenCalled()
    expect(trx.knex).not.toHaveBeenCalled()
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
