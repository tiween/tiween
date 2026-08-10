/**
 * The venues admin CRUD routes, over HTTP, against a real Strapi on SQLite.
 *
 * This is story 2D.2's smoke test — **create → edit → list reflects the change
 * → delete** (AC 11) — automated rather than clicked, and driven through the
 * SAME requests the admin UI makes (`hooks/useVenuesAdmin.ts`): the plugin's
 * own `/venues/admin/venues…` routes, authenticated with a real admin session.
 *
 * WHY IT EXISTS: every unit test above this layer mocks either the Document
 * Service or `useFetchClient`, so three things stayed assumptions until they
 * were exercised for real —
 *
 *  1. that both routers mounting on `/venues` do NOT collide (the reason the
 *     admin CRUD lives under an `/admin` sub-path),
 *  2. that `admin::hasPermissions` + `plugin::venues.venues-admin-scope`
 *     resolve at boot (a policy name typo is invisible to the unit gate),
 *  3. that the RBAC actions registered in `../register.ts` exist, since
 *     `hasPermissions` checks an ability built from the action provider.
 *
 * Named `*.service.test.ts` so it stays in the opt-in integration project
 * (`yarn test:integration`) and never runs in the default `yarn test` gate.
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import { createAdminSession } from "../../../../../../tests/helpers/admin"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

jest.setTimeout(120000)

const BASE = "/venues/admin/venues"

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>

const api = () => request((strapi as any).server.httpServer)
const auth = <T extends { set: (k: string, v: string) => T }>(req: T) =>
  req.set("Authorization", `Bearer ${adminToken}`)

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy
})

afterAll(async () => {
  await destroyAdmin?.()
  await cleanupStrapi()
})

describe("venues admin CRUD (integration)", () => {
  it("runs the full create → edit → list → delete cycle", async () => {
    const name = uniq("Le Rio")
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    /* ------------------------------------------------------------ create */
    const created = await auth(api().post(BASE)).send({
      name,
      slug,
      type: "cinema",
      status: "pending",
      address: "12 rue de Rome, Tunis",
      capacity: 250,
      geo: { latitude: 36.8065, longitude: 10.1815 },
    })

    expect(created.status).toBe(201)
    const documentId: string = created.body.data.documentId
    expect(typeof documentId).toBe("string")
    // Read the Document Service shape directly — no `attributes` wrapper.
    expect(created.body.data.name).toBe(name)
    expect(created.body.data.capacity).toBe(250)

    /* -------------------------------------------------------------- edit */
    const updated = await auth(api().put(`${BASE}/${documentId}`)).send({
      name: `${name} (renamed)`,
      status: "approved",
      capacity: 300,
    })

    expect(updated.status).toBe(200)
    expect(updated.body.data.name).toBe(`${name} (renamed)`)

    /* ------------------------------- the list reflects the change (AC 11) */
    const listed = await auth(api().get(BASE)).query({
      search: name,
      pageSize: 20,
    })

    expect(listed.status).toBe(200)
    const row = listed.body.data.find(
      (v: { documentId: string }) => v.documentId === documentId
    )
    expect(row).toBeDefined()
    expect(row.name).toBe(`${name} (renamed)`)
    expect(row.status).toBe("approved")
    expect(row.capacity).toBe(300)
    expect(listed.body.meta.pagination.total).toBeGreaterThanOrEqual(1)

    /* ------------------------------------------------------------ delete */
    const deleted = await auth(api().delete(`${BASE}/${documentId}`))
    expect(deleted.status).toBe(200)

    const afterDelete = await auth(api().get(`${BASE}/${documentId}`))
    expect(afterDelete.status).toBe(404)
    expect(afterDelete.body.error.details.code).toBe("VENUE_NOT_FOUND")
  })

  it("rejects an invalid payload with per-field CODES and writes nothing", async () => {
    const response = await auth(api().post(BASE)).send({
      type: "cinema",
      website: "javascript:alert(1)",
    })

    expect(response.status).toBe(400)
    expect(response.body.error.details.code).toBe("VALIDATION_FAILED")
    const codes = response.body.error.details.issues.map(
      (i: { message: string }) => i.message
    )
    expect(codes).toContain("VENUE_NAME_REQUIRED")
    expect(codes).toContain("VENUE_WEBSITE_INVALID")
    // Prose must never reach the client: every issue is a SCREAMING_SNAKE code.
    for (const code of codes) expect(code).toMatch(/^[A-Z0-9_]+$/)
  })

  it("filters, sorts and paginates the list", async () => {
    const marker = uniq("Filterable")
    const ids: string[] = []

    for (const [suffix, type] of [
      ["alpha", "theater"],
      ["beta", "museum"],
    ] as const) {
      const res = await auth(api().post(BASE)).send({
        name: `${marker} ${suffix}`,
        type,
      })
      expect(res.status).toBe(201)
      ids.push(res.body.data.documentId)
    }

    const byType = await auth(api().get(BASE)).query({
      search: marker,
      type: "museum",
    })
    expect(byType.status).toBe(200)
    expect(byType.body.data).toHaveLength(1)
    expect(byType.body.data[0].type).toBe("museum")

    const desc = await auth(api().get(BASE)).query({
      search: marker,
      sortField: "name",
      sortOrder: "desc",
    })
    expect(desc.body.data.map((v: { name: string }) => v.name)).toEqual([
      `${marker} beta`,
      `${marker} alpha`,
    ])

    /* -------------------------------------------------------- bulk delete */
    const bulk = await auth(api().post(`${BASE}/bulk-delete`)).send({
      documentIds: ids,
    })
    expect(bulk.status).toBe(200)
    expect(bulk.body.data.deleted.sort()).toEqual([...ids].sort())
    expect(bulk.body.data.failed).toEqual([])

    const after = await auth(api().get(BASE)).query({ search: marker })
    expect(after.body.data).toHaveLength(0)
  })

  it("answers 400 INVALID_QUERY for an out-of-range page size", async () => {
    const response = await auth(api().get(BASE)).query({ pageSize: 5000 })

    expect(response.status).toBe(400)
    expect(response.body.error.details.code).toBe("INVALID_QUERY")
  })

  it("refuses an unauthenticated caller", async () => {
    // The admin router's own auth strategy, before any policy of ours runs.
    const response = await api().get(BASE)

    expect(response.status).toBe(401)
  })
})

/**
 * TENANT ISOLATION over HTTP (AC 7).
 *
 * The rest of this file runs as a super admin, whose ability short-circuits
 * every permission check — so the `manage-all`-LESS path, which is the actual
 * security boundary, would otherwise exist only in unit tests against a
 * hand-built scope object. A route that lost `plugin::venues.venues-admin-scope`
 * would pass both those gates and every case above.
 *
 * The caller here holds read/create/update/delete but NOT `manage-all`, which
 * is exactly the shape of a "Venue Manager" admin role.
 */
describe("venues admin CRUD — a scoped caller (integration)", () => {
  const USERS_UID = "plugin::users-permissions.user"

  let scopedToken: string
  let destroyScoped: () => Promise<void>
  let scopedEmail: string
  /** A venue whose `manager` is the scoped caller's counterpart account. */
  let ownDocumentId: string
  /** A venue belonging to nobody — invisible to a scoped caller. */
  let otherDocumentId: string

  const scoped = <T extends { set: (k: string, v: string) => T }>(req: T) =>
    req.set("Authorization", `Bearer ${scopedToken}`)

  beforeAll(async () => {
    const session = await createAdminSession(strapi, {
      permissions: [
        "plugin::venues.read",
        "plugin::venues.create",
        "plugin::venues.update",
        "plugin::venues.delete",
      ],
    })
    scopedToken = session.token
    scopedEmail = session.user.email
    destroyScoped = session.destroy

    // `venue.manager` targets a users-permissions user while the caller is an
    // admin::user — the two are joined by EMAIL (see `services/venue-admin.ts`),
    // so the fixture creates the matching account.
    const role = await (strapi as any).db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "authenticated" } })

    const manager = await strapi.documents(USERS_UID as never).create({
      data: {
        username: `scoped-${Date.now()}`,
        email: scopedEmail,
        password: "Test-Password-1234",
        confirmed: true,
        role: role?.id,
      },
    } as never)

    const own = await auth(api().post(BASE)).send({
      name: uniq("Owned"),
      type: "cinema",
      manager: (manager as { id: number }).id,
    })
    expect(own.status).toBe(201)
    ownDocumentId = own.body.data.documentId

    const other = await auth(api().post(BASE)).send({
      name: uniq("Unowned"),
      type: "museum",
    })
    expect(other.status).toBe(201)
    otherDocumentId = other.body.data.documentId
  })

  afterAll(async () => {
    await destroyScoped?.()
  })

  it("lists ONLY the venues it manages", async () => {
    const response = await scoped(api().get(BASE)).query({ pageSize: 100 })

    expect(response.status).toBe(200)
    const ids = response.body.data.map(
      (v: { documentId: string }) => v.documentId
    )
    expect(ids).toContain(ownDocumentId)
    expect(ids).not.toContain(otherDocumentId)
  })

  it("answers 404 (not 403) for another tenant's venue — existence is not disclosed", async () => {
    const response = await scoped(api().get(`${BASE}/${otherDocumentId}`))

    expect(response.status).toBe(404)
    expect(response.body.error.details.code).toBe("VENUE_NOT_FOUND")
  })

  it("cannot delete another tenant's venue", async () => {
    const response = await scoped(api().delete(`${BASE}/${otherDocumentId}`))

    expect(response.status).toBe(404)

    // Still there, read back as the admin who can see it.
    const stillThere = await auth(api().get(`${BASE}/${otherDocumentId}`))
    expect(stillThere.status).toBe(200)
  })

  it("may edit its OWN venue", async () => {
    const response = await scoped(api().put(`${BASE}/${ownDocumentId}`)).send({
      phone: "+216 71 000 000",
    })

    expect(response.status).toBe(200)
    expect(response.body.data.phone).toBe("+216 71 000 000")
  })

  it.each(["status", "manager"])(
    "is REFUSED when it writes the privileged field `%s`",
    async (field) => {
      const response = await scoped(api().put(`${BASE}/${ownDocumentId}`)).send(
        {
          [field]: field === "status" ? "approved" : 1,
        }
      )

      expect(response.status).toBe(403)
      expect(response.body.error.details.code).toBe("VENUE_FORBIDDEN")
    }
  )

  it("cannot create a venue at all", async () => {
    const response = await scoped(api().post(BASE)).send({
      name: uniq("Sneaky"),
      type: "cinema",
    })

    expect(response.status).toBe(403)
    expect(response.body.error.details.code).toBe("VENUE_FORBIDDEN")
  })
})
