---
title: "Story 5.8 — User-Scoped Watchlist Query Cache (+ logout clear)"
type: "hardening"
created: "2026-07-10"
status: "ready-for-dev"
origin: "Epic 5 retrospective (epic-5-retro-2026-07-10.md) — promoted critical-path debt"
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/deferred-work.md"
---

<intent-contract>

## Intent

**Problem:** The watchlist react-query keys are not user-scoped — `watchlistKeys.list()` is the singleton `["watchlist","list"]` and `check(id)` is `["watchlist","check",id]`, neither carrying a user id. On a shared device, when User A signs out and User B signs in in the same tab, B's `useWatchlist`/`useWatchlistCheck` mount against the SAME cache key and can render A's still-cached rows/answers until gc or a refetch lands. Nothing clears the watchlist cache on logout. (Deferred from 5.3/5.4/5.5 reviews, 2026-07-10.)

**Approach:** Scope every watchlist query key by the authenticated user's id (`session.data.user.userId`, a `number`) and clear the watchlist cache on sign-out. User-scoped keys make one user's cached data structurally un-matchable by another user's hooks; the explicit logout clear evicts it from memory immediately. Gate the queries on a resolved `userId` so no request fires under an ambiguous session.

## Boundaries & Constraints

**Always:**

- `watchlistKeys` becomes user-parameterized: `list(userId)` → `["watchlist","list",userId]`, `check(userId, creativeWorkId)` → `["watchlist","check",userId,creativeWorkId]`. Keep `all: ["watchlist"]` as the prefix so a single `removeQueries({ queryKey: watchlistKeys.all })` still evicts everything.
- Every producer AND consumer of these keys threads the current `userId`: `useWatchlist`, `useWatchlistCheck`, the `useWatchlistMutations` add/remove invalidations, `useAddToWatchlist`, `useRemoveFromWatchlist`, `useWatchlistSync`, and `WatchlistPageClient`.
- Queries are `enabled` only when `isAuthenticated && !!userId` (userId resolved) — never fire under `status==="loading"` or a missing id.
- On sign-out, evict the watchlist cache: `queryClient.removeQueries({ queryKey: watchlistKeys.all })` at the sign-out path.

**Block If:**

- `session.user.userId` is not reliably present on the authenticated client session (verify `types/next-auth.d.ts` + the session callback) — HALT rather than key on a possibly-undefined id (which would collapse back to a shared key). If it can be null post-auth, resolve the correct id source first.

**Never:**

- Do NOT change any backend endpoint, the offline localStorage queue (already per-user, keyed `tiween:watchlist:pending-add:<userId>` from 5.1), or the notifications keys (separate factory, out of scope).
- Do NOT introduce Zustand/SWR or a second cache — this is purely the react-query key shape + a logout eviction.
- Do NOT change watchlist _behavior_ for a single logged-in user (same data, same polling, same optimistic flows) — this is isolation-only.

## I/O & Edge-Case Matrix

| Scenario                         | State            | Expected                                                                                                                                 |
| -------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Single user browses              | authed, userId=7 | queries under `["watchlist","list",7]`; identical UX to today                                                                            |
| A logs out, B logs in (same tab) | A(7) → B(9)      | B's hooks key on `...,9`; A's `...,7` entries never match B's queries; logout also `removeQueries(["watchlist"])` so A's data is evicted |
| Session loading                  | status="loading" | `enabled:false`, no fetch, no key with undefined id                                                                                      |
| Mutation invalidation            | authed, userId=7 | add/remove invalidate `list(7)` + `check(7,id)` — not a bare key                                                                         |
| Offline queue                    | any              | unchanged (already per-user)                                                                                                             |

</intent-contract>

## Code Map

- `apps/client/src/features/events/hooks/useWatchlist.ts` — `watchlistKeys` (L60-65); `useWatchlist` (L79, key L84, `enabled` L100); `useWatchlistCheck` (L125, key L130, `enabled` L140); `useWatchlistMutations` invalidations (L178-200, L224) all use bare keys. **Parameterize by `userId`; read `useSession().data.user.userId`.**
- `apps/client/src/features/events/hooks/useAddToWatchlist.ts` — reads `session.user.userId` already; uses `watchlistKeys.check(id)` for optimistic `setQueryData`. **Pass `userId` into the key.**
- `apps/client/src/features/events/hooks/useRemoveFromWatchlist.tsx` — uses `watchlistKeys.check`. **Same.**
- `apps/client/src/features/events/hooks/useWatchlistSync.ts` — drains + invalidates `watchlistKeys.list()`. **Pass `userId`.**
- `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` — consumes the watchlist query. **Uses the scoped hook; verify no direct bare-key use.**
- `apps/client/src/components/providers/ClientProviders.tsx` — owns `QueryClientProvider` and a `signOut` path. **Add `removeQueries({ queryKey: watchlistKeys.all })` on sign-out.** (Also check `app/[locale]/auth/signout/page.tsx` and `ProfilePageClient.tsx` sign-out buttons route through it.)
- `apps/client/src/types/next-auth.d.ts` — `userId?: number` (L8, L38). **Confirm it's populated on the authed session; it's a number → keys carry a number.**
- Tests: `useWatchlist.test.ts`, `useRemoveFromWatchlist.test.ts`, `useWatchlistSync.test.ts`, `WatchlistPageClient.test.tsx` — **update to the user-scoped keys + add a user-switch isolation case and a logout-eviction case.**

## Tasks & Acceptance

**Execution:**

- [ ] Rewrite `watchlistKeys` to `all` / `list(userId)` / `check(userId, creativeWorkId)`.
- [ ] Thread `userId` (from `useSession`) through `useWatchlist`, `useWatchlistCheck`, and both mutation invalidations; set `enabled: isAuthenticated && !!userId`.
- [ ] Update `useAddToWatchlist`, `useRemoveFromWatchlist`, `useWatchlistSync`, `WatchlistPageClient` to pass `userId` into the keys.
- [ ] Add the logout cache-eviction (`queryClient.removeQueries({ queryKey: watchlistKeys.all })`) at the shared sign-out path; verify all sign-out entry points hit it.
- [ ] Update the four test files to the scoped keys; add (a) a same-tab user-switch test asserting B never reads A's cached list/check, and (b) a sign-out test asserting the watchlist cache is evicted.

**Acceptance Criteria:**

- Given two users in one tab (A signs out, B signs in), B's watchlist hooks never render A's cached data, and A's cache entries are removed on sign-out.
- Given a loading/unresolved session, no watchlist query fires and no key is built with an undefined id.
- Given a single logged-in user, watchlist behavior (data, polling, optimistic add/remove, offline queue) is unchanged.
- Given `cd apps/client && yarn test` + `yarn typecheck` + `yarn lint`, all prior watchlist/notification tests pass with the updated keys, plus the new isolation + eviction cases; no new type errors from changed files.

## Design Notes

Two layers, deliberately: user-scoped keys are the _structural_ fix (A's `["watchlist","list",7]` can never satisfy B's `["watchlist","list",9]` observer), and the logout `removeQueries` is the _hygiene_ fix (evict A's data from memory immediately rather than leaving it until gcTime). The offline localStorage queue is already per-user from 5.1, so it needs no change — this story closes only the in-memory react-query gap. `userId` is a `number`; keep it a number in the key (react-query keys are structurally compared, so type consistency matters — don't stringify in some call sites and not others).

## Verification

- `cd apps/client && yarn test` — expected: green with updated keys + 2 new cases.
- `cd apps/client && yarn typecheck && yarn lint` — expected: clean on changed files.
- Manual: log in as A, open watchlist, sign out, log in as B on the same tab → B sees only B's watchlist (empty if B has none), never A's rows.
