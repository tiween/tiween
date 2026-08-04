import isTicketOwner from "./is-ticket-owner"

/**
 * `is-ticket-owner` stays REGISTERED but is currently attached to no route:
 * `GET /my-tickets` gates in its handler instead, so it can answer the spec'd
 * 401 `UNAUTHORIZED` rather than the generic 403 a policy rejection produces.
 * Kept available for routes that do want a pre-handler auth gate (Epic 8).
 */
export default {
  "is-ticket-owner": isTicketOwner,
}
