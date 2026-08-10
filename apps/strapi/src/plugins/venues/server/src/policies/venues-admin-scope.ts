/**
 * `plugin::venues.venues-admin-scope` — the server-side tenant gate for the
 * venues-plugin ADMIN CRUD routes (Story 2D.2, AC 7).
 *
 * The story is explicit that the UI's `canManageAllVenues` check is convenience
 * and that scoping is enforced server-side. This policy is the first half of
 * that boundary: it resolves the caller's capability ONCE, from the admin RBAC
 * ability, and stashes it on `ctx.state` as {@link VENUE_ADMIN_SCOPE_KEY}. The
 * second half is `services/venue-admin.ts`, which turns the scope into a
 * `manager.email` filter and an ownership re-check on every write.
 *
 * Why a policy rather than a check inside each controller: the capability must
 * be computed from the SAME source for all six routes, and a controller that
 * forgets to call it fails open. Here a route without the policy has no scope
 * at all, and the service treats a missing scope as the most restrictive one.
 *
 * `ctx.state.userAbility` is set by the admin auth strategy
 * (`@strapi/admin/server/src/strategies/admin.js`) for every `type: 'admin'`
 * route, so it is available before any policy runs. A super admin's ability
 * answers `true` for every registered action, which is why no special-casing
 * for super admins appears below.
 *
 * A plain `return false` would surface as Strapi's generic 403 "Policy Failed"
 * with no `details.code`, and this plugin's convention is a CODE the client
 * translates. `PolicyError` is a `ForbiddenError` subclass, so the status is
 * still 403 — only the envelope gains the code. (Shape copied from
 * `./is-venue-manager.ts`.)
 */
import { errors } from "@strapi/utils"

const { PolicyError } = errors

/** The admin RBAC action that means "Admin/Editor: every venue". */
export const MANAGE_ALL_VENUES_ACTION = "plugin::venues.manage-all"

/** Where the resolved scope is stashed for the controllers/services. */
export const VENUE_ADMIN_SCOPE_KEY = "venuesAdminScope"

/** Stable error CODE (project rule: codes, not prose). */
export const NOT_AUTHENTICATED = "NOT_AUTHENTICATED"

/** What the caller is allowed to reach (mirrors `services/venue-admin.ts`). */
export interface VenueAdminScope {
  canManageAll: boolean
  email?: string
}

/**
 * Ask the CASL ability whether the caller holds the manage-all action.
 *
 * Wrapped because `userAbility` is absent on any route that is somehow reached
 * without the admin strategy, and an ability that throws must not be read as a
 * grant — every failure path answers `false` (fail closed).
 */
function canManageAll(userAbility: unknown): boolean {
  const can = (userAbility as { can?: unknown } | undefined)?.can
  if (typeof can !== "function") return false

  try {
    return (
      (can as (action: string) => boolean).call(
        userAbility,
        MANAGE_ALL_VENUES_ACTION
      ) === true
    )
  } catch {
    return false
  }
}

/** The caller's admin email — the join key to `venue.manager.email`. */
function emailOf(user: unknown): string | undefined {
  if (typeof user !== "object" || user === null) return undefined
  const email = (user as { email?: unknown }).email
  return typeof email === "string" && email.trim() !== ""
    ? email.trim()
    : undefined
}

export default (policyContext: any) => {
  const user = policyContext?.state?.user

  // Normally unreachable: an `admin`-type route is authenticated by the admin
  // strategy and answers 401 before any policy runs. This branch only fires if
  // a route is ever misdeclared.
  if (!user) {
    throw new PolicyError("Unauthorized", {
      policy: "venues-admin-scope",
      code: NOT_AUTHENTICATED,
    })
  }

  const scope: VenueAdminScope = {
    canManageAll: canManageAll(policyContext?.state?.userAbility),
    email: emailOf(user),
  }

  // `policyContext` is `Object.assign({}, ctx)` (@strapi/utils `policy.js`), so
  // `state` is the SAME object the controller reads off `ctx` — assigning here
  // is what makes the scope visible downstream.
  policyContext.state[VENUE_ADMIN_SCOPE_KEY] = scope

  return true
}
