import type { VenueAdminScope } from "../venue-admin"

import venueAdminService, {
  buildListFilters,
  buildWritePayload,
  usedPrivilegedFields,
} from "../venue-admin"

/**
 * `venue-admin` service (Story 2D.2), mocked Strapi — Document Service only.
 *
 * The branches pinned here are the tenant boundary and the Strapi-v5 contract,
 * i.e. everything a live-DB test would be too coarse to catch:
 *  - every read/write goes through `strapi.documents(...)` keyed by `documentId`
 *  - a scoped caller (no `manage-all`) is confined to `manager.email`, cannot
 *    create, is REFUSED (not silently stripped) when it writes `status` or
 *    `manager`, and cannot touch another tenant's venue
 *  - a scoped caller with NO email is confined to an impossible filter rather
 *    than let through unscoped (fail closed)
 *  - `search` never widens past the sibling status/type filters
 *  - a delete is GUARDED and FAIL-CLOSED on scheduled séances, across both
 *    sub-event collections, on the single AND the bulk path
 *  - approved → publish, anything else → unpublish; either failure is logged
 *    and does NOT fail the write
 *  - a duplicate slug surfaces as VENUE_SLUG_TAKEN on the `slug` field, not as
 *    an opaque 500
 */

const VENUE_UID = "plugin::venues.venue"

const ADMIN: VenueAdminScope = { canManageAll: true, email: "admin@tiween.tn" }
const MANAGER: VenueAdminScope = {
  canManageAll: false,
  email: "manager@example.com",
}

function venueRow(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "venue-1",
    name: "Le Rio",
    slug: "le-rio",
    status: "pending",
    type: "cinema",
    manager: { id: 42, email: "manager@example.com" },
    ...overrides,
  }
}

function baseQuery(overrides: Record<string, unknown> = {}) {
  return {
    sortField: "name",
    sortOrder: "asc",
    page: 1,
    pageSize: 20,
    ...overrides,
  } as never
}

/**
 * A booted-service double.
 *
 * `documents()` is UID-AWARE on purpose: the delete guard counts screenings and
 * performances through the same entry point, and a mock that answered the venue
 * API for every uid would make the guard look like it passed when it had merely
 * counted the wrong collection.
 */
function buildStrapi(
  overrides: Record<string, unknown> = {},
  subEvents: { count?: jest.Mock } = {}
) {
  const venueApi = {
    findMany: jest.fn(async () => [venueRow()]),
    findOne: jest.fn(async () => venueRow()),
    count: jest.fn(async () => 1),
    create: jest.fn(async () => venueRow({ documentId: "venue-2" })),
    update: jest.fn(async () => venueRow({ name: "Le Rio 2" })),
    delete: jest.fn(async () => ({})),
    publish: jest.fn(async () => ({})),
    unpublish: jest.fn(async () => ({})),
    ...overrides,
  }

  // No séances scheduled anywhere unless a test says otherwise.
  const subEventApi = { count: jest.fn(async () => 0), ...subEvents }

  const strapi: any = {
    documents: jest.fn((uid: string) =>
      uid === VENUE_UID ? venueApi : subEventApi
    ),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return {
    strapi,
    venueApi,
    subEventApi,
    service: venueAdminService({ strapi }),
  }
}

/** Run `fn` and return the thrown error's `code`. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn()
  } catch (err) {
    return (err as { code?: string }).code
  }
  return undefined
}

describe("buildListFilters (unit)", () => {
  it("adds no scope filter for a manage-all caller", () => {
    expect(buildListFilters(baseQuery(), ADMIN)).toEqual({})
  })

  it("confines a scoped caller to manager.email (case-insensitive)", () => {
    expect(buildListFilters(baseQuery(), MANAGER)).toEqual({
      manager: { email: { $eqi: "manager@example.com" } },
    })
  })

  it("confines a scoped caller with NO email to an impossible filter", () => {
    // Fail closed: a missing join key must not read as "no scope".
    const filters = buildListFilters(baseQuery(), { canManageAll: false })
    expect(filters).toEqual({
      manager: { email: { $eqi: "__no_manager__" } },
    })
  })

  it("keeps `search` inside its own $and entry so it cannot widen the status filter", () => {
    const filters = buildListFilters(
      baseQuery({ search: "rio", status: "approved" }),
      ADMIN
    ) as { $and: Record<string, unknown>[] }

    expect(filters.$and).toHaveLength(2)
    expect(filters.$and[0]).toEqual({
      $or: [
        { name: { $containsi: "rio" } },
        { address: { $containsi: "rio" } },
      ],
    })
    expect(filters.$and[1]).toEqual({ status: "approved" })
  })

  it("filters by the city documentId, never by a numeric id", () => {
    expect(buildListFilters(baseQuery({ city: "city-1" }), ADMIN)).toEqual({
      cityRef: { documentId: "city-1" },
    })
  })
})

describe("buildWritePayload (unit)", () => {
  it("drops `status` for a scoped caller and keeps it for manage-all", () => {
    const input = { name: "X", status: "approved" } as never

    expect(buildWritePayload(input, ADMIN)).toEqual({
      name: "X",
      status: "approved",
    })
    expect(buildWritePayload(input, MANAGER)).toEqual({ name: "X" })
  })

  it("drops keys that are not on the whitelist", () => {
    const payload = buildWritePayload(
      { name: "X", events: [1], documentId: "spoof" } as never,
      ADMIN
    )
    expect(payload).toEqual({ name: "X" })
  })

  it("writes `manager` for a manage-all caller and drops it for a scoped one", () => {
    // `manager` is the key the tenant scoping is derived from: writable by an
    // admin (AC 9 — otherwise no venue can ever have one), never by a tenant.
    const input = { name: "X", manager: 9 } as never

    expect(buildWritePayload(input, ADMIN)).toEqual({ name: "X", manager: 9 })
    expect(buildWritePayload(input, MANAGER)).toEqual({ name: "X" })
  })

  it("keeps an explicit null (clearing a field) but drops undefined", () => {
    const payload = buildWritePayload(
      { phone: null, email: undefined } as never,
      ADMIN
    )
    expect(payload).toEqual({ phone: null })
  })
})

describe("usedPrivilegedFields (unit)", () => {
  it.each(["status", "manager"])(
    "flags `%s` sent by a scoped caller",
    (field) => {
      expect(usedPrivilegedFields({ [field]: "x" } as never, MANAGER)).toBe(
        true
      )
    }
  )

  it("never flags a manage-all caller, and ignores absent keys", () => {
    expect(usedPrivilegedFields({ status: "approved" } as never, ADMIN)).toBe(
      false
    )
    expect(usedPrivilegedFields({ name: "X" } as never, MANAGER)).toBe(false)
  })
})

describe("venue-admin.list (unit)", () => {
  it("reads DRAFTS through the Document Service and returns a data/meta envelope", async () => {
    const { service, venueApi, strapi } = buildStrapi()

    const result = await service.list(
      baseQuery({ pageSize: 20, page: 2 }),
      ADMIN
    )

    expect(strapi.documents).toHaveBeenCalledWith(VENUE_UID)
    const args = venueApi.findMany.mock.calls[0][0] as Record<string, unknown>
    expect(args.status).toBe("draft")
    expect(args.start).toBe(20)
    expect(args.limit).toBe(20)
    expect(args.sort).toEqual([{ name: "asc" }])

    expect(result.data).toHaveLength(1)
    expect(result.meta.pagination).toEqual({
      page: 2,
      pageSize: 20,
      pageCount: 1,
      total: 1,
    })
  })

  it("collapses a Document Service failure into a CODE and logs it", async () => {
    const { service, strapi } = buildStrapi({
      findMany: jest.fn(async () => {
        throw new Error("boom")
      }),
    })

    expect(await codeOf(() => service.list(baseQuery(), ADMIN))).toBe(
      "VENUE_LIST_FAILED"
    )
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue-admin.findOne (unit)", () => {
  it("returns the row for its owner", async () => {
    const { service, venueApi } = buildStrapi()

    const row = await service.findOne("venue-1", MANAGER)

    expect(row.documentId).toBe("venue-1")
    expect(venueApi.findOne.mock.calls[0][0]).toMatchObject({
      documentId: "venue-1",
      status: "draft",
    })
  })

  it("answers VENUE_NOT_FOUND (not FORBIDDEN) for another tenant's venue", async () => {
    // The existence of another tenant's venue is itself not disclosed.
    const { service } = buildStrapi()

    expect(
      await codeOf(() =>
        service.findOne("venue-1", {
          canManageAll: false,
          email: "someone-else@example.com",
        })
      )
    ).toBe("VENUE_NOT_FOUND")
  })

  it("matches the owner case-insensitively", async () => {
    const { service } = buildStrapi()

    await expect(
      service.findOne("venue-1", {
        canManageAll: false,
        email: "MANAGER@Example.TN".replace("TN", "com"),
      })
    ).resolves.toBeTruthy()
  })

  it("answers VENUE_NOT_FOUND when the document is absent", async () => {
    const { service } = buildStrapi({ findOne: jest.fn(async () => null) })

    expect(await codeOf(() => service.findOne("nope", ADMIN))).toBe(
      "VENUE_NOT_FOUND"
    )
  })
})

describe("venue-admin.create (unit)", () => {
  it("refuses a scoped caller (a venue it created would be invisible to it)", async () => {
    const { service, venueApi } = buildStrapi()

    expect(
      await codeOf(() => service.create({ name: "X" } as never, MANAGER))
    ).toBe("VENUE_FORBIDDEN")
    expect(venueApi.create).not.toHaveBeenCalled()
  })

  it("creates a DRAFT and does not publish a pending venue", async () => {
    const { service, venueApi } = buildStrapi()

    await service.create({ name: "X", type: "cinema" } as never, ADMIN)

    expect(venueApi.create.mock.calls[0][0]).toMatchObject({
      status: "draft",
      data: { name: "X", type: "cinema" },
    })
    expect(venueApi.publish).not.toHaveBeenCalled()
  })

  it("publishes an approved venue", async () => {
    const { service, venueApi } = buildStrapi({
      create: jest.fn(async () => venueRow({ status: "approved" })),
    })

    await service.create({ name: "X", status: "approved" } as never, ADMIN)

    expect(venueApi.publish).toHaveBeenCalledWith({ documentId: "venue-1" })
    expect(venueApi.unpublish).not.toHaveBeenCalled()
  })

  it("UNPUBLISHES a venue demoted out of `approved`", async () => {
    // Without this an approved→pending demotion left the published copy live,
    // and `pending` has no public read gate to hide behind.
    const { service, venueApi } = buildStrapi({
      update: jest.fn(async () => venueRow({ status: "pending" })),
    })

    await service.update("venue-1", { status: "pending" } as never, ADMIN)

    expect(venueApi.unpublish).toHaveBeenCalledWith({ documentId: "venue-1" })
    expect(venueApi.publish).not.toHaveBeenCalled()
  })

  it("does NOT fail the write when the unpublish fails", async () => {
    const { service, strapi } = buildStrapi({
      update: jest.fn(async () => venueRow({ status: "suspended" })),
      unpublish: jest.fn(async () => {
        throw new Error("unpublish boom")
      }),
    })

    await expect(
      service.update("venue-1", { status: "suspended" } as never, ADMIN)
    ).resolves.toBeTruthy()
    expect(strapi.log.error).toHaveBeenCalled()
  })

  it("does NOT fail the write when the publish fails", async () => {
    const { service, strapi } = buildStrapi({
      create: jest.fn(async () => venueRow({ status: "approved" })),
      publish: jest.fn(async () => {
        throw new Error("publish boom")
      }),
    })

    await expect(
      service.create({ name: "X", status: "approved" } as never, ADMIN)
    ).resolves.toBeTruthy()
    expect(strapi.log.error).toHaveBeenCalled()
  })
})

describe("venue-admin.update (unit)", () => {
  it("updates by documentId for a scoped caller", async () => {
    const { service, venueApi } = buildStrapi()

    await service.update("venue-1", { name: "Renamed" } as never, MANAGER)

    expect(venueApi.update.mock.calls[0][0]).toMatchObject({
      documentId: "venue-1",
      data: { name: "Renamed" },
    })
  })

  it.each(["status", "manager"])(
    "REFUSES a scoped caller writing `%s` instead of reporting nothing to save",
    async (field) => {
      // Stripping the field would leave `{}` and answer NO_FIELDS_TO_UPDATE
      // ("Nothing to save") for a write that was actually refused.
      const { service, venueApi } = buildStrapi()

      expect(
        await codeOf(() =>
          service.update("venue-1", { [field]: "approved" } as never, MANAGER)
        )
      ).toBe("VENUE_FORBIDDEN")
      expect(venueApi.update).not.toHaveBeenCalled()
    }
  )

  it("maps a duplicate slug to VENUE_SLUG_TAKEN with an issue on `slug`", async () => {
    const { service } = buildStrapi({
      update: jest.fn(async () => {
        throw Object.assign(
          new Error("UNIQUE constraint failed: venues.slug"),
          {}
        )
      }),
    })

    let caught: any
    try {
      await service.update("venue-1", { slug: "le-rio" } as never, ADMIN)
    } catch (err) {
      caught = err
    }

    expect(caught.code).toBe("VENUE_SLUG_TAKEN")
    expect(caught.details.issues).toEqual([
      { path: "slug", message: "VENUE_SLUG_TAKEN" },
    ])
  })

  it("rejects an empty payload with its own code", async () => {
    const { service, venueApi } = buildStrapi()

    expect(await codeOf(() => service.update("venue-1", {}, ADMIN))).toBe(
      "NO_FIELDS_TO_UPDATE"
    )
    expect(venueApi.update).not.toHaveBeenCalled()
  })

  it("refuses another tenant's venue before writing anything", async () => {
    const { service, venueApi } = buildStrapi()

    expect(
      await codeOf(() =>
        service.update("venue-1", { name: "X" } as never, {
          canManageAll: false,
          email: "intruder@example.com",
        })
      )
    ).toBe("VENUE_NOT_FOUND")
    expect(venueApi.update).not.toHaveBeenCalled()
  })
})

describe("venue-admin.delete / bulkDelete (unit)", () => {
  it("deletes by documentId when no séance is scheduled", async () => {
    const { service, venueApi, subEventApi } = buildStrapi()

    await service.delete("venue-1", ADMIN)

    expect(venueApi.delete).toHaveBeenCalledWith({ documentId: "venue-1" })
    // BOTH sub-event collections are counted (2C.3 split `showtime` in two;
    // counting one of them is the bug that split introduced).
    expect(subEventApi.count).toHaveBeenCalledTimes(2)
    expect(subEventApi.count.mock.calls[0][0]).toEqual({
      filters: { event: { venue: { documentId: "venue-1" } } },
    })
  })

  it("REFUSES a venue with scheduled séances", async () => {
    const { service, venueApi } = buildStrapi(
      {},
      { count: jest.fn(async () => 3) }
    )

    expect(await codeOf(() => service.delete("venue-1", ADMIN))).toBe(
      "VENUE_HAS_EVENTS"
    )
    expect(venueApi.delete).not.toHaveBeenCalled()
  })

  it("BLOCKS the delete when the count itself failed (never treats it as zero)", async () => {
    // A destructive action must not be unblocked by a check that failed — the
    // exact regression 2C.3 hardened after a swallowed count let every venue
    // through.
    const { service, venueApi, strapi } = buildStrapi(
      {},
      {
        count: jest.fn(async () => {
          throw new Error("collection missing")
        }),
      }
    )

    expect(await codeOf(() => service.delete("venue-1", ADMIN))).toBe(
      "VENUE_HAS_EVENTS"
    )
    expect(venueApi.delete).not.toHaveBeenCalled()
    expect(strapi.log.error).toHaveBeenCalled()
  })

  it("applies the same guard to every id of a bulk delete", async () => {
    const { service, venueApi } = buildStrapi(
      {},
      { count: jest.fn(async () => 1) }
    )

    const result = await service.bulkDelete(["a", "b"], ADMIN)

    expect(result).toEqual({ deleted: [], failed: ["a", "b"] })
    expect(venueApi.delete).not.toHaveBeenCalled()
  })

  it("refuses another tenant's venue", async () => {
    const { service, venueApi } = buildStrapi()

    expect(
      await codeOf(() =>
        service.delete("venue-1", {
          canManageAll: false,
          email: "intruder@example.com",
        })
      )
    ).toBe("VENUE_NOT_FOUND")
    expect(venueApi.delete).not.toHaveBeenCalled()
  })

  it("keeps going after one failure and reports which ids failed", async () => {
    const { service, venueApi } = buildStrapi()
    venueApi.findOne
      .mockImplementationOnce(async () => venueRow())
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => venueRow())

    const result = await service.bulkDelete(["a", "b", "c"], ADMIN)

    expect(result).toEqual({ deleted: ["a", "c"], failed: ["b"] })
    expect(venueApi.delete).toHaveBeenCalledTimes(2)
  })
})
