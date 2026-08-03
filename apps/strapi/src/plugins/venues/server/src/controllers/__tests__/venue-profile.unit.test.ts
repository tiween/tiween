/**
 * `venue-profile` controller + `venue.findVenueBySlug` (Story 7.2).
 *
 * The HTTP contract the services do not own:
 *  - error CODE → status mapping, and an UNMAPPED code collapsing to a logged
 *    500 `INTERNAL_ERROR` rather than echoing internal exception text
 *  - per-field `issues` forwarded only for MAPPED codes
 *  - the user comes from `ctx.state.user`, never from the body
 *  - the slug read's 404 code and its whitelisted projection
 */
import controllers from "../index"

const USER = { id: 42, role: { type: "venue-manager" } }

function buildProfileController(
  overrides: Record<string, jest.Mock> = {},
  catalogOverrides: Record<string, jest.Mock> = {}
) {
  const profileService = {
    getMyVenue: jest.fn(async () => ({
      documentId: "venue-1",
      name: "Le Rio",
    })),
    updateMyVenue: jest.fn(async () => ({
      documentId: "venue-1",
      name: "Renamed",
    })),
    ...overrides,
  }
  const catalogService = {
    listPropertyCatalog: jest.fn(async () => []),
    ...catalogOverrides,
  }

  const strapi: any = {
    plugin: jest.fn(() => ({
      service: jest.fn((name: string) =>
        name === "property-catalog" ? catalogService : profileService
      ),
    })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return {
    controller: (controllers as any)["venue-profile"]({ strapi }),
    profileService,
    catalogService,
    strapi,
  }
}

function ctxWith(body: unknown = {}, user: unknown = USER) {
  return {
    state: { user },
    request: { body },
    query: {},
    params: {},
    badRequest: jest.fn(),
    notFound: jest.fn(),
  } as any
}

/** An error carrying a service-style `code`. */
function coded(code: string) {
  return Object.assign(new Error("internal detail nobody should see"), { code })
}

describe("venue-profile controller.getMine (unit)", () => {
  it("passes ctx.state.user to the service and wraps the result in { data }", async () => {
    const { controller, profileService } = buildProfileController()
    const ctx = ctxWith()

    await controller.getMine(ctx)

    expect(profileService.getMyVenue).toHaveBeenCalledWith(USER)
    expect(ctx.body).toEqual({
      data: { documentId: "venue-1", name: "Le Rio" },
    })
  })

  it("maps VENUE_NOT_FOUND to 404 with the code in details", async () => {
    const { controller } = buildProfileController({
      getMyVenue: jest.fn(async () => {
        throw coded("VENUE_NOT_FOUND")
      }),
    })
    const ctx = ctxWith()

    await controller.getMine(ctx)

    expect(ctx.status).toBe(404)
    expect(ctx.body.error.details.code).toBe("VENUE_NOT_FOUND")
  })
})

describe("venue-profile controller.updateMine (unit)", () => {
  it("validates, forwards the caller, and returns the updated projection", async () => {
    const { controller, profileService } = buildProfileController()
    const ctx = ctxWith({ name: "Renamed", capacity: 300 })

    await controller.updateMine(ctx)

    expect(profileService.updateMyVenue).toHaveBeenCalledWith(USER, {
      name: "Renamed",
      capacity: 300,
    })
    expect(ctx.body).toEqual({
      data: { documentId: "venue-1", name: "Renamed" },
    })
  })

  it("strips unknown / forbidden keys before the service is called", async () => {
    const { controller, profileService } = buildProfileController()
    const ctx = ctxWith({
      name: "Renamed",
      documentId: "someone-else",
      slug: "hijacked",
      manager: 99,
      status: "approved",
      events: [1],
    })

    await controller.updateMine(ctx)

    const input = profileService.updateMyVenue.mock.calls[0][1]
    expect(input).toEqual({ name: "Renamed" })
  })

  it.each([
    ["capacity: 0", { capacity: 0 }],
    ["a bad website", { website: "javascript:alert(1)" }],
    ["latitude 200", { geo: { latitude: 200, longitude: 10 } }],
    ["an over-long name", { name: "x".repeat(201) }],
    ["a bad email", { email: "not-an-email" }],
    ["a bad type", { type: "stadium" }],
  ])(
    "400s with VALIDATION_FAILED on %s and writes nothing",
    async (_label, body) => {
      const { controller, profileService } = buildProfileController()
      const ctx = ctxWith(body)

      await controller.updateMine(ctx)

      expect(ctx.status).toBe(400)
      expect(ctx.body.error.details.code).toBe("VALIDATION_FAILED")
      expect(profileService.updateMyVenue).not.toHaveBeenCalled()
    }
  )

  it("forwards the per-field SCREAMING_SNAKE issues for a mapped code", async () => {
    const { controller } = buildProfileController()
    const ctx = ctxWith({ capacity: 0 })

    await controller.updateMine(ctx)

    expect(ctx.body.error.details.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "capacity",
          message: "VENUE_CAPACITY_INVALID",
        }),
      ])
    )
  })

  it.each([
    ["NO_FIELDS_TO_UPDATE", 400],
    ["PROPERTY_DEFINITION_UNKNOWN", 400],
    ["PROPERTY_VALUE_TYPE_MISMATCH", 400],
    ["NOT_VENUE_MANAGER", 403],
    ["VENUE_NOT_FOUND", 404],
    ["VENUE_PROFILE_UPDATE_FAILED", 500],
  ])("maps %s to %i", async (code, status) => {
    const { controller } = buildProfileController({
      updateMyVenue: jest.fn(async () => {
        throw coded(code)
      }),
    })
    const ctx = ctxWith({ name: "X" })

    await controller.updateMine(ctx)

    expect(ctx.status).toBe(status)
    expect(ctx.body.error.details.code).toBe(code)
  })

  it("collapses an UNMAPPED error to a logged 500 INTERNAL_ERROR", async () => {
    const { controller, strapi } = buildProfileController({
      updateMyVenue: jest.fn(async () => {
        throw new Error("SELECT * FROM up_users -- connection refused")
      }),
    })
    const ctx = ctxWith({ name: "X" })

    await controller.updateMine(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(JSON.stringify(ctx.body)).not.toContain("up_users")
    expect(strapi.log.error).toHaveBeenCalled()
  })

  it("never echoes internal exception text for a MAPPED code either", async () => {
    const { controller } = buildProfileController({
      updateMyVenue: jest.fn(async () => {
        throw coded("VENUE_PROFILE_UPDATE_FAILED")
      }),
    })
    const ctx = ctxWith({ name: "X" })

    await controller.updateMine(ctx)

    expect(JSON.stringify(ctx.body)).not.toContain(
      "internal detail nobody should see"
    )
  })

  it("withholds issues for an unmapped code", async () => {
    const { controller } = buildProfileController({
      updateMyVenue: jest.fn(async () =>
        Promise.reject(
          Object.assign(new Error("boom"), {
            code: "SOMETHING_ELSE",
            details: { code: "SOMETHING_ELSE", issues: [{ path: "secret" }] },
          })
        )
      ),
    })
    const ctx = ctxWith({ name: "X" })

    await controller.updateMine(ctx)

    expect(ctx.body.error.details).not.toHaveProperty("issues")
  })

  it("tolerates a missing request body (treated as {} → NO_FIELDS_TO_UPDATE path)", async () => {
    const { controller, profileService } = buildProfileController()
    const ctx = ctxWith()
    ctx.request = undefined

    await controller.updateMine(ctx)

    expect(profileService.updateMyVenue).toHaveBeenCalledWith(USER, {})
  })
})

describe("venue-profile controller.propertyDefinitions (unit)", () => {
  it("returns the catalog under { data } and forwards the locale", async () => {
    const catalog = [
      {
        documentId: "cat-1",
        name: "Accessibility",
        slug: "accessibility",
        sortOrder: 1,
        parent: null,
        definitions: [
          {
            documentId: "def-1",
            name: "Wheelchair Accessible",
            slug: "wheelchair-accessible",
            type: "boolean",
            sortOrder: 1,
          },
        ],
      },
    ]
    const { controller, catalogService } = buildProfileController(
      {},
      { listPropertyCatalog: jest.fn(async () => catalog) }
    )
    const ctx = ctxWith()
    ctx.query = { locale: "fr" }

    await controller.propertyDefinitions(ctx)

    expect(catalogService.listPropertyCatalog).toHaveBeenCalledWith("fr")
    expect(ctx.body).toEqual({ data: catalog })
  })

  it("passes undefined when no locale is given", async () => {
    const { controller, catalogService } = buildProfileController()

    await controller.propertyDefinitions(ctxWith())

    expect(catalogService.listPropertyCatalog).toHaveBeenCalledWith(undefined)
  })

  it.each([
    ["an unknown locale", "de"],
    ["an injection-shaped value", "fr'; DROP TABLE venues; --"],
    ["a non-string", { $ne: null }],
  ])(
    "ignores %s rather than forwarding it to the Document Service",
    async (_label, locale) => {
      const { controller, catalogService } = buildProfileController()
      const ctx = ctxWith()
      ctx.query = { locale }

      await controller.propertyDefinitions(ctx)

      expect(catalogService.listPropertyCatalog).toHaveBeenCalledWith(undefined)
    }
  )

  it("collapses a catalog failure to a logged 500 INTERNAL_ERROR", async () => {
    const { controller, strapi } = buildProfileController(
      {},
      {
        listPropertyCatalog: jest.fn(async () => {
          throw new Error("catalog exploded")
        }),
      }
    )
    const ctx = ctxWith()

    await controller.propertyDefinitions(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue controller.findVenueBySlug (unit)", () => {
  function buildVenueController(findVenueBySlug: jest.Mock) {
    const service = { findVenueBySlug }
    const strapi: any = {
      plugin: jest.fn(() => ({ service: jest.fn(() => service) })),
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    }
    return { controller: controllers.venue({ strapi }), service, strapi }
  }

  const PUBLIC_VENUE = {
    documentId: "venue-1",
    name: "Le Rio",
    slug: "le-rio",
    geo: { latitude: 36.8, longitude: 10.18 },
    logo: null,
    images: [],
    city: null,
    properties: [],
  }

  function slugCtx(slug: unknown, query: Record<string, unknown> = {}) {
    return {
      params: { slug },
      query,
      notFound: jest.fn(),
      badRequest: jest.fn(),
    } as any
  }

  it("returns the whitelisted projection under { data, meta }", async () => {
    const { controller, service } = buildVenueController(
      jest.fn(async () => PUBLIC_VENUE)
    )
    const ctx = slugCtx("le-rio", { locale: "fr" })

    await controller.findVenueBySlug(ctx)

    expect(service.findVenueBySlug).toHaveBeenCalledWith("le-rio", "fr")
    expect(ctx.body).toEqual({ data: PUBLIC_VENUE, meta: {} })
    expect(ctx.body.data).not.toHaveProperty("manager")
    expect(ctx.body.data).not.toHaveProperty("status")
  })

  it("404s with VENUE_NOT_FOUND for an unknown or unpublished slug", async () => {
    const { controller } = buildVenueController(jest.fn(async () => null))
    const ctx = slugCtx("ghost")

    await controller.findVenueBySlug(ctx)

    expect(ctx.notFound).toHaveBeenCalledWith("VENUE_NOT_FOUND")
    expect(ctx.body).toBeUndefined()
  })

  it("404s without touching the service on a missing slug param", async () => {
    const { controller, service } = buildVenueController(jest.fn())
    const ctx = slugCtx(undefined)

    await controller.findVenueBySlug(ctx)

    expect(service.findVenueBySlug).not.toHaveBeenCalled()
    expect(ctx.notFound).toHaveBeenCalledWith("VENUE_NOT_FOUND")
  })

  /**
   * This route is UNAUTHENTICATED. Without a try/catch a Document Service throw
   * surfaces as Strapi's raw 500 carrying the exception message (and, in
   * development, the stack) to an anonymous caller.
   */
  it("collapses a Document Service throw to a logged 500 that leaks no exception text", async () => {
    const { controller, strapi } = buildVenueController(
      jest.fn(async () => {
        throw new Error("SELECT * FROM venues -- connection refused")
      })
    )
    const ctx = slugCtx("le-rio")

    await controller.findVenueBySlug(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(JSON.stringify(ctx.body)).not.toContain("connection refused")
    expect(JSON.stringify(ctx.body)).not.toContain("venues --")
    expect(strapi.log.error).toHaveBeenCalled()
  })

  /**
   * `locale` is caller-controlled and flows into the Document Service. It is
   * validated against the configured locale set (`config/plugins.ts`) and an
   * unknown value is IGNORED rather than forwarded raw.
   */
  describe("locale query validation", () => {
    it.each(["en", "fr", "ar"])(
      "forwards the supported locale %s",
      async (locale) => {
        const { controller, service } = buildVenueController(
          jest.fn(async () => PUBLIC_VENUE)
        )

        await controller.findVenueBySlug(slugCtx("le-rio", { locale }))

        expect(service.findVenueBySlug).toHaveBeenCalledWith("le-rio", locale)
      }
    )

    it.each([
      ["an unknown locale", "de"],
      ["an injection-shaped value", "fr'; DROP TABLE venues; --"],
      ["a non-string", { $ne: null }],
      ["a blank string", "   "],
    ])("ignores %s rather than passing it through", async (_label, locale) => {
      const { controller, service } = buildVenueController(
        jest.fn(async () => PUBLIC_VENUE)
      )

      await controller.findVenueBySlug(slugCtx("le-rio", { locale }))

      expect(service.findVenueBySlug).toHaveBeenCalledWith("le-rio", undefined)
    })
  })
})
