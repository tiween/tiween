/**
 * `plugin::venues.is-venue-manager` — the server-side tenant gate (Story 7.2).
 *
 * Epic 7 marks tenant isolation P0 and states plainly that the UI check is
 * convenience only: the boundary has to hold when someone calls the route with
 * a raw JWT. This policy is the first half of that boundary (is the caller a
 * venue manager at all?); the second half is the LOOKUP in
 * `services/venue-profile.ts`, which resolves the venue from
 * `ctx.state.user.id` so no id from the request ever reaches the Document
 * Service.
 *
 * A plain `return false` would surface as Strapi's generic 403 "Policy Failed"
 * with no `details.code`, and the spec's matrix pins `NOT_VENUE_MANAGER` as the
 * code the client translates. `PolicyError` is a `ForbiddenError` subclass, so
 * the status is still 403 — only the envelope gains the code.
 *
 * Shape copied from `plugins/user-engagement/server/src/policies/is-owner.ts`.
 */
import { errors } from "@strapi/utils"

const { PolicyError } = errors

/** The users-permissions role `type` provisioned by story 7.1. */
export const VENUE_MANAGER_ROLE_TYPE = "venue-manager"

/** Stable error CODE (project rule: codes, not prose). */
export const NOT_VENUE_MANAGER = "NOT_VENUE_MANAGER"

/**
 * Narrow the untyped policy context down to the one field that matters.
 * `ctx.state.user` is populated by the users-permissions auth strategy with the
 * role relation already joined; anything else is treated as "not a manager".
 */
function roleTypeOf(user: unknown): string | undefined {
  if (typeof user !== "object" || user === null) return undefined
  const role = (user as { role?: unknown }).role
  if (typeof role !== "object" || role === null) return undefined
  const type = (role as { type?: unknown }).type
  return typeof type === "string" ? type : undefined
}

export default (policyContext: any) => {
  // No user at all is normally a 401 from the auth strategy before we get here
  // (the route omits `config.auth`, which is how a content-api route is
  // declared authenticated); this branch only fires if a route is ever
  // misdeclared with `auth: false`.
  const user = policyContext?.state?.user

  if (!user || roleTypeOf(user) !== VENUE_MANAGER_ROLE_TYPE) {
    throw new PolicyError("Forbidden", {
      policy: "is-venue-manager",
      code: NOT_VENUE_MANAGER,
    })
  }

  return true
}
