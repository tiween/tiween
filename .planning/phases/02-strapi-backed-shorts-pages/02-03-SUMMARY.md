---
phase: 02-strapi-backed-shorts-pages
plan: 03
subsystem: frontend-watchlist-hooks
tags: [react-query, watchlist, optimistic-update, next-auth, vitest]
status: complete

requires:
  - phase: 02-strapi-backed-shorts-pages
    provides: vitest globs for src/features/watchlist, shorts copy keys watchlist.loginRequiredShort / undoRemove (plans 01, 02)
provides:
  - useWatchlistCheck(id, { enabled }), exported fetchWatchlist and useWatchlistScope
  - useAddToWatchlist(id, { optimistic, variant, check }) with isResolved in its result
  - useRemoveFromWatchlist(id, { variant, check })
  - WatchlistItem.creativeWork optional slug / releaseYear / duration
  - useWatchlistIds (non-polling, shares the watchlistKeys.list entry)
  - ShortsWatchlistProvider and useShortsWatchlistResolved
affects: [02-07, 02-09]

actuals:
  tokens: 11800
  tasks: 2
  commits: 2
plan_head_before: ec3836055632abd08c050765bfe039c161f462f7
plan_head_after: ef412640a1463290432752bef0e6ffe18dbc03b5

tech-stack:
  added: []
  patterns:
    - "Additive options object as a hook's second argument; no options means byte-identical behavior"
    - "Grid-level provider seeds per-card check keys from one shared list query; cards read with the check query disabled"
    - "Optimistic write waits for an in-flight check cancel (async revert) but stays synchronous when nothing is fetching"

key-files:
  created:
    - apps/client/src/features/watchlist/hooks/useWatchlistIds.ts
    - apps/client/src/features/watchlist/hooks/useWatchlistIds.test.tsx
    - apps/client/src/features/watchlist/components/ShortsWatchlistProvider/ShortsWatchlistProvider.tsx
    - apps/client/src/features/watchlist/components/ShortsWatchlistProvider/ShortsWatchlistProvider.test.tsx
    - apps/client/src/features/watchlist/components/ShortsWatchlistProvider/index.ts
  modified:
    - apps/client/src/features/events/hooks/useWatchlist.ts
    - apps/client/src/features/events/hooks/useWatchlist.test.ts
    - apps/client/src/features/events/hooks/useAddToWatchlist.ts
    - apps/client/src/features/events/hooks/useAddToWatchlist.test.ts
    - apps/client/src/features/events/hooks/useRemoveFromWatchlist.tsx
    - apps/client/src/features/events/hooks/useRemoveFromWatchlist.test.ts
    - apps/client/src/features/watchlist/components/index.ts
    - apps/client/src/features/watchlist/index.ts

key-decisions:
  - "D-14: the short-film variant only changes the signed-out toast key (loginRequiredShort); the redirect still uses the browser pathname, with no write and no queue"
  - "D-15: no second queue; the provider reads the existing per-user queue (getPendingOps) so a queued add or remove wins over the server list"
  - "Optimistic add cancels an in-flight check GET and writes after the cancel resolves, because the cancel's revert lands asynchronously and would otherwise overwrite the fill"
  - "Seeding also skips while the list query is refetching, not only while a mutation is in flight, so the post-mutation invalidation cannot flip a heart back from the stale list"

requirements-completed: []

completed: 2026-11-10
---

# Phase 2 Plan 03: Watchlist hooks for shorts hearts Summary

**The shipped events watchlist hooks now take additive options (disable the check query, optimistic add with rollback, short-film copy), and a grid-level provider resolves every heart of a directory from one non-polling list request with zero per-card check requests.**

## Accomplishments

- `useWatchlist.ts`: list queryFn extracted into exported `fetchWatchlist` (request shape unchanged), `useWatchlistScope` exported, `useWatchlistCheck` takes `{ enabled }` (default true, AND-ed into the existing gate; seeded data is still returned when disabled), `WatchlistItem.creativeWork` gained optional `slug`, `releaseYear`, `duration`. No key, staleTime or polling change.
- `useAddToWatchlist`: `{ optimistic, variant, check }`. Optimistic online add fills `{ isInWatchlist: true }` before the POST settles and restores `false` plus the error toast on failure; `variant: "short-film"` swaps the signed-out toast to `loginRequiredShort`; result now exposes `isResolved`.
- `useRemoveFromWatchlist`: `{ variant, check }`; `short-film` uses `undoRemove` for the Undo label and altText. Guard matrix untouched.
- `useWatchlistIds`: query on `watchlistKeys.list(scope)` with the shared `fetchWatchlist`, stable module-level `select` to a `Set` of `creativeWork.documentId` (null relations skipped), staleTime 60 s, same gcTime, `refetchOnReconnect`, no `refetchInterval`.
- `ShortsWatchlistProvider` seeds `watchlistKeys.check(userId, id)` for every visible id once the list succeeds, under the signed-in user's scope only; `useShortsWatchlistResolved()` is true when signed out, on success, on error, when paused offline, and with no provider.

## Test results

- Hooks: 6 files, 76 tests (all pre-existing hook test cases unchanged and green, plus 18 new cases).
- Watchlist module: 2 files, 15 tests (one list request and zero `/watchlist/check/` requests for a three-film grid; exact `[watchlist, check, 7, <id>]` keys; another user's entry untouched; unresolved userId seeds nothing; in-flight mutation protection then re-seed; queued op wins; resolved on error, paused and signed out).
- Wider run `src/features/events src/features/watchlist "src/app/[locale]/watchlist"`: 28 files, 380 tests, all passed.
- `npx tsc --noEmit`: 0 errors. `eslint src/features/watchlist src/features/events/hooks --max-warnings=0`: exit 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Optimistic fill could be reverted by a cancelled check GET**

- **Found during:** Task 1 design (verified in `@tanstack/query-core` source: a cancelled fetch dispatches an `error` action that restores the pre-fetch state asynchronously)
- **Issue:** Writing the cache synchronously right after `cancelQueries` would be overwritten by the revert when a check GET was in flight.
- **Fix:** When `isFetching` for the check key is above zero, wait for `cancelQueries` to resolve, then write and mutate; otherwise stay synchronous.
- **Files modified:** `apps/client/src/features/events/hooks/useAddToWatchlist.ts`
- **Commit:** 3d55f98

**2. [Rule 2 - Missing critical functionality] Provider also guards on list refetch and on the offline queue**

- **Found during:** Task 2
- **Issue:** The plan's guard (no mutation in flight) leaves two gaps: after a mutation settles, `invalidateQueries` refetches the list, and seeding from the pre-refetch list flips the new heart back for a moment; and a list refetch on reconnect could overwrite an op still waiting in the offline queue (threat T-02-09, D-15).
- **Fix:** Seeding also waits while the list `isFetching`, and applies `getPendingOps(userId)` over the server set (queued add means true, queued remove means false). No new queue.
- **Files modified:** `apps/client/src/features/watchlist/components/ShortsWatchlistProvider/ShortsWatchlistProvider.tsx`
- **Commit:** ef41264

**3. [Rule 3 - Blocking] First commit rejected by commitlint (body line over 100 chars)**

- Reworded and recommitted; no content change. No commit was created by the failed attempt.

### Notes

- `useIsMutating()` is unfiltered because the existing watchlist mutations carry no `mutationKey`; any app mutation pauses seeding. This errs on the safe side and settles quickly. Adding a mutation key would have touched the events mutations beyond the plan's additive scope.
- The Task 2 verify in the plan lists two `<automated>` entries; both were run (see below).

## Verification run

| Verify            | Command                                                                                     | Result                                        |
| ----------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Task 1            | `yarn workspace @tiween/client vitest run src/features/events/hooks`                        | Test Files 6 passed, Tests 76 passed          |
| Task 2 (tests)    | `yarn workspace @tiween/client vitest run src/features/watchlist src/features/events/hooks` | Test Files 8 passed (8), Tests 91 passed (91) |
| Task 2 (types)    | `npx tsc --noEmit` in `apps/client`                                                         | no output, 0 errors                           |
| Lint              | `eslint src/features/watchlist src/features/events/hooks --max-warnings=0`                  | exit 0                                        |
| Plan verification | `vitest run src/features/events src/features/watchlist "src/app/[locale]/watchlist"`        | Test Files 28 passed, Tests 380 passed        |

## Known Stubs

None.

## Threat Flags

None. All new cache entries use `watchlistKeys` (prefix `[watchlist]`, carrying `userId`), so `signOutAndClearCache` evicts them; no endpoint, auth path or schema was added.

## Self-Check: PASSED

- FOUND: useWatchlistIds.ts, useWatchlistIds.test.tsx, ShortsWatchlistProvider.tsx, ShortsWatchlistProvider.test.tsx, ShortsWatchlistProvider/index.ts
- FOUND commits: 3d55f98, ef41264 (ancestors of HEAD)
