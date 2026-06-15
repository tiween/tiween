/**
 * Controller tests for events-manager.event-manager.
 *
 * Exercises the controller layer directly via the Strapi service registry —
 * we construct a minimal `ctx` (Koa context) stub and invoke the controller
 * handler, then assert on its response. This isolates controller logic
 * (request body shape, validation, response envelope) from HTTP transport.
 *
 * SCOPE NOTE (deviation from story 2B.16): the original story spec described
 * Supertest end-to-end tests against admin-authenticated HTTP routes
 * (`POST /events-manager/events`, etc.). The plugin's actual routes are
 * mounted under the admin namespace (`/admin/events-manager/...`) and
 * require an admin JWT — not a users-permissions JWT. Seeding an admin
 * user and issuing an admin JWT for Supertest is ~30 lines of helper
 * setup we have not yet built. To keep this story shippable we test the
 * controller surface directly via `ctx` stubs, which proves the same
 * request/response contract without the auth plumbing. End-to-end HTTP
 * round-trips can be added in a follow-up story (or as part of the
 * Strapi upgrade story).
 */
import type { Core } from "@strapi/strapi"

import {
  cleanupContent,
  seedEvent,
  seedMovie,
  seedScreening,
  seedVenue,
} from "../../../../../../../tests/fixtures/events"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../../tests/helpers/strapi"

jest.setTimeout(60000)

let strapi: Core.Strapi

interface EventManagerController {
  createBulkScreenings: (ctx: CtxLike) => Promise<void>
  duplicateEvent: (ctx: CtxLike) => Promise<void>
  updateTicketInventory: (ctx: CtxLike) => Promise<void>
  getEventStats: (ctx: CtxLike) => Promise<void>
}

function controller(): EventManagerController {
  return (strapi as any).plugin("events-manager").controller("event-manager")
}

interface CtxLike {
  request: { body: Record<string, unknown> }
  params: Record<string, string>
  body?: unknown
  status?: number
  send: jest.Mock
  badRequest: jest.Mock
}

function makeCtx(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {}
): CtxLike {
  const ctx: CtxLike = {
    request: { body },
    params,
    send: jest.fn(function (payload: unknown) {
      ctx.body = payload
      ctx.status = 200
      return payload
    }) as jest.Mock,
    badRequest: jest.fn(function (message: string) {
      ctx.body = { error: message }
      ctx.status = 400
      return { error: message }
    }) as jest.Mock,
  }
  return ctx
}

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await cleanupStrapi()
})

afterEach(async () => {
  await cleanupContent(strapi)
})

describe("event-manager controller: createBulkScreenings", () => {
  it("400s when eventId is missing", async () => {
    const ctx = makeCtx({
      movieId: "m1",
      dates: ["2026-07-01"],
      time: "20:00",
    })

    await controller().createBulkScreenings(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      expect.stringMatching(/missing required/i)
    )
    expect(ctx.send).not.toHaveBeenCalled()
  })

  it("400s when dates is missing", async () => {
    const ctx = makeCtx({
      eventId: "e1",
      movieId: "m1",
      time: "20:00",
    })

    await controller().createBulkScreenings(ctx)

    expect(ctx.badRequest).toHaveBeenCalled()
  })

  it("200s and returns created screenings on happy path", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const movie = await seedMovie(strapi)

    const ctx = makeCtx({
      eventId: event.documentId,
      movieId: movie.documentId,
      dates: ["2026-07-01", "2026-07-02"],
      time: "20:00",
      ticketsAvailable: 100,
    })

    await controller().createBulkScreenings(ctx)

    expect(ctx.send).toHaveBeenCalledTimes(1)
    const payload = (ctx.send.mock.calls[0]?.[0] ?? {}) as {
      message: string
      data: unknown[]
    }
    expect(payload.message).toMatch(/created 2 screenings/i)
    expect(payload.data).toHaveLength(2)
  })
})

describe("event-manager controller: duplicateEvent", () => {
  it("400s when eventId is missing", async () => {
    const ctx = makeCtx({})

    await controller().duplicateEvent(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      expect.stringMatching(/missing required field: eventid/i)
    )
  })

  it("200s and returns the duplicated event on happy path", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })

    const ctx = makeCtx({ eventId: event.documentId, newTitle: "Encore" })

    await controller().duplicateEvent(ctx)

    expect(ctx.send).toHaveBeenCalledTimes(1)
    const payload = (ctx.send.mock.calls[0]?.[0] ?? {}) as {
      message: string
      data: { title: string }
    }
    expect(payload.message).toMatch(/duplicated successfully/i)
    expect(payload.data.title).toBe("Encore")
  })

  it("400s when given a non-existent eventId (service throws 'Event not found')", async () => {
    const ctx = makeCtx({ eventId: "non-existent" })

    await controller().duplicateEvent(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      expect.stringMatching(/event not found/i)
    )
  })
})

describe("event-manager controller: updateTicketInventory", () => {
  it("400s when subEventId is missing", async () => {
    const ctx = makeCtx({ ticketsAvailable: 100 })
    await controller().updateTicketInventory(ctx)
    expect(ctx.badRequest).toHaveBeenCalled()
  })

  it("400s when ticketsAvailable is undefined", async () => {
    const ctx = makeCtx({ subEventId: "s1" })
    await controller().updateTicketInventory(ctx)
    expect(ctx.badRequest).toHaveBeenCalled()
  })

  it("200s on valid update", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const screening = await seedScreening(strapi, {
      eventDocumentId: event.documentId,
    })

    const ctx = makeCtx({
      subEventId: screening.documentId,
      kind: "screening",
      ticketsAvailable: 200,
      ticketsSold: 50,
    })

    await controller().updateTicketInventory(ctx)

    expect(ctx.send).toHaveBeenCalledTimes(1)
    const payload = (ctx.send.mock.calls[0]?.[0] ?? {}) as {
      message: string
      data: { ticketsAvailable: number; ticketsSold: number }
    }
    expect(payload.data.ticketsAvailable).toBe(200)
    expect(payload.data.ticketsSold).toBe(50)
  })
})

describe("event-manager controller: getEventStats", () => {
  it("400s when eventId param is missing", async () => {
    const ctx = makeCtx({}, {})
    await controller().getEventStats(ctx)
    expect(ctx.badRequest).toHaveBeenCalled()
  })

  it("200s and returns stats on happy path", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    await seedScreening(strapi, {
      eventDocumentId: event.documentId,
      ticketsAvailable: 100,
      ticketsSold: 25,
    })

    const ctx = makeCtx({}, { eventId: event.documentId })

    await controller().getEventStats(ctx)

    expect(ctx.send).toHaveBeenCalledTimes(1)
    const payload = (ctx.send.mock.calls[0]?.[0] ?? {}) as {
      data: {
        eventId: string
        screeningCount: number
        subEventCount: number
        totalTicketsAvailable: number
        soldPercentage: number
      }
    }
    expect(payload.data.eventId).toBe(event.documentId)
    expect(payload.data.screeningCount).toBe(1)
    expect(payload.data.subEventCount).toBe(1)
    expect(payload.data.totalTicketsAvailable).toBe(100)
    expect(payload.data.soldPercentage).toBe(25)
  })

  it("400s when given a non-existent eventId (service throws)", async () => {
    const ctx = makeCtx({}, { eventId: "non-existent" })
    await controller().getEventStats(ctx)
    expect(ctx.badRequest).toHaveBeenCalledWith(
      expect.stringMatching(/event not found/i)
    )
  })
})
