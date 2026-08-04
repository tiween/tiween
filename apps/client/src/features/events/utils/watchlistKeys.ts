/**
 * User-scoped react-query key factory for the watchlist (Story 5.8).
 *
 * Every key carries the authenticated user's numeric id (`session.user.userId`)
 * so one account's cached rows/answers are structurally un-matchable by another
 * account's observers on a shared device. `all` stays the bare `["watchlist"]`
 * prefix so a single `removeQueries({ queryKey: watchlistKeys.all })` on
 * sign-out still evicts every user-scoped entry.
 *
 * Lives in `utils/` (not in `useWatchlist.ts`) so the sign-out path can import
 * the prefix without pulling in the Strapi client and its eager env validation.
 *
 * `userId` is ALWAYS a `number` here — react-query compares keys structurally,
 * so `7` and `"7"` are different scopes. Never stringify at a call site.
 */
export const watchlistKeys = {
  all: ["watchlist"] as const,
  list: (userId: number) => [...watchlistKeys.all, "list", userId] as const,
  check: (userId: number, creativeWorkId: string) =>
    [...watchlistKeys.all, "check", userId, creativeWorkId] as const,
}

/**
 * Placeholder scope used ONLY while the session (and therefore `userId`) is
 * unresolved. Every query built with it is `enabled: false`, so nothing is ever
 * fetched or written under it; it exists so a key is never built with
 * `undefined` (which react-query would refuse) and so an unresolved session
 * cannot collide with a real user's scope — no Strapi user has id `0`.
 */
export const UNRESOLVED_USER_ID = 0
