/**
 * Route-table guard for the Story 7.3 `/venue/*` block. Three things are only
 * observable here and would otherwise ship broken with a green suite:
 *
 *  1. AUTH IS DECLARED BY OMITTING `config.auth` — `auth: true` is not a valid
 *     Strapi route config and throws `Invalid route config` at BOOT (7.2's
 *     lead review finding). The guard fails on ANY value other than absent.
 *  2. Every route carries the CROSS-PLUGIN `plugin::venues.is-venue-manager`
 *     policy, and that id must resolve against the venues plugin's exported
 *     policy map — the unit gate never boots Strapi, so a rename on either
 *     side is invisible without this pin.
 *  3. The three pinned PUBLIC readers stay exactly as they are: no auth, no
 *     policy, no middleware drift.
 */
import { VENUE_MANAGER_PERMISSION_ACTIONS } from "../../../../../../bootstrap/venue-manager-role"
import venuesPolicies from "../../../../../venues/server/src/policies"
import plugin from "../../index"
import routes from "../index"

const POLICY = "plugin::venues.is-venue-manager"

const VENUE_ROUTES: Array<[string, string, string]> = [
  ["GET", "/venue/events", "venue-events.findMine"],
  ["POST", "/venue/events", "venue-events.create"],
  ["GET", "/venue/events/:documentId", "venue-events.findOne"],
  ["POST", "/venue/events/:documentId/publish", "venue-events.publish"],
  ["GET", "/venue/creative-works/search", "venue-events.searchCreativeWorks"],
  ["POST", "/venue/creative-works", "venue-events.createCreativeWork"],
]

describe("events-manager story 7.3 venue routes", () => {
  const contentApiRoutes = routes["content-api"].routes as any[]

  const find = (method: string, path: string) =>
    contentApiRoutes.find((r) => r.method === method && r.path === path)

  it.each(VENUE_ROUTES)(
    "%s %s is authenticated (no `auth` key) AND carries the is-venue-manager policy",
    (method, path, handler) => {
      const route = find(method, path)

      expect(route).toBeDefined()
      expect(route.handler).toBe(handler)
      expect(route.config).not.toHaveProperty("auth")
      expect(route.config.policies).toEqual([POLICY])
    }
  )

  it("resolves the policy id against the venues plugin's exported policy map", () => {
    // The route string is `plugin::venues.is-venue-manager`; the key below is
    // what it resolves against at boot.
    expect(typeof (venuesPolicies as any)["is-venue-manager"]).toBe("function")
  })

  it("wires every handler to a controller action that actually exists", () => {
    const controllers = (plugin as any).controllers
    const venueEvents = controllers["venue-events"]({ strapi: {} as any })

    for (const [, , handler] of VENUE_ROUTES) {
      const action = handler.split(".")[1]
      expect(typeof venueEvents[action]).toBe("function")
    }
  })

  it("declares no content-api route with a `config.auth` value other than false", () => {
    // BOOT GUARD: Strapi validates every route config with `strict: true`, and
    // `config.auth` only accepts `false` or `{ scope: string[] }`. Without this
    // pin a boot-breaking route table ships with a fully green suite.
    for (const route of contentApiRoutes) {
      const auth = route.config?.auth
      if (auth === undefined) continue
      expect({ path: route.path, method: route.method, auth }).toEqual({
        path: route.path,
        method: route.method,
        auth: false,
      })
    }
  })

  it("leaves the three pinned public readers untouched", () => {
    const PUBLIC: Array<[string, string, string]> = [
      ["GET", "/events", "events.findEvents"],
      ["GET", "/events/trending", "events.findTrending"],
      ["GET", "/events/:documentId", "events.findEvent"],
    ]
    for (const [method, path, handler] of PUBLIC) {
      const route = find(method, path)
      expect(route).toBeDefined()
      expect(route.handler).toBe(handler)
      expect(route.config.auth).toBe(false)
      expect(route.config.policies).toEqual([])
    }
  })

  it("seeds a permission id for EVERY venue route, and no id for a route that is gone", () => {
    // The seeded ids and the route handlers are two hand-maintained copies of
    // the same fact: users-permissions mints
    // `plugin::<plugin>.<controller>.<action>` from the route table, and only
    // a seeded row lets a fresh-database manager past the 403. Pinning each
    // copy against its own literal (as the two suites did separately) lets a
    // renamed action ship green and 403 every manager on every new
    // environment, so the two are derived from each other here.
    const fromRoutes = VENUE_ROUTES.map(
      ([, , handler]) => `plugin::events-manager.${handler}`
    ).sort()

    const fromSeed = VENUE_MANAGER_PERMISSION_ACTIONS.filter((action) =>
      action.startsWith("plugin::events-manager.venue-events.")
    ).sort()

    expect(fromSeed).toEqual(fromRoutes)
  })

  it("keeps the venue block under its own distinct prefix (no /events swallow)", () => {
    for (const [, path] of VENUE_ROUTES) {
      expect(path.startsWith("/venue/")).toBe(true)
    }
  })
})
