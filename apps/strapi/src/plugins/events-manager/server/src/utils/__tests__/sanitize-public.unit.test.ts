import {
  sanitizeEventsListResult,
  sanitizePublicEvent,
  sanitizeScreening,
  sanitizeTicketTiersResult,
  sanitizeVenue,
} from "../sanitize-public"

/**
 * Unit tests for the pure public-boundary sanitizers (DW-18, DW-112).
 * Covers every row of the spec I/O matrix.
 */

describe("sanitizeScreening", () => {
  it("marks a fully-sold screening soldOut and drops the raw counts (avail=40 sold=60)", () => {
    const out = sanitizeScreening({
      id: 1,
      ticketsAvailable: 40,
      ticketsSold: 60,
    }) as Record<string, unknown>

    expect(out.soldOut).toBe(true)
    expect(out).not.toHaveProperty("ticketsAvailable")
    expect(out).not.toHaveProperty("ticketsSold")
    expect(out.id).toBe(1)
  })

  it("is not sold-out when sales are below capacity (avail=40 sold=10)", () => {
    const out = sanitizeScreening({
      ticketsAvailable: 40,
      ticketsSold: 10,
    }) as Record<string, unknown>

    expect(out.soldOut).toBe(false)
  })

  it("treats unconfigured capacity as NOT sold-out (avail=0 sold=0)", () => {
    const out = sanitizeScreening({
      ticketsAvailable: 0,
      ticketsSold: 0,
    }) as Record<string, unknown>

    expect(out.soldOut).toBe(false)
  })

  it("coerces string-decimal inputs from the pg driver", () => {
    const out = sanitizeScreening({
      ticketsAvailable: "40.00",
      ticketsSold: "40",
    }) as Record<string, unknown>

    expect(out.soldOut).toBe(true)
    expect(out).not.toHaveProperty("ticketsAvailable")
    expect(out).not.toHaveProperty("ticketsSold")
  })

  it("strips raw counts from an embedded ticketTiers[] component (fail-closed)", () => {
    const out = sanitizeScreening({
      id: 1,
      ticketsAvailable: 40,
      ticketsSold: 10,
      ticketTiers: [
        {
          type: "standard",
          price: 15,
          ticketsAvailable: 40,
          ticketsSold: 10,
          restrictionNote: null,
        },
      ],
    }) as Record<string, unknown>

    const tier = (out.ticketTiers as Record<string, unknown>[])[0]
    expect(tier).not.toHaveProperty("ticketsAvailable")
    expect(tier).not.toHaveProperty("ticketsSold")
    expect(tier.type).toBe("standard")
    expect(tier.price).toBe(15)
  })

  it("does not mutate its input", () => {
    const input = { ticketsAvailable: 40, ticketsSold: 60 }
    sanitizeScreening(input)
    expect(input.ticketsAvailable).toBe(40)
    expect(input.ticketsSold).toBe(60)
  })

  it("passes a non-object / null screening through unchanged", () => {
    expect(sanitizeScreening(null)).toBeNull()
    expect(sanitizeScreening(undefined)).toBeUndefined()
    expect(sanitizeScreening(42 as unknown)).toBe(42)
  })
})

describe("sanitizeVenue", () => {
  it("keeps only allowlisted keys and drops internal fields", () => {
    const out = sanitizeVenue({
      id: 7,
      documentId: "v1",
      name: "Cinéma Le Palace",
      slug: "le-palace",
      address: "12 Av. Habib Bourguiba",
      phone: "+216 71 000 000",
      cityRef: { id: 3, name: "Tunis", slug: "tunis" },
      geo: { latitude: 36.8, longitude: 10.18 },
      email: "secret@venue.tn",
      website: "https://venue.tn",
      description: "internal",
      status: "published",
      capacity: 500,
      type: "cinema",
      manager: { id: 9 },
    }) as Record<string, unknown>

    // allowlisted present
    expect(out.name).toBe("Cinéma Le Palace")
    expect(out.phone).toBe("+216 71 000 000")
    expect(out.cityRef).toEqual({ id: 3, name: "Tunis", slug: "tunis" })
    expect(out.geo).toEqual({ latitude: 36.8, longitude: 10.18 })
    // internal absent
    expect(out).not.toHaveProperty("email")
    expect(out).not.toHaveProperty("capacity")
    expect(out).not.toHaveProperty("status")
    expect(out).not.toHaveProperty("website")
    expect(out).not.toHaveProperty("manager")
  })

  it("passes null/undefined through unchanged", () => {
    expect(sanitizeVenue(null)).toBeNull()
    expect(sanitizeVenue(undefined)).toBeUndefined()
  })
})

describe("sanitizePublicEvent", () => {
  it("sanitizes venue and screenings while preserving the movie graph", () => {
    const out = sanitizePublicEvent({
      documentId: "e1",
      venue: { name: "V", email: "x@y.z", capacity: 100 },
      screenings: [{ id: 1, ticketsAvailable: 10, ticketsSold: 10 }],
      movie: { title: "Dune", cast: [{ name: "actor" }] },
    }) as Record<string, unknown>

    const venue = out.venue as Record<string, unknown>
    expect(venue.name).toBe("V")
    expect(venue).not.toHaveProperty("email")
    expect(venue).not.toHaveProperty("capacity")

    const screening = (out.screenings as Record<string, unknown>[])[0]
    expect(screening.soldOut).toBe(true)
    expect(screening).not.toHaveProperty("ticketsSold")

    expect(out.movie).toEqual({ title: "Dune", cast: [{ name: "actor" }] })
  })

  it("sanitizes the performances relation symmetrically with screenings", () => {
    const out = sanitizePublicEvent({
      documentId: "e-play",
      performances: [{ id: 5, ticketsAvailable: 20, ticketsSold: 20 }],
    }) as Record<string, unknown>

    const perf = (out.performances as Record<string, unknown>[])[0]
    expect(perf.soldOut).toBe(true)
    expect(perf).not.toHaveProperty("ticketsAvailable")
    expect(perf).not.toHaveProperty("ticketsSold")
  })

  it("passes an event with screenings:null and no venue through without throwing", () => {
    expect(() =>
      sanitizePublicEvent({ documentId: "e2", screenings: null })
    ).not.toThrow()
    const out = sanitizePublicEvent({
      documentId: "e2",
      screenings: null,
    }) as Record<string, unknown>
    expect(out.screenings).toBeNull()
    expect(out).not.toHaveProperty("venue")
  })

  it("passes a non-object / null event through unchanged", () => {
    expect(sanitizePublicEvent(null)).toBeNull()
    expect(sanitizePublicEvent(undefined)).toBeUndefined()
  })
})

describe("sanitizeEventsListResult", () => {
  it("sanitizes each event in data and preserves meta untouched", () => {
    const meta = {
      pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
    }
    const out = sanitizeEventsListResult({
      data: [{ documentId: "e1", venue: { name: "V", email: "x@y.z" } }],
      meta,
    })

    const venue = (out.data as Record<string, unknown>[])[0].venue as Record<
      string,
      unknown
    >
    expect(venue).not.toHaveProperty("email")
    expect(out.meta).toBe(meta)
  })

  it("passes a non-array data through unchanged", () => {
    const out = sanitizeEventsListResult({ data: null, meta: {} })
    expect(out.data).toBeNull()
  })

  it("passes a nullish result through unchanged", () => {
    expect(sanitizeEventsListResult(null as never)).toBeNull()
    expect(sanitizeEventsListResult(undefined as never)).toBeUndefined()
  })
})

describe("sanitizeTicketTiersResult", () => {
  it("strips raw counts but keeps remaining/soldOut/price/type", () => {
    const out = sanitizeTicketTiersResult({
      subEventId: "sc1",
      kind: "screening",
      currency: "TND",
      tiers: [
        {
          type: "standard",
          price: 15,
          ticketsAvailable: 100,
          ticketsSold: 100,
          remaining: 0,
          soldOut: true,
          restrictionNote: null,
        },
      ],
    })

    const tier = out.tiers[0]
    expect(tier).not.toHaveProperty("ticketsAvailable")
    expect(tier).not.toHaveProperty("ticketsSold")
    expect(tier.remaining).toBe(0)
    expect(tier.soldOut).toBe(true)
    expect(tier.price).toBe(15)
    expect(tier.type).toBe("standard")
    expect(out.currency).toBe("TND")
  })

  it("does not mutate its input", () => {
    const input = {
      tiers: [{ type: "standard", ticketsAvailable: 100, ticketsSold: 30 }],
    }
    sanitizeTicketTiersResult(input)
    expect(input.tiers[0].ticketsAvailable).toBe(100)
  })

  it("passes a non-array tiers through unchanged", () => {
    const out = sanitizeTicketTiersResult({ tiers: null })
    expect(out.tiers).toBeNull()
  })

  it("passes a nullish result through unchanged", () => {
    expect(sanitizeTicketTiersResult(null as never)).toBeNull()
    expect(sanitizeTicketTiersResult(undefined as never)).toBeUndefined()
  })
})
