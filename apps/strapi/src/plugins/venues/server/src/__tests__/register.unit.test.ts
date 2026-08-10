/**
 * Admin RBAC action registration (Story 2D.2).
 *
 * WHY THIS EXISTS: the action ids are referenced from four places that never
 * see each other —
 *   1. `server/src/register.ts` registers them,
 *   2. `server/src/routes/index.ts` gates every route on them via
 *      `admin::hasPermissions`,
 *   3. `admin/src/index.tsx` gates the menu link on one,
 *   4. `admin/src/hooks/useVenuePermissions.ts` asks `useRBAC()` about all five.
 *
 * (3) and (4) both spread the constants in `admin/src/permissions.ts`, which is
 * dependency-free precisely so this node-gate test can import it.
 *
 * A uid renamed in one place, or a `registerMany` that throws (it is caught and
 * logged, deliberately, so a registration failure cannot take the API down),
 * makes EVERY route answer 403 for EVERY role including super admin — with a
 * fully green suite, because the route test asserts the action strings against
 * its own hardcoded copy and the admin tests mock `useRBAC` outright.
 *
 * So this test IMPORTS both sides and compares them. Nothing here restates an
 * action id.
 */
import {
  VENUES_MENU_PERMISSIONS,
  VENUES_PERMISSIONS,
} from "../../../admin/src/permissions"
import register, { VENUES_ADMIN_RBAC_ACTIONS } from "../register"
import routes from "../routes"

/** The full action id an entry in `VENUES_ADMIN_RBAC_ACTIONS` produces. */
const actionIdOf = (action: { pluginName: string; uid: string }) =>
  `plugin::${action.pluginName}.${action.uid}`

/** Run `register` against a mocked `admin::permission` service. */
async function runRegister(
  registerMany: jest.Mock = jest.fn(async () => undefined)
) {
  const strapi: any = {
    service: jest.fn(() => ({ actionProvider: { registerMany } })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  await register({ strapi })
  return { strapi, registerMany }
}

/** Every action string the admin routes gate on. */
function actionsReferencedByRoutes(): string[] {
  const referenced = new Set<string>()

  for (const route of routes["admin-api"].routes as any[]) {
    for (const policy of route.config?.policies ?? []) {
      if (policy?.name !== "admin::hasPermissions") continue
      for (const action of policy.config?.actions ?? []) {
        referenced.add(action)
      }
    }
  }

  return [...referenced].sort()
}

/**
 * The action ids the admin menu link is gated on.
 *
 * Read from the shared `admin/src/permissions.ts` rather than by driving
 * `admin/src/index.tsx`: that module pulls in the admin bundle, which cannot be
 * loaded on the node gate. `index.tsx` spreads THIS constant into
 * `addMenuLink`, so the two cannot disagree.
 */
function actionsReferencedByMenuLink(): string[] {
  return VENUES_MENU_PERMISSIONS.map((permission) => permission.action).sort()
}

describe("venues admin RBAC actions (unit)", () => {
  it("registers every action through the admin permission action provider", async () => {
    const { strapi, registerMany } = await runRegister()

    expect(strapi.service).toHaveBeenCalledWith("admin::permission")
    expect(registerMany).toHaveBeenCalledWith(VENUES_ADMIN_RBAC_ACTIONS)
  })

  it("does not take the API down when registration fails, but LOGS it", async () => {
    const { strapi } = await runRegister(
      jest.fn(async () => {
        throw new Error("action provider exploded")
      })
    )

    // Swallowed on purpose — but a silent swallow is how every route starts
    // answering 403 with nothing in the logs.
    expect(strapi.log.error).toHaveBeenCalled()
  })

  it("covers every action the admin ROUTES gate on", () => {
    const registered = VENUES_ADMIN_RBAC_ACTIONS.map(actionIdOf)
    const missing = actionsReferencedByRoutes().filter(
      (action) => !registered.includes(action)
    )

    expect(missing).toEqual([])
    // Guard against a vacuous pass if the route scan ever stops finding them.
    expect(actionsReferencedByRoutes().length).toBeGreaterThanOrEqual(3)
  })

  it("covers the action the admin MENU LINK is gated on", () => {
    const registered = VENUES_ADMIN_RBAC_ACTIONS.map(actionIdOf)
    const referenced = actionsReferencedByMenuLink()

    expect(referenced.length).toBeGreaterThan(0)
    for (const action of referenced) expect(registered).toContain(action)
  })

  it("covers every action the admin UI asks useRBAC about", () => {
    const registered = VENUES_ADMIN_RBAC_ACTIONS.map(actionIdOf)

    for (const permission of VENUES_PERMISSIONS) {
      expect(registered).toContain(permission.action)
    }
  })

  it("keeps `manage-all` hyphenated so useRBAC derives `canManageAll`", () => {
    // `useRBAC` builds the allowedActions key from the last segment: a hyphen is
    // dropped and the next letter capitalised. Renaming this uid to `manageAll`
    // would silently produce `canManageall` and hide every admin-only control.
    const manageAll = VENUES_ADMIN_RBAC_ACTIONS.find(
      (action) => action.uid === "manage-all"
    )

    expect(manageAll).toBeDefined()
    expect(VENUES_PERMISSIONS.map((p) => p.action)).toContain(
      "plugin::venues.manage-all"
    )
  })
})
