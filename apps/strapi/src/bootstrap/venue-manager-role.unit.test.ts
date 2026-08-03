/**
 * `ensureVenueManagerRole` permission seeding (Story 7.2).
 *
 * In users-permissions the EXISTENCE of a permission row IS the grant, so
 * without this seeding every `/venues/me` route 403s on a fresh database and
 * the feature is unreachable without manual console clicks. Two properties are
 * load-bearing and invisible anywhere else:
 *
 *  1. the seeding runs on BOTH branches — an environment provisioned before
 *     7.2 already has the role, and returning early there would leave every
 *     upgraded database broken;
 *  2. the action ids match `plugin::<plugin>.<controller>.<action>` exactly —
 *     users-permissions derives that string from the controller map and prunes
 *     anything else on the next boot.
 */
import {
  ensureVenueManagerRole,
  VENUE_MANAGER_PERMISSION_ACTIONS,
} from "./venue-manager-role"

const ROLE_UID = "plugin::users-permissions.role"
const PERMISSION_UID = "plugin::users-permissions.permission"

interface QueryMock {
  findOne: jest.Mock
  create: jest.Mock
}

function buildStrapi(options: {
  existingRole?: { id: number } | null
  existingPermissions?: string[]
  permissionCreateThrows?: boolean
}) {
  const {
    existingRole = null,
    existingPermissions = [],
    permissionCreateThrows = false,
  } = options

  const roleQuery: QueryMock = {
    findOne: jest.fn(async () => existingRole),
    create: jest.fn(async () => ({ id: 3 })),
  }
  const permissionQuery: QueryMock = {
    findOne: jest.fn(async ({ where }: any) =>
      existingPermissions.includes(where.action) ? { id: 1 } : null
    ),
    create: jest.fn(async () => {
      if (permissionCreateThrows) throw new Error("db is on fire")
      return { id: 99 }
    }),
  }

  const strapi: any = {
    query: jest.fn((uid: string) =>
      uid === PERMISSION_UID ? permissionQuery : roleQuery
    ),
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  }

  return { strapi, roleQuery, permissionQuery }
}

const createdActions = (permissionQuery: QueryMock) =>
  permissionQuery.create.mock.calls.map((c) => c[0].data.action)

describe("ensureVenueManagerRole permission seeding (unit)", () => {
  it("grants exactly the intended action ids on a fresh database", async () => {
    const { strapi, roleQuery, permissionQuery } = buildStrapi({})

    await ensureVenueManagerRole({ strapi })

    expect(strapi.query).toHaveBeenCalledWith(ROLE_UID)
    expect(roleQuery.create).toHaveBeenCalled()
    expect(createdActions(permissionQuery)).toEqual([
      "plugin::venues.venue-profile.getMine",
      "plugin::venues.venue-profile.updateMine",
      "plugin::venues.venue-profile.propertyDefinitions",
      "plugin::upload.content-api.upload",
    ])
  })

  it("exports that same list (the routes' single source of truth)", () => {
    expect([...VENUE_MANAGER_PERMISSION_ACTIONS]).toEqual([
      "plugin::venues.venue-profile.getMine",
      "plugin::venues.venue-profile.updateMine",
      "plugin::venues.venue-profile.propertyDefinitions",
      "plugin::upload.content-api.upload",
    ])
  })

  it("attaches every grant to the created role", async () => {
    const { strapi, permissionQuery } = buildStrapi({})

    await ensureVenueManagerRole({ strapi })

    for (const call of permissionQuery.create.mock.calls) {
      expect(call[0].data.role).toBe(3)
    }
  })

  it("seeds the grants for an ALREADY-EXISTING role (upgrade path)", async () => {
    const { strapi, roleQuery, permissionQuery } = buildStrapi({
      existingRole: { id: 7 },
    })

    const role = await ensureVenueManagerRole({ strapi })

    expect(role).toEqual({ id: 7 })
    expect(roleQuery.create).not.toHaveBeenCalled()
    expect(createdActions(permissionQuery)).toHaveLength(
      VENUE_MANAGER_PERMISSION_ACTIONS.length
    )
    for (const call of permissionQuery.create.mock.calls) {
      expect(call[0].data.role).toBe(7)
    }
  })

  it("is idempotent: an already-granted action is not recreated", async () => {
    const { strapi, permissionQuery } = buildStrapi({
      existingRole: { id: 7 },
      existingPermissions: [...VENUE_MANAGER_PERMISSION_ACTIONS],
    })

    await ensureVenueManagerRole({ strapi })

    expect(permissionQuery.create).not.toHaveBeenCalled()
  })

  it("creates only the missing grants on a partially-seeded role", async () => {
    const { strapi, permissionQuery } = buildStrapi({
      existingRole: { id: 7 },
      existingPermissions: ["plugin::venues.venue-profile.getMine"],
    })

    await ensureVenueManagerRole({ strapi })

    expect(createdActions(permissionQuery)).toEqual([
      "plugin::venues.venue-profile.updateMine",
      "plugin::venues.venue-profile.propertyDefinitions",
      "plugin::upload.content-api.upload",
    ])
  })

  it("scopes the idempotency check to the role, not the action alone", async () => {
    const { strapi, permissionQuery } = buildStrapi({ existingRole: { id: 7 } })

    await ensureVenueManagerRole({ strapi })

    for (const call of permissionQuery.findOne.mock.calls) {
      expect(call[0].where).toMatchObject({ role: 7 })
    }
  })

  it("logs a failed grant without refusing to boot", async () => {
    const { strapi } = buildStrapi({
      existingRole: { id: 7 },
      permissionCreateThrows: true,
    })

    await expect(ensureVenueManagerRole({ strapi })).resolves.toEqual({ id: 7 })
    expect(strapi.log.error).toHaveBeenCalledTimes(
      VENUE_MANAGER_PERMISSION_ACTIONS.length
    )
  })

  it("still throws when the ROLE itself cannot be read", async () => {
    const { strapi, roleQuery } = buildStrapi({})
    roleQuery.findOne.mockRejectedValueOnce(new Error("no database"))

    await expect(ensureVenueManagerRole({ strapi })).rejects.toThrow(
      "no database"
    )
  })
})
