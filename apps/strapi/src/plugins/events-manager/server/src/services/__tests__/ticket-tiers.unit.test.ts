import ticketTiersService from "../ticket-tiers"

/**
 * Unit tests for the public `ticket-tiers` read service (mocked Strapi,
 * Story 6.1). Document Service API only. Covers the I/O matrix:
 *  - remaining/soldOut computation and restriction passthrough
 *  - `restrictionNote` defaults to null when absent
 *  - performance fallback when `kind` is absent and no screening matches
 *  - not-found (neither screening nor performance) -> null
 *  - currency sourced from plugin config (not a hardcoded literal)
 */

const SCREENING_UID = "plugin::events-manager.screening"
const PERFORMANCE_UID = "plugin::events-manager.performance"

/**
 * Build a mocked Strapi whose `documents(uid).findOne` resolves from a per-UID
 * map, plus a `config.get` that returns the configured currency (default TND).
 *
 * Every `findOne` invocation is recorded in `findOneCalls` (with its `uid` and
 * the raw query args) so tests can assert the data-access contract — critically
 * that the public read filters `status: "published"` (never leaking drafts) and
 * populates `ticketTiers`. The mock deliberately ignores these args when
 * resolving, so without an explicit assertion a dropped filter/populate would
 * pass silently.
 */
function buildStrapi(
  byUid: Partial<Record<string, unknown>>,
  currency = "TND"
) {
  const findOneCalls: Array<{ uid: string; args: unknown }> = []
  const strapi: any = {
    documents: jest.fn((uid: string) => ({
      findOne: (args: unknown) => {
        findOneCalls.push({ uid, args })
        return Promise.resolve(byUid[uid] !== undefined ? byUid[uid] : null)
      },
    })),
    config: {
      get: jest.fn((_key: string, fallback: string) => currency ?? fallback),
    },
  }
  return { strapi, findOneCalls }
}

describe("ticket-tiers service.findSubEventTicketTiers (unit)", () => {
  it("computes remaining/soldOut, passes restriction through, sources currency from config", async () => {
    const screening = {
      documentId: "sc1",
      startDateTime: "2026-07-20T20:00:00.000Z",
      ticketTiers: [
        {
          type: "standard",
          price: 15,
          ticketsAvailable: 100,
          ticketsSold: 30,
        },
        {
          type: "reduced",
          price: 10,
          ticketsAvailable: 50,
          ticketsSold: 5,
          restrictionNote: "sur justificatif",
        },
        {
          type: "vip",
          price: 40,
          ticketsAvailable: 10,
          ticketsSold: 10,
        },
      ],
    }
    const { strapi } = buildStrapi({ [SCREENING_UID]: screening }, "TND")
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("sc1")

    expect(result).not.toBeNull()
    expect(result?.kind).toBe("screening")
    expect(result?.subEventId).toBe("sc1")
    expect(result?.startDateTime).toBe("2026-07-20T20:00:00.000Z")
    expect(result?.currency).toBe("TND")
    expect(result?.tiers).toEqual([
      {
        type: "standard",
        price: 15,
        ticketsAvailable: 100,
        ticketsSold: 30,
        remaining: 70,
        soldOut: false,
        restrictionNote: null,
      },
      {
        type: "reduced",
        price: 10,
        ticketsAvailable: 50,
        ticketsSold: 5,
        remaining: 45,
        soldOut: false,
        restrictionNote: "sur justificatif",
      },
      {
        type: "vip",
        price: 40,
        ticketsAvailable: 10,
        ticketsSold: 10,
        remaining: 0,
        soldOut: true,
        restrictionNote: null,
      },
    ])
  })

  it("coerces string-decimal numerics from the Postgres driver (price '15.50' -> 15.5, not 0)", async () => {
    // The `pg` driver returns NUMERIC/decimal columns as strings; the service
    // must coerce them so prices don't collapse to 0 in production.
    const screening = {
      documentId: "sc-pg",
      startDateTime: null,
      ticketTiers: [
        {
          type: "standard",
          price: "15.50",
          ticketsAvailable: "100",
          ticketsSold: "40",
        },
      ],
    }
    const { strapi } = buildStrapi({ [SCREENING_UID]: screening })
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("sc-pg")

    expect(result?.tiers[0]).toEqual({
      type: "standard",
      price: 15.5,
      ticketsAvailable: 100,
      ticketsSold: 40,
      remaining: 60,
      soldOut: false,
      restrictionNote: null,
    })
  })

  it("clamps remaining to 0 when oversold", async () => {
    const screening = {
      documentId: "sc2",
      startDateTime: null,
      ticketTiers: [
        { type: "standard", price: 20, ticketsAvailable: 5, ticketsSold: 12 },
      ],
    }
    const { strapi } = buildStrapi({ [SCREENING_UID]: screening })
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("sc2")

    expect(result?.tiers[0].remaining).toBe(0)
    expect(result?.tiers[0].soldOut).toBe(true)
  })

  it("returns an empty tiers array when the sub-event has no tiers", async () => {
    const screening = {
      documentId: "sc3",
      startDateTime: "2026-07-21T18:00:00.000Z",
      ticketTiers: [],
    }
    const { strapi } = buildStrapi({ [SCREENING_UID]: screening })
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("sc3")

    expect(result).not.toBeNull()
    expect(result?.tiers).toEqual([])
  })

  it("falls back to performance when no screening matches and kind is absent", async () => {
    const performance = {
      documentId: "pf1",
      startDateTime: "2026-08-01T19:00:00.000Z",
      ticketTiers: [
        { type: "standard", price: 25, ticketsAvailable: 80, ticketsSold: 10 },
      ],
    }
    const { strapi } = buildStrapi({ [PERFORMANCE_UID]: performance })
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("pf1")

    expect(result?.kind).toBe("performance")
    expect(result?.subEventId).toBe("pf1")
    expect(result?.tiers).toHaveLength(1)
  })

  it("reads the performance directly when kind='performance'", async () => {
    const performance = {
      documentId: "pf2",
      startDateTime: null,
      ticketTiers: [],
    }
    const { strapi } = buildStrapi({ [PERFORMANCE_UID]: performance })
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("pf2", "performance")

    expect(result?.kind).toBe("performance")
    // Only the performance UID should have been read.
    expect(strapi.documents).toHaveBeenCalledWith(PERFORMANCE_UID)
    expect(strapi.documents).not.toHaveBeenCalledWith(SCREENING_UID)
  })

  it("returns null when neither a screening nor a performance matches", async () => {
    const { strapi } = buildStrapi({})
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("nope")

    expect(result).toBeNull()
  })

  it("reads only PUBLISHED sub-events and populates ticketTiers (public route must not leak drafts, and a dropped populate would empty every tier list)", async () => {
    const screening = {
      documentId: "sc-pub",
      startDateTime: null,
      ticketTiers: [],
    }
    const { strapi, findOneCalls } = buildStrapi({
      [SCREENING_UID]: screening,
    })
    const service = ticketTiersService({ strapi })

    await service.findSubEventTicketTiers("sc-pub")

    // The only read must be the published screening, populating ticketTiers.
    expect(findOneCalls).toHaveLength(1)
    expect(findOneCalls[0]).toEqual({
      uid: SCREENING_UID,
      args: {
        documentId: "sc-pub",
        status: "published",
        populate: { ticketTiers: true },
      },
    })
  })

  it("uses the configured currency (not a hardcoded literal)", async () => {
    const screening = {
      documentId: "sc4",
      startDateTime: null,
      ticketTiers: [],
    }
    const { strapi } = buildStrapi({ [SCREENING_UID]: screening }, "EUR")
    const service = ticketTiersService({ strapi })

    const result = await service.findSubEventTicketTiers("sc4")

    expect(result?.currency).toBe("EUR")
    expect(strapi.config.get).toHaveBeenCalledWith(
      "plugin::ticketing.defaultCurrency",
      "TND"
    )
  })
})
