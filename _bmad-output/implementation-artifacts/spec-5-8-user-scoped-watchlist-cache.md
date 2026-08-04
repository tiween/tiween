---
title: "Story 5.8 — User-Scoped Watchlist Query Cache (+ logout clear)"
type: "hardening"
created: "2026-07-10"
status: "done"
baseline_revision: "cff3b46c4c1950317812568cd5274467b53d69e0"
review_loop_iteration: 0
followup_review_recommended: false
final_revision: "00b750724dab14f49ca65b1fc77db3b7c12ea21d"
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

### As-built additions (2026-08-04)

- `apps/client/src/features/events/utils/watchlistKeys.ts` — **NEW.** The key factory was extracted out of `useWatchlist.ts` (which is re-exported from there, so every existing `import { watchlistKeys } from "./useWatchlist"` and its test mocks are unchanged). Reason: `useWatchlist.ts` imports `@/lib/strapi-api`, which eagerly validates `env.mjs`; the sign-out module must reach `watchlistKeys.all` without dragging that in. Also exports `UNRESOLVED_USER_ID = 0`, the placeholder scope used only while `userId` is unresolved (those queries are always `enabled: false`, and no Strapi user has id 0).
- `apps/client/src/lib/query-client.ts` — **NEW.** The app-wide `QueryClient`, moved out of `ClientProviders.tsx` so non-React code (the sign-out path) can evict from the very instance the provider hands to the tree. Exposed as `getQueryClient()` — a fresh client per server render, one singleton in the browser (review pass): `ClientProviders` is a client component, but client components still render on the server, and a module-scope instance would be one cache shared by every concurrent SSR request.
- `apps/client/src/lib/sign-out.ts` — **NEW.** `signOutAndClearCache(options)` = `queryClient.removeQueries({ queryKey: watchlistKeys.all })` then `signOut(options)`. There was NO shared sign-out path before; all three entry points (`ClientProviders` `TokenProvider` invalid-token auto-logout, `app/[locale]/auth/signout/page.tsx`, `ProfilePageClient` sign-out button) now route through it, and none of them imports `signOut` from `next-auth/react` any more.
- `apps/client/src/lib/sign-out.test.ts` — **NEW** (the logout-eviction case). Required adding `"src/lib/sign-out.test.ts"` to the explicit `include` list in `apps/client/vitest.config.ts`, which does not glob `src/lib/**`; without that line the file silently never ran.
- `apps/client/src/components/providers/ClientProviders.test.tsx` — **NEW** (review pass). Pins the invariant the eviction rests on: the client reaching the tree IS `getQueryClient()`. Also registered in `vitest.config.ts`.
- `apps/client/eslint.config.mjs` — **AMENDED** (review pass). `no-restricted-imports` bans NextAuth's `signOut` everywhere under `src/` except `lib/sign-out.ts`, so "every sign-out goes through here" is enforced rather than merely documented.
- `useWatchlist.ts` gained a private `useWatchlistScope()` helper returning `{ isAuthenticated, userId, scope }`, used by `useWatchlist`, `useWatchlistCheck` and `useWatchlistMutations`.

### As-built additions (2026-08-04, follow-up review pass)

- `apps/client/src/lib/query-client.test.ts` — **NEW.** Pins the SERVER branch of `getQueryClient()` (fresh client per call). Every other test runs under jsdom where `isServer` is `false`, so the anti-SSR-bleed branch was invisible: collapsing the module back to a plain `new QueryClient()` singleton passed the whole suite, lint and typecheck.
- `apps/client/src/app/[locale]/auth/signout/page.test.tsx` — **NEW.** `/auth/signout` is the route NextAuth is configured to send sign-outs to (`pages.signOut`, `lib/auth.ts` L200) and the target of the visible Logout link — the primary logout path — and it had no test at all. The ESLint guard only catches a call to the _wrong_ sign-out; nothing caught the call going missing.
- `apps/client/vitest.config.ts` — added `src/lib/query-client.test.ts` and the `src/app/**/signout/**/*.test.tsx` glob; **removed** the redundant `src/components/providers/ClientProviders.test.tsx` line (already matched by the pre-existing `src/components/providers/**/*.test.tsx` glob) whose comment falsely claimed it was required.
- `apps/client/eslint.config.mjs` — added a `no-restricted-syntax` rule for `import("next-auth/react")` / `require("next-auth/react")`; `no-restricted-imports` only sees static imports, so a dynamic import was an open bypass of the "every sign-out goes through `lib/sign-out.ts`" guard.

## Tasks & Acceptance

**Execution:**

- [x] Rewrite `watchlistKeys` to `all` / `list(userId)` / `check(userId, creativeWorkId)`.
- [x] Thread `userId` (from `useSession`) through `useWatchlist`, `useWatchlistCheck`, and both mutation invalidations; set `enabled: isAuthenticated && !!userId`.
- [x] Update `useAddToWatchlist`, `useRemoveFromWatchlist`, `useWatchlistSync`, `WatchlistPageClient` to pass `userId` into the keys.
- [x] Add the logout cache-eviction (`queryClient.removeQueries({ queryKey: watchlistKeys.all })`) at the shared sign-out path; verify all sign-out entry points hit it.
- [x] Update the four test files to the scoped keys; add (a) a same-tab user-switch test asserting B never reads A's cached list/check, and (b) a sign-out test asserting the watchlist cache is evicted.

**Acceptance Criteria:**

- Given two users in one tab (A signs out, B signs in), B's watchlist hooks never render A's cached data, and A's cache entries are removed on sign-out.
- Given a loading/unresolved session, no watchlist query fires and no key is built with an undefined id.
- Given a single logged-in user, watchlist behavior (data, polling, optimistic add/remove, offline queue) is unchanged.
- Given `cd apps/client && yarn test` + `yarn typecheck` + `yarn lint`, all prior watchlist/notification tests pass with the updated keys, plus the new isolation + eviction cases; no new type errors from changed files.

## Design Notes

Two layers, deliberately: user-scoped keys are the _structural_ fix (A's `["watchlist","list",7]` can never satisfy B's `["watchlist","list",9]` observer), and the logout `removeQueries` is the _hygiene_ fix (evict A's data from memory immediately rather than leaving it until gcTime). The offline localStorage queue is already per-user from 5.1, so it needs no change — this story closes only the in-memory react-query gap. `userId` is a `number`; keep it a number in the key (react-query keys are structurally compared, so type consistency matters — don't stringify in some call sites and not others).

### Block-If check (resolved, 2026-08-04)

`session.user.userId` IS reliably populated on an authenticated client session:
`apps/client/src/lib/auth.ts` sets `token.userId` on initial login for both the
credentials path (L142, from `authorize()`'s `user.id` — a Strapi numeric id, L82)
and the OAuth path (L123, from `/auth/{provider}/callback`), and the `session`
callback copies it to `session.user.userId` (L190). The type is `userId?: number`
(`types/next-auth.d.ts` L8/L38) — optional, so the hooks still gate on
`enabled: isAuthenticated && !!userId` rather than assuming it. Not blocked.

## Verification

- `cd apps/client && yarn test` — expected: green with updated keys + 2 new cases.
- `cd apps/client && yarn typecheck && yarn lint` — expected: clean on changed files.
- Manual: log in as A, open watchlist, sign out, log in as B on the same tab → B sees only B's watchlist (empty if B has none), never A's rows.

## Review Triage Log

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 3, low 3)
- defer: 5: (high 0, medium 4, low 1)
- reject: 9: (high 0, medium 0, low 9)
- addressed_findings:
  - `[medium]` `[patch]` The app-wide `QueryClient` was a module-scope singleton (pre-existing, but this story promoted it to a public importable module). Client components still render on the server, so one instance would be shared by every concurrent SSR request — the same cross-user bleed this story exists to close. Replaced with `getQueryClient()`: a fresh client per server render, one singleton in the browser (`lib/query-client.ts`), with `ClientProviders` and `sign-out.ts` both going through it.
  - `[medium]` `[patch]` Nothing pinned that `ClientProviders` hands the tree the SAME client `signOutAndClearCache` evicts from — reverting that one line left the whole suite green while the eviction cleared a cache no component read. Added `ClientProviders.test.tsx` with a context probe; verified it FAILS when the line is reverted to a local `new QueryClient()` and passes when restored.
  - `[medium]` `[patch]` "EVERY sign-out must go through here" was enforced only by a comment. Added an ESLint `no-restricted-imports` rule banning `signOut` from `next-auth/react` everywhere under `src/` except `lib/sign-out.ts`; verified it errors on a planted violation. Also added an assertion that the profile sign-out button calls `signOutAndClearCache({ callbackUrl: "/fr" })` (its test previously mocked `signOut` and never asserted it) and one for the `invalid_strapi_token` auto-logout path.
  - `[low]` `[patch]` `useWatchlistToggle` gated only on `isAuthenticated`, so a toggle fired before `userId` resolved would write optimistic data and invalidations under `UNRESOLVED_USER_ID` — falsifying that constant's docstring. Now gated on `!!userId` too.
  - `[low]` `[patch]` The sign-out ordering test asserted inside `signOutMock.mockImplementation`, and `vi.clearAllMocks()` does not reset implementations — the assertion would leak into every later test in the file. Switched to `vi.resetAllMocks()` and a recorded hand-off value instead of an assertion in the mock body.
  - `[low]` `[patch]` The two `enabled:false` tests asserted only `queryKey.every(part => part !== undefined)`, which a `null`/`""`/`-1` sentinel would also satisfy. They now assert the exact key `["watchlist","list",UNRESOLVED_USER_ID]`.

Deferred as DW-230 … DW-234 (notification keys unscoped; `useUser` key unscoped; session terminations that bypass the sign-out helper; the durable localStorage snapshot; the two divergent user-scope conventions). Rejected as noise: mutation callbacks closing over `scope` mid-session-change and the equivalent in the sync drain (both require a session switch during an in-flight mutation, and sign-out navigates away); `userId === 0` as a real Strapi id; sign-out failing after the cache is cleared (harmless — the next query refetches); prettier/import churn (toolchain-enforced, not a defect); test-local key mock factories (deliberate module isolation — the new isolation tests use the real factory); the removed `toHaveBeenCalledTimes(1)` assertion (superseded by the pass-through mock, which now exercises real key matching); the untested `!userId` early return in the card seed effect; and string-coercion of `userId` (typed `number`, verified end-to-end through `auth.ts`).

### 2026-08-04 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 2, low 2)
- defer: 2: (high 0, medium 0, low 2)
- reject: 19: (high 0, medium 0, low 19)
- addressed_findings:
  - `[medium]` `[patch]` The `isServer` branch of `getQueryClient()` — the guard that stops one query cache from being shared across concurrent SSR requests — was exercised by nothing. Every test runs under jsdom, so both existing assertions describe the browser singleton. Added `src/lib/query-client.test.ts`; verified it FAILS (2/2) when the module is collapsed back to a plain `new QueryClient()` singleton, which previously passed the full suite, lint and typecheck.
  - `[medium]` `[patch]` `/auth/signout/page.tsx` — the route NextAuth is configured to send sign-outs to and the target of the visible Logout link — had no test, and no `vitest.config.ts` glob even reached its directory, so a test added there would silently never run. The other two sign-out entry points got assertions last pass; this one, the primary path, did not. Added `page.test.tsx` (+ the `src/app/**/signout/**` glob); verified it FAILS when the `signOutAndClearCache` call is dropped.
  - `[low]` `[patch]` The `no-restricted-imports` guard added last pass only sees static imports — a dynamic `import("next-auth/react")` bypassed it entirely, defeating the "every sign-out evicts the cache" invariant it exists to enforce. Added a `no-restricted-syntax` rule covering `import()` and `require()`; verified it errors on a planted violation and that `lib/sign-out.ts` stays exempt.
  - `[low]` `[patch]` The `src/components/providers/ClientProviders.test.tsx` line added to `vitest.config.ts` last pass is dead config — the pre-existing `src/components/providers/**/*.test.tsx` glob (Story 4.5) already matches it — and its comment asserted it was required, a false claim the next author would copy. Removed the line, corrected the comment; the file still runs (verified in the full suite).

Deferred as DW-235 (`getQueryClient()` is call-scoped rather than request-scoped on the server, so a future SSR `prefetchQuery` + `HydrationBoundary` would silently hydrate nothing) and DW-236 (`useWatchlistToggle` is dead code — exported from nowhere, called by nothing — so the `!userId` guard added last pass is unobservable). Rejected as noise: the watchlist-page card seed's `!userId` early return (the effect lists `userId` in its deps and re-seeds the moment it resolves, and the heart renders from the hardcoded `isWatchlisted` prop, not the check cache — no user-visible change); `useWatchlistMutations` writing under scope `0` (every one of its four call sites gates on `!!userId`, so the path is unreachable); `userId === 0` as a real Strapi id, string-coercion of `userId` from the OAuth path, sign-out failing after the cache is cleared, the durable localStorage snapshot (DW-233), other-tab/gcTime residue and session terminations that skip the helper (DW-232), and notification/`["user","me"]` keys not being evicted (DW-230/231) — all previously triaged or already on the ledger; `check(scope, "")` for an id-less row (`enabled:false`); the two import paths to `watchlistKeys` (the re-export is what keeps existing imports and their test mocks unchanged); repeated firing of the `invalid_strapi_token` effect (deps-guarded, and it navigates away); `UNRESOLVED_USER_ID` not being a branded type; the `redirect:true` navigation making eviction redundant (it is redundant only on the path that reloads — the point is to not depend on that); positional `useQuerySpy.mock.calls[0]` in the isolation tests and a missing `afterEach` in `sign-out.test.ts` (vitest isolates module state per file; both are speculative); the ESLint rule not reaching other workspaces or `.js` files (nothing under `apps/client/src` is `.js`, and no other workspace renders this app's tree); `sign-out.test.ts`'s "leaves non-watchlist caches alone" naming (it correctly pins that eviction is targeted; DW-230 already records that it must change with the notifications fix); and the prettier/import churn.

## Auto Run Result

**Status:** done

**Change:** Watchlist react-query keys are user-scoped — `watchlistKeys.list(userId)` → `["watchlist","list",userId]` and `check(userId, creativeWorkId)` → `["watchlist","check",userId,creativeWorkId]`, with `all` kept as the bare `["watchlist"]` prefix. Every producer and consumer threads the authenticated `userId` (a `number`, never stringified), queries fire only when `isAuthenticated && !!userId`, and a shared sign-out path evicts `watchlistKeys.all` from the browser query client. One user's cached rows are structurally un-matchable by another user's observers, and are dropped from memory at sign-out rather than lingering until `gcTime`.

This follow-up review pass changed no production behavior. It closed the verification gaps around the two guards the previous pass introduced, and one bypass in the lint rule that pins them.

**Files changed (this pass):**

- `apps/client/src/lib/query-client.test.ts` — NEW. Pins the server branch of `getQueryClient()` (fresh client per call). Previously unreachable by any test: all others run under jsdom, where `isServer` is `false`.
- `apps/client/src/app/[locale]/auth/signout/page.test.tsx` — NEW. Covers NextAuth's configured sign-out route, the primary logout path, which had no test.
- `apps/client/vitest.config.ts` — registered `query-client.test.ts` and a `src/app/**/signout/**` glob (the include list is explicit and reached neither); removed a redundant `ClientProviders.test.tsx` entry already matched by the providers glob, and corrected its comment.
- `apps/client/eslint.config.mjs` — added `no-restricted-syntax` for dynamic `import("next-auth/react")` / `require(...)`; `no-restricted-imports` only sees static imports.
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-235, DW-236 appended.

Files from the original implementation pass (unchanged here) are listed in `## Code Map`.

**Review findings (this pass):** 4 patches applied (2 medium, 2 low), 2 deferred (DW-235, DW-236), 19 rejected as noise. No intent gaps and no spec deviations.

**Verification performed:**

- `apps/client`: `npx vitest run` → **77 files / 832 tests passed** (previous pass: 75 / 828).
- `apps/client`: `npx eslint . --max-warnings=0` → **clean**.
- `apps/client`: `npx tsc --noEmit` → **69 errors, all pre-existing** — identical count to the previous pass, and none in any file this story touched (grep-verified against the full touched-file list).
- Mutation testing of both new tests: collapsing `query-client.ts` to a module-level `new QueryClient()` singleton fails `query-client.test.ts` 2/2 (and passed everything before this pass); dropping the `signOutAndClearCache` call from `signout/page.tsx` fails `page.test.tsx` 1/2. Both files were restored and re-verified.
- The new ESLint rule was confirmed to error on a planted dynamic `import("next-auth/react")` and to leave `lib/sign-out.ts` exempt.
- Not run: the manual two-account browser check in `## Verification` (needs two real accounts on a running stack) — covered structurally by the same-tab user-switch test.

**Residual risks:**

- Eviction is bound to the sign-out function, not to the session ending; expiry and other-tab invalidation are covered only by the scoped keys (DW-232).
- Sibling per-user caches (`["user","me"]`, notification keys) remain unscoped and are not evicted (DW-230, DW-231) — the same leak class this story closed for the watchlist, explicitly out of its scope.
