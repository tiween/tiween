/**
 * `venue-events` controller (Story 7.3): code→status mapping, the envelope
 * discipline (no raw exception text ever reaches the response, `issues`
 * forwarded only for MAPPED codes), and the graceful blank-search branch.
 */
import venueEventsController from "../venue-events"

function buildCtx(overrides: Record<string, unknown> = {}) {
  return {
    state: { user: { id: 42 } },
    params: {},
    query: {},
    request: { body: {} },
    status: 200,
    body: undefined as unknown,
    ...overrides,
  } as any
}

function buildStrapi(
  service: Record<string, jest.Mock>,
  options: { locales?: string[] } = {}
) {
  const { locales = ["fr", "ar", "en"] } = options
  // `?locale=` is validated against the locales the i18n plugin actually has
  // (never a hardcoded list), so the controller reaches for i18n too.
  const localesService = {
    find: jest.fn(async () => locales.map((code) => ({ code }))),
  }

  return {
    plugin: jest.fn((name: string) => ({
      service: jest.fn(() => (name === "i18n" ? localesService : service)),
    })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  } as any
}

function coded(code: string): Error {
  return Object.assign(new Error(`internal detail about ${code}`), { code })
}

const VALID_EVENT_BODY = {
  creativeWorkId: "work-1",
  title: "Dune",
  startDateTime: "2026-09-01T18:00:00.000Z",
  showtimes: [{ startDateTime: "2026-09-01T20:00:00.000Z" }],
}

describe("venue-events controller code→status mapping (unit)", () => {
  const CASES: Array<[string, number]> = [
    ["EVENT_SHOWTIMES_REQUIRED", 400],
    ["EVENT_DATES_INVALID", 400],
    ["SHOWTIME_OUTSIDE_EVENT_RANGE", 400],
    ["NOT_VENUE_MANAGER", 403],
    ["VENUE_NOT_FOUND", 404],
    ["EVENT_NOT_FOUND", 404],
    ["CREATIVE_WORK_NOT_FOUND", 404],
    ["VENUE_NOT_APPROVED", 409],
    ["EVENT_CREATE_FAILED", 500],
    ["EVENT_PUBLISH_FAILED", 500],
    ["WORK_CREATE_FAILED", 500],
  ]

  it.each(CASES)("maps %s to %d without leaking text", async (code, status) => {
    const service = {
      createEvent: jest.fn(async () => Promise.reject(coded(code))),
    }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ request: { body: VALID_EVENT_BODY } })

    await controller.create(ctx)

    expect(ctx.status).toBe(status)
    expect(ctx.body.error.details.code).toBe(code)
    expect(JSON.stringify(ctx.body)).not.toContain("internal detail")
  })

  it("collapses an UNMAPPED code to 500 INTERNAL_ERROR and logs it", async () => {
    const service = {
      publishEvent: jest.fn(async () => {
        throw Object.assign(new Error("raw driver text"), {
          code: "SOMETHING_NEW",
        })
      }),
    }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ params: { documentId: "event-1" } })

    await controller.publish(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(JSON.stringify(ctx.body)).not.toContain("raw driver text")
    expect(strapi.log.error).toHaveBeenCalled()
  })

  it("answers VALIDATION_FAILED (400) with per-field issues for a bad body", async () => {
    const service = { createEvent: jest.fn() }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ request: { body: { title: "" } } })

    await controller.create(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.error.details.code).toBe("VALIDATION_FAILED")
    expect(Array.isArray(ctx.body.error.details.issues)).toBe(true)
    expect(service.createEvent).not.toHaveBeenCalled()
  })

  it("withholds `issues` for an unmapped code", async () => {
    const service = {
      createEvent: jest.fn(async () => {
        throw Object.assign(new Error("x"), {
          details: { code: "UNKNOWN", issues: [{ path: "secret" }] },
        })
      }),
    }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ request: { body: VALID_EVENT_BODY } })

    await controller.create(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details).not.toHaveProperty("issues")
  })
})

describe("venue-events controller happy paths (unit)", () => {
  it("creates with 201 and forwards the validated input + locale", async () => {
    const service = {
      createEvent: jest.fn(async () => ({ documentId: "event-1" })),
    }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({
      request: { body: { ...VALID_EVENT_BODY, venueId: "evil-venue" } },
      query: { locale: "ar" },
    })

    await controller.create(ctx)

    expect(ctx.status).toBe(201)
    expect(ctx.body).toEqual({ data: { documentId: "event-1" } })
    const [user, input, locale] = service.createEvent.mock.calls[0]
    expect(user).toEqual({ id: 42 })
    // Zod strips unknown keys: no venue id from the body survives validation.
    expect(input).not.toHaveProperty("venueId")
    expect(locale).toBe("ar")
  })

  it("ignores an unsupported locale instead of forwarding it raw", async () => {
    const service = { listMine: jest.fn(async () => []) }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ query: { locale: "xx-evil" } })

    await controller.findMine(ctx)

    expect(service.listMine).toHaveBeenCalledWith({ id: 42 }, undefined)
    expect(ctx.body).toEqual({ data: [] })
  })

  it("answers an empty list for a blank search query (never a 400)", async () => {
    const service = { searchCreativeWorks: jest.fn() }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ query: { query: "   " } })

    await controller.searchCreativeWorks(ctx)

    expect(ctx.body).toEqual({ data: [] })
    expect(service.searchCreativeWorks).not.toHaveBeenCalled()
  })

  it("forwards a trimmed search query", async () => {
    const service = {
      searchCreativeWorks: jest.fn(async () => [{ documentId: "work-1" }]),
    }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({ query: { query: " dune " } })

    await controller.searchCreativeWorks(ctx)

    // The CALLER is forwarded: the service tenant-gates the catalog surface.
    expect(service.searchCreativeWorks).toHaveBeenCalledWith({ id: 42 }, "dune")
    expect(ctx.body).toEqual({ data: [{ documentId: "work-1" }] })
  })

  it("creates a creative work with 201", async () => {
    const service = {
      createCreativeWork: jest.fn(async () => ({ documentId: "work-9" })),
    }
    const strapi = buildStrapi(service)
    const controller = venueEventsController({ strapi })
    const ctx = buildCtx({
      request: { body: { title: "Dune", type: "film" } },
      query: { locale: "fr" },
    })

    await controller.createCreativeWork(ctx)

    expect(ctx.status).toBe(201)
    expect(ctx.body).toEqual({ data: { documentId: "work-9" } })
    expect(service.createCreativeWork).toHaveBeenCalledWith(
      { id: 42 },
      { title: "Dune", type: "film" },
      "fr"
    )
  })
})
