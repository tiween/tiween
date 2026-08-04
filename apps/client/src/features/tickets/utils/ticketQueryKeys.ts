/**
 * React-query key factories for the ticket reads (Story 6.4).
 *
 * Kept in their own module — the `watchlistKeys` precedent — so a consumer that
 * only needs to INVALIDATE or EVICT (e.g. `lib/sign-out.ts`) does not drag in
 * the hooks and, through them, the Strapi clients that eagerly validate
 * `env.mjs`.
 */

/**
 * Placeholder scope used ONLY while the session is unresolved. Every query
 * built with it is `enabled: false` (mirrors `UNRESOLVED_USER_ID` in the
 * watchlist keys) — no Strapi user has id `0`.
 */
export const UNRESOLVED_USER_ID = 0

/**
 * User-scoped key factory: one account's cached tickets must be structurally
 * un-matchable by another account on a shared device. `userId` is ALWAYS a
 * `number` — react-query compares keys structurally, so `7` and `"7"` would be
 * different scopes.
 */
export const myTicketKeys = {
  all: ["my-tickets"] as const,
  list: (userId: number) => [...myTicketKeys.all, "list", userId] as const,
}

/**
 * Scoped by order number AND token — a different token is a different
 * authorization and must not reuse a cached answer.
 */
export const orderTicketKeys = {
  all: ["order-tickets"] as const,
  list: (orderNumber: string, token: string) =>
    [...orderTicketKeys.all, "list", orderNumber, token] as const,
}
