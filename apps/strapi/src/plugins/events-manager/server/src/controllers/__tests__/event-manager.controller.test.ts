/**
 * The events-manager admin endpoints, over real HTTP, against a Strapi booted
 * on SQLite.
 *
 * WHICH LAYER THIS TESTS: `request(strapi.server.httpServer)` with a real admin
 * session token — the same transport the admin panel uses. Route registration,
 * the admin-auth boundary and the response envelope are all exercised, so a
 * handler that is never routed, or a route left publicly reachable, fails here.
 *
 * SCOPE NOTE (story 2B.16 AC#3): an earlier revision of this file built a Koa
 * `ctx` stub and invoked the handler through the plugin controller registry,
 * justified at the time by the absence of an admin-JWT helper — an admin route
 * rejects a users-permissions JWT, so there was no way to authenticate. That
 * helper now exists (`tests/helpers/admin.ts` → `createAdminSession`), so the
 * deviation has lapsed and AC#3 is met directly: no `ctx` is constructed and no
 * handler is reached through the registry.
 *
 * Two facts worth not re-deriving:
 *  - the handler is `createBulkScreenings`, not `createBulkShowtimes` (the AC
 *    text in 2B.16 is stale);
 *  - admin-type plugin routes mount at `/events-manager/…` — with NO `/admin`
 *    and NO `/api` segment (the admin UI calls `post("/events-manager/seed")`).
 *
 * Named `*.controller.test.ts` so it stays in the opt-in integration project
 * (`yarn test:integration`) and never runs in the default `yarn test` gate.
 * Run it through that script, never bare `jest`: the plugin resolves from
 * `dist/`, and the script refreshes the build first.
 */

import request from "supertest"

import type { Core } from "@strapi/strapi"
import type { Response } from "supertest"

import {
  cleanupContent,
  seedEvent,
  seedMovie,
  seedScreening,
  seedVenue,
} from "../../../../../../../tests/fixtures/events"
import { createAdminSession } from "../../../../../../../tests/helpers/admin"
import { seedUserAndJwt } from "../../../../../../../tests/helpers/auth"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../../tests/helpers/strapi"

// Booting Strapi costs 5-15s and minting the admin session adds a bcrypt user
// create plus a refresh/access token exchange, all inside the first test's
// budget. 60s left almost no headroom on a cold dist/ build; 120s matches the
// two sibling boot-based suites.
jest.setTimeout(120000)

const SCREENING_UID = "plugin::events-manager.screening"
const EVENT_UID = "plugin::events-manager.event"

const BULK_SCREENINGS = "/events-manager/bulk-screenings"
const DUPLICATE_EVENT = "/events-manager/duplicate-event"
const TICKET_INVENTORY = "/events-manager/ticket-inventory"
const EVENT_STATS = "/events-manager/event-stats"

/** Read-back page size, matching `cleanupContent`'s own explicit limit. */
const READ_BACK_LIMIT = 100
/** Every fixture and every handler below writes drafts; never rely on the default. */
const DRAFT = "draft" as const

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>

const api = () => request(strapi.server.httpServer)

/** Attach the admin session token. A users-permissions JWT is NOT accepted. */
const auth = <T extends { set: (key: string, value: string) => T }>(req: T) =>
  req.set("Authorization", `Bearer ${adminToken}`)

/** Raw response summary, for failure output when an assertion does not hold. */
const detail = (res: Response): string =>
  `HTTP ${res.status} — body: ${res.text || JSON.stringify(res.body)}`

/**
 * Null-safe read of Strapi's error envelope.
 *
 * `res.body.error.message` read directly throws a TypeError whenever the
 * response is not the expected 400 envelope (a 500, an HTML error page, an
 * empty body) — and that TypeError then MASKS the real status and payload,
 * which is the one thing worth seeing when the test fails.
 */
const errorMessage = (res: Response): string | undefined => {
  const body = res.body as { error?: { message?: unknown } } | undefined
  const message = body?.error?.message
  return typeof message === "string" ? message : undefined
}

/** Assert a 400 whose message matches, with the raw payload on failure. */
function expectBadRequest(res: Response, pattern: RegExp): void {
  expect(detail(res)).toContain("HTTP 400")
  // Falls back to the raw summary so a missing envelope is reported as itself
  // rather than as `undefined`.
  expect(errorMessage(res) ?? detail(res)).toMatch(pattern)
}

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy

  // Without this, a minting failure surfaces later as `Bearer undefined` 401s
  // that read as "the route rejected a valid admin" — the wrong diagnosis.
  if (typeof adminToken !== "string" || adminToken.length === 0) {
    throw new Error(
      `Admin session token was not minted (got ${JSON.stringify(adminToken)}); every authenticated test below would fail for the wrong reason.`
    )
  }
})

afterAll(async () => {
  // `cleanupStrapi` MUST run even if user deletion throws: otherwise the booted
  // instance, its DB pool and its cron timers leak and jest never exits.
  try {
    await destroyAdmin?.()
  } finally {
    await cleanupStrapi()
  }
})

afterEach(async () => {
  await cleanupContent(strapi)
})

describe("POST /events-manager/bulk-screenings", () => {
  it("creates the screenings and returns them (200)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const movie = await seedMovie(strapi)

    const res = await auth(api().post(BULK_SCREENINGS)).send({
      eventId: event.documentId,
      movieId: movie.documentId,
      dates: ["2026-07-01", "2026-07-02"],
      time: "20:00",
      ticketsAvailable: 100,
    })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/created 2 screenings/i)
    expect(res.body.data).toHaveLength(2)

    // A 200 only says the request was shaped acceptably — read the rows back.
    const saved = await strapi.documents(SCREENING_UID).findMany({
      filters: { event: { documentId: event.documentId } },
      populate: ["movie"],
      limit: READ_BACK_LIMIT,
      status: DRAFT,
    })
    expect(saved).toHaveLength(2)
    expect(saved.every((s) => s.ticketsAvailable === 100)).toBe(true)
    expect(
      saved
        .map((s) => s.startDateTime)
        .sort((a, b) => String(a).localeCompare(String(b)))
    ).toEqual(["2026-07-01T20:00:00.000Z", "2026-07-02T20:00:00.000Z"])
  })

  it("400s when eventId is missing", async () => {
    const res = await auth(api().post(BULK_SCREENINGS)).send({
      movieId: "m1",
      dates: ["2026-07-01"],
      time: "20:00",
    })

    expectBadRequest(res, /missing required/i)
  })

  it("400s when dates is missing", async () => {
    const res = await auth(api().post(BULK_SCREENINGS)).send({
      eventId: "e1",
      movieId: "m1",
      time: "20:00",
    })

    expectBadRequest(res, /missing required/i)
  })

  it("400s when the service rejects the payload (invalid date)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const movie = await seedMovie(strapi)

    const res = await auth(api().post(BULK_SCREENINGS)).send({
      eventId: event.documentId,
      movieId: movie.documentId,
      dates: ["2026-02-30"],
      time: "20:00",
    })

    expectBadRequest(res, /not a valid calendar date/i)

    // The up-front validation is what keeps a bad entry from writing partials.
    const saved = await strapi
      .documents(SCREENING_UID)
      .findMany({ limit: READ_BACK_LIMIT, status: DRAFT })
    expect(saved).toHaveLength(0)
  })
})

describe("POST /events-manager/duplicate-event", () => {
  it("returns the copy, with a new unique slug (200)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })

    const res = await auth(api().post(DUPLICATE_EVENT)).send({
      eventId: event.documentId,
      newTitle: "Encore",
    })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/duplicated successfully/i)
    expect(res.body.data.title).toBe("Encore")
    expect(res.body.data.documentId).not.toBe(event.documentId)
    expect(res.body.data.slug).not.toBe(event.slug)
    expect(res.body.data.slug).toContain(`${event.slug}-copy-`)

    const events = await strapi
      .documents(EVENT_UID)
      .findMany({ limit: READ_BACK_LIMIT, status: DRAFT })
    expect(events).toHaveLength(2)
  })

  it("400s when eventId is missing", async () => {
    const res = await auth(api().post(DUPLICATE_EVENT)).send({})

    expectBadRequest(res, /missing required field: eventid/i)
  })

  it("400s for a non-existent eventId (service throws 'Event not found')", async () => {
    const res = await auth(api().post(DUPLICATE_EVENT)).send({
      eventId: "non-existent",
    })

    expectBadRequest(res, /event not found/i)
  })
})

describe("PUT /events-manager/ticket-inventory", () => {
  it("persists the new counts (200)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const screening = await seedScreening(strapi, {
      eventDocumentId: event.documentId,
    })

    const res = await auth(api().put(TICKET_INVENTORY)).send({
      subEventId: screening.documentId,
      kind: "screening",
      ticketsAvailable: 200,
      ticketsSold: 50,
    })

    expect(res.status).toBe(200)
    expect(res.body.data.ticketsAvailable).toBe(200)
    expect(res.body.data.ticketsSold).toBe(50)

    const saved = await strapi.documents(SCREENING_UID).findOne({
      documentId: screening.documentId,
      status: DRAFT,
    })
    expect(saved?.ticketsAvailable).toBe(200)
    expect(saved?.ticketsSold).toBe(50)
  })

  it("400s when subEventId is missing", async () => {
    const res = await auth(api().put(TICKET_INVENTORY)).send({
      ticketsAvailable: 100,
    })

    expectBadRequest(res, /missing required/i)
  })

  it("400s when ticketsAvailable is undefined", async () => {
    const res = await auth(api().put(TICKET_INVENTORY)).send({
      subEventId: "s1",
    })

    expectBadRequest(res, /missing required/i)
  })

  it("400s when ticketsSold exceeds ticketsAvailable (service bounds check)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const screening = await seedScreening(strapi, {
      eventDocumentId: event.documentId,
      ticketsAvailable: 50,
      ticketsSold: 10,
    })

    const res = await auth(api().put(TICKET_INVENTORY)).send({
      subEventId: screening.documentId,
      kind: "screening",
      ticketsAvailable: 20,
      ticketsSold: 30,
    })

    expectBadRequest(res, /cannot exceed ticketsavailable/i)

    // The rejected write left the row untouched.
    const saved = await strapi.documents(SCREENING_UID).findOne({
      documentId: screening.documentId,
      status: DRAFT,
    })
    expect(saved?.ticketsAvailable).toBe(50)
    expect(saved?.ticketsSold).toBe(10)
  })
})

describe("GET /events-manager/event-stats/:eventId", () => {
  it("returns the aggregate payload (200)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    await seedScreening(strapi, {
      eventDocumentId: event.documentId,
      ticketsAvailable: 100,
      ticketsSold: 25,
    })

    const res = await auth(api().get(`${EVENT_STATS}/${event.documentId}`))

    expect(res.status).toBe(200)
    expect(res.body.data.eventId).toBe(event.documentId)
    expect(res.body.data.screeningCount).toBe(1)
    expect(res.body.data.subEventCount).toBe(1)
    expect(res.body.data.totalTicketsAvailable).toBe(100)
    expect(res.body.data.totalTicketsSold).toBe(25)
    expect(res.body.data.remainingTickets).toBe(75)
    expect(res.body.data.soldPercentage).toBe(25)
  })

  it("400s for a non-existent eventId (service throws)", async () => {
    const res = await auth(api().get(`${EVENT_STATS}/non-existent`))

    expectBadRequest(res, /event not found/i)
  })

  it("404s when the :eventId segment is absent — the router, not the handler", async () => {
    // The old ctx-stub suite asserted 400 here by handing the handler an empty
    // `params`. Over real HTTP that state is unreachable: with no segment the
    // path does not match the route at all, so the guard inside the handler is
    // dead code rather than a 400 the client can ever observe.
    const res = await auth(api().get(`${EVENT_STATS}/`))

    expect(res.status).toBe(404)
  })
})

describe("admin-auth boundary", () => {
  // The assertion the ctx-stub pattern structurally could not make: these four
  // routes are admin-type with no `auth: false`, so an unauthenticated caller
  // must never reach the handler. A route accidentally opened up fails here.
  it("401s on bulk-screenings without an Authorization header", async () => {
    const res = await api().post(BULK_SCREENINGS).send({})
    expect(res.status).toBe(401)
  })

  it("401s on duplicate-event without an Authorization header", async () => {
    const res = await api().post(DUPLICATE_EVENT).send({})
    expect(res.status).toBe(401)
  })

  it("401s on ticket-inventory without an Authorization header", async () => {
    const res = await api().put(TICKET_INVENTORY).send({})
    expect(res.status).toBe(401)
  })

  it("401s on event-stats without an Authorization header", async () => {
    const res = await api().get(`${EVENT_STATS}/some-id`)
    expect(res.status).toBe(401)
  })

  it("rejects a users-permissions JWT — the reason the admin helper exists", async () => {
    // The claim "an admin route does not accept a users-permissions JWT" is the
    // entire justification for `tests/helpers/admin.ts`, and for the ctx-stub
    // deviation that preceded this suite. It was asserted in prose and verified
    // nowhere; a valid token from the OTHER auth system is the only way to tell
    // "admin auth is enforced" apart from "any bearer token gets in".
    const user = await seedUserAndJwt(strapi)

    const res = await api()
      .post(DUPLICATE_EVENT)
      .set("Authorization", `Bearer ${user.jwt}`)
      .send({ eventId: "irrelevant" })

    expect(detail(res)).toContain("HTTP 401")
  })
})
