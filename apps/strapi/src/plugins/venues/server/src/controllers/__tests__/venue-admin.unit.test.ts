/**
 * `venue-admin` controller (Story 2D.2) — the HTTP contract the service does
 * not own:
 *  - Zod validation, with every issue message a stable CODE, never prose
 *  - error CODE → status mapping, and an UNMAPPED code collapsing to a logged
 *    500 `INTERNAL_ERROR` rather than echoing internal exception text
 *  - per-field `issues` forwarded only for MAPPED codes
 *  - the scope comes from `ctx.state` (the policy), never from the request, and
 *    a MISSING scope degrades to the most restrictive one
 */
import controllers from "../index"

const SCOPE = { canManageAll: true, email: "admin@tiween.tn" }

function buildController(overrides: Record<string, jest.Mock> = {}) {
  const service = {
    list: jest.fn(async () => ({ data: [], meta: { pagination: {} } })),
    findOne: jest.fn(async () => ({ documentId: "venue-1" })),
    create: jest.fn(async () => ({ documentId: "venue-2" })),
    update: jest.fn(async () => ({ documentId: "venue-1" })),
    delete: jest.fn(async () => ({ documentId: "venue-1" })),
    bulkDelete: jest.fn(async () => ({ deleted: ["a"], failed: [] })),
    ...overrides,
  }

  const strapi: any = {
    plugin: jest.fn(() => ({ service: jest.fn(() => service) })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return {
    controller: (controllers as any)["venue-admin"]({ strapi }),
    service,
    strapi,
  }
}

function ctxWith(
  overrides: Record<string, unknown> = {},
  scope: unknown = SCOPE
) {
  return {
    state: {
      user: { id: 1, email: "admin@tiween.tn" },
      venuesAdminScope: scope,
    },
    request: { body: {} },
    query: {},
    params: {},
    ...overrides,
  } as any
}

/** The `error.details` block of the last response. */
function detailsOf(ctx: any) {
  return ctx.body?.error?.details
}

const VALID_CREATE = { name: "Le Rio", type: "cinema" }

describe("venue-admin.find (unit)", () => {
  it("passes the parsed query and the ctx scope to the service", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { search: " rio ", pageSize: "5" } })

    await controller.find(ctx)

    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: "rio", pageSize: 5, page: 1 }),
      SCOPE
    )
  })

  it("answers INVALID_QUERY (400) for an out-of-range page size", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { pageSize: "5000" } })

    await controller.find(ctx)

    expect(ctx.status).toBe(400)
    expect(detailsOf(ctx).code).toBe("INVALID_QUERY")
    expect(service.list).not.toHaveBeenCalled()
  })

  it("degrades a MISSING scope to the most restrictive one", async () => {
    // A route that lost its policy must fail closed, not read as super admin.
    const { controller, service } = buildController()
    const ctx = ctxWith({}, null)

    await controller.find(ctx)

    expect(service.list).toHaveBeenCalledWith(expect.anything(), {
      canManageAll: false,
    })
  })
})

describe("venue-admin.create (unit)", () => {
  it("answers 201 with the Document Service row untransformed", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ request: { body: VALID_CREATE } })

    await controller.create(ctx)

    expect(ctx.status).toBe(201)
    expect(ctx.body).toEqual({ data: { documentId: "venue-2" }, meta: {} })
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining(VALID_CREATE),
      SCOPE
    )
  })

  it("rejects a missing name with a per-field CODE, not prose", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ request: { body: { type: "cinema" } } })

    await controller.create(ctx)

    expect(ctx.status).toBe(400)
    expect(detailsOf(ctx).code).toBe("VALIDATION_FAILED")
    expect(detailsOf(ctx).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "name",
          message: "VENUE_NAME_REQUIRED",
        }),
      ])
    )
    expect(service.create).not.toHaveBeenCalled()
  })

  it("rejects a non-canonical website URL that Zod's own .url() would accept", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({
      request: { body: { ...VALID_CREATE, website: "javascript:alert(1)" } },
    })

    await controller.create(ctx)

    expect(detailsOf(ctx).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "VENUE_WEBSITE_INVALID" }),
      ])
    )
  })

  it("maps VENUE_FORBIDDEN to 403", async () => {
    const { controller } = buildController({
      create: jest.fn(async () => {
        throw Object.assign(new Error("Forbidden"), { code: "VENUE_FORBIDDEN" })
      }),
    })
    const ctx = ctxWith({ request: { body: VALID_CREATE } })

    await controller.create(ctx)

    expect(ctx.status).toBe(403)
    expect(detailsOf(ctx).code).toBe("VENUE_FORBIDDEN")
  })

  it("collapses an UNMAPPED error to a logged 500 INTERNAL_ERROR without issues", async () => {
    const { controller, strapi } = buildController({
      create: jest.fn(async () => {
        throw Object.assign(new Error("driver exploded"), {
          code: "SOME_DB_CODE",
          details: { code: "SOME_DB_CODE", issues: [{ path: "secret" }] },
        })
      }),
    })
    const ctx = ctxWith({ request: { body: VALID_CREATE } })

    await controller.create(ctx)

    expect(ctx.status).toBe(500)
    expect(detailsOf(ctx).code).toBe("INTERNAL_ERROR")
    expect(detailsOf(ctx).issues).toBeUndefined()
    expect(JSON.stringify(ctx.body)).not.toContain("driver exploded")
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue-admin.update / findOne / delete (unit)", () => {
  it("keys the update by the documentId path param", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({
      params: { documentId: "venue-9" },
      request: { body: { name: "Renamed" } },
    })

    await controller.update(ctx)

    expect(service.update).toHaveBeenCalledWith(
      "venue-9",
      { name: "Renamed" },
      SCOPE
    )
  })

  it("maps VENUE_NOT_FOUND to 404", async () => {
    const { controller } = buildController({
      findOne: jest.fn(async () => {
        throw Object.assign(new Error("nope"), { code: "VENUE_NOT_FOUND" })
      }),
    })
    const ctx = ctxWith({ params: { documentId: "ghost" } })

    await controller.findOne(ctx)

    expect(ctx.status).toBe(404)
    expect(detailsOf(ctx).code).toBe("VENUE_NOT_FOUND")
  })

  it("answers VENUE_NOT_FOUND when the documentId param is missing", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ params: {} })

    await controller.delete(ctx)

    expect(ctx.status).toBe(404)
    expect(service.delete).not.toHaveBeenCalled()
  })
})

describe("venue-admin.bulkDelete (unit)", () => {
  it("forwards the id list and answers the per-id outcome", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ request: { body: { documentIds: ["a", "b"] } } })

    await controller.bulkDelete(ctx)

    expect(service.bulkDelete).toHaveBeenCalledWith(["a", "b"], SCOPE)
    expect(ctx.body.data).toEqual({ deleted: ["a"], failed: [] })
  })

  it("rejects an empty id list with a CODE", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ request: { body: { documentIds: [] } } })

    await controller.bulkDelete(ctx)

    expect(ctx.status).toBe(400)
    expect(detailsOf(ctx).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "VENUE_IDS_REQUIRED" }),
      ])
    )
    expect(service.bulkDelete).not.toHaveBeenCalled()
  })
})
