---
title: "Story 5.1 — Add Event to Watchlist"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "33cf792da840e08683a75cafc970bff1427700c4"
final_revision: "6e03fd6f52fc8ea4d4b0ed55c98f8d8a893b9e8c"
review_loop_iteration: 1
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** An authenticated user viewing an event has no way to save it — the event detail heart is a local `useState` stub (`EventDetailPage.handleWatchlist`) that persists nothing, and every watchlist API call is blocked by the private-proxy allow-list (403). The backend watchlist CRUD already exists but is unreachable from the client.

**Approach:** Wire the event-detail heart to the existing `user-engagement` watchlist add path so a tap persists to Strapi, fills the heart gold with a pulse, and toasts confirmation; allow-list the watchlist endpoints; and introduce a minimal persisted offline queue that captures the add while offline and replays it on reconnect.

## Boundaries & Constraints

**Always:**

- The watchlisted entity is the **creative-work**, not the event. This is the architecture's source of truth (`user-engagement.user-watchlist.creativeWork`; architecture.md L77/L233/L567). The event's film is resolved with the existing `getEventFilm(event)` helper (`screenings[0].movie`); its `documentId` is the `creativeWorkId` passed to the watchlist API. "Add event to watchlist" is satisfied by saving the viewed event's underlying creative-work.
- All watchlist calls go through the existing `PrivateStrapiClient` + `/api/private-proxy` path with `{ useProxy: true }`; the proxy allow-list in `request-auth.ts` must permit them or they 403.
- Reuse the existing react-query watchlist hooks (`useWatchlistCheck`, `useWatchlistMutations`) — do NOT introduce Zustand or SWR (neither is in the client; the epic-context's mention of them is aspirational and does not match the codebase).
- User-facing strings come from a next-intl `watchlist` namespace present in all three locales (`fr`, `ar`, `en`) — no hardcoded copy (project rule).
- Offline persistence uses `localStorage` (jsdom-testable; IndexedDB is absent from jsdom and `fake-indexeddb` is not a dependency).

**Block If:**

- `getEventFilm(event)` cannot yield a stable `documentId` for the MVP `movie_screening` events served to the detail route (i.e. the deep detail read stops populating `screenings.movie`). Without a creative-work id there is nothing to persist — HALT, do not invent an id or fall back to the event id.

**Never:**

- Do NOT change the `user-watchlist` schema or re-target it to `event` — the creative-work relation is the ratified architecture decision.
- Do NOT wire the watchlist control into the browse **EventCard grid** (`EventsListing`) in this story — curated/browse slices do not populate `screenings.movie`, so cards lack a creative-work id (deferred 3.1a populate gap). Story 5.1's surface is the event **detail** page ("viewing an event").
- Do NOT build the remove-with-undo UX (toast undo, card-exit animation → Story 5.2), the watchlist page (5.3), full offline read/last-synced UI (5.4), cross-device sync (5.5), or notifications (5.6). Only the ADD op is queued offline here.
- Do NOT add a DELETE entry to the proxy allow-list (remove path is 5.2).

## I/O & Edge-Case Matrix

| Scenario             | Input / State                                                                   | Expected Output / Behavior                                                                                                                                        | Error Handling                                                                                          |
| -------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Add online (authed)  | Tap heart, not watchlisted, `navigator.onLine === true`                         | `POST /user-engagement/watchlist { creativeWorkId }`; check-query → watchlisted; heart fills gold + pulse; toast `watchlist.addSuccess` ("Ajouté à la watchlist") | On API error: roll back optimistic state, show `watchlist.error` destructive toast                      |
| Add offline (authed) | Tap heart, not watchlisted, offline                                             | Enqueue `{ creativeWorkId, addedAt }` in the localStorage pending-add queue; optimistic heart fill + pulse; toast `watchlist.queued`                              | If the queue write throws, no optimistic change + destructive toast                                     |
| Reconnect drain      | `online` event fires (or app mount while online) with a non-empty pending queue | Replay each queued add via the add mutation; on success remove that item from the queue; invalidate watchlist queries                                             | Per-item failure keeps the item queued for the next `online`; never clears an item that did not persist |
| Unauthenticated tap  | Tap heart, `status !== "authenticated"`                                         | Redirect to `/{locale}/auth/signin?callbackUrl=<current event url>`; no write, no queue                                                                           | n/a                                                                                                     |
| Event has no film    | `getEventFilm(event)?.documentId` is undefined                                  | Heart is disabled (no-op); no request                                                                                                                             | n/a (guarded)                                                                                           |
| Duplicate add        | Add for a creative-work already saved                                           | Backend `add` is idempotent (read-then-return existing); no duplicate row                                                                                         | n/a                                                                                                     |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` -- existing `add`/`toggle`/`isInWatchlist` service (idempotent add: findMany then create). Target of the new unit test; no logic change expected.
- `apps/client/src/lib/strapi-api/request-auth.ts` -- `ALLOWED_STRAPI_ENDPOINTS` proxy allow-list. Proxied path is `api/user-engagement/watchlist` (client builds `/api/private-proxy/api/user-engagement/watchlist`; `startsWith` covers `/check/:id` and `/toggle`).
- `apps/client/src/features/events/hooks/useWatchlist.ts` -- existing react-query hooks (`watchlistKeys`, `useWatchlistCheck`, `useWatchlistMutations().addMutation`, `useWatchlistToggle`). Reuse; do not duplicate.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- L145 local `useState` stub `watchlisted` + L215 `handleWatchlist`; feeds `FilmHero` at L243-253. Primary surface to rewire. Receives raw `event: StrapiEvent`.
- `apps/client/src/features/events/utils/eventMappers.ts` -- `getEventFilm(event)` (L108) exported; `screenings[0].movie` → creative-work.
- `apps/client/src/features/events/components/FilmHero/FilmHero.tsx` -- watchlist `<button>`+`Heart` (L200-230); fills `fill-primary` gold but has NO pulse. Needs the pulse-on-add.
- `apps/client/src/features/watchlist/components/WatchlistButton/WatchlistButton.tsx` -- reference for the `animate-watchlist-pulse` false→true trigger pattern to mirror in FilmHero.
- `apps/client/src/components/providers/ClientProviders.tsx` -- app-wide client provider; mount the reconnect-drain here so it runs regardless of route.
- `apps/client/src/components/ui/use-toast.ts` -- `toast({ description, variant? })`.
- `apps/client/locales/{fr,ar,en}.json` -- add `watchlist` namespace (no existing watchlist namespace).
- `apps/client/vitest.config.ts` -- `include` is an explicit allow-list; new hook tests under `src/features/events/hooks/` are NOT yet matched.

## Tasks & Acceptance

<!-- AMENDED after review pass 1 (2026-07-10). The offline queue MUST be per-user
     and auth-gated; see the CRITICAL invariants below and the Spec Change Log. -->

**CRITICAL cross-cutting invariants (a violation is a data-integrity defect — do not ship without them):**

- **Per-user, auth-gated offline queue.** A queued add MUST only ever replay under the exact user who created it. The localStorage key is namespaced by the authenticated user id: `tiween:watchlist:pending-add:<userId>` (userId = `session.user.userId`). The drain runs ONLY when `status === "authenticated"` and ONLY over the current user's key. NEVER use a single global key and NEVER drain while unauthenticated. (Prevents User A's offline add landing in User B's watchlist on a shared browser.)
- **No silent success.** If persisting to the queue fails (storage quota/blocked/private-mode), the enqueue function returns `false`; the caller then shows the error toast and does NOT show the queued toast and does NOT apply the optimistic fill. The UI must never claim "queued" for an add that was not stored.
- **Bounded, self-healing queue.** Each op carries an `attempts` counter; a failed replay increments it and, once it reaches `MAX_DRAIN_ATTEMPTS` (5), the op is dropped (give up — prevents an undeletable/unpublished creative-work poisoning the queue with forever-retries). The queue is capped at `MAX_QUEUE_SIZE` (100); enqueue drops the oldest entry when full.

**Execution:**

- [x] `apps/client/src/lib/strapi-api/request-auth.ts` -- Add `"api/user-engagement/watchlist"` to both the `GET` and `POST` arrays of `ALLOWED_STRAPI_ENDPOINTS` (GET covers list + `/check/:id`; POST covers add + `/toggle` via `startsWith`). Do NOT add a DELETE entry. Note in a code comment that the POST prefix also reaches `/toggle` (which can remove) — this is acceptable because every watchlist route is JWT-self-scoped and no Story 5.1 UI path invokes toggle; DELETE (hard remove) stays blocked until Story 5.2. -- Without the allow-list the proxy 403s every watchlist call.
- [x] `apps/client/src/features/events/utils/watchlistQueue.ts` -- NEW. Per-user localStorage pending-**add** queue. Key builder `pendingAddKey(userId) => \`tiween:watchlist:pending-add:${userId}\``. Op type `{ creativeWorkId: string; addedAt: string; attempts: number }`. Functions: `enqueueAdd(userId, creativeWorkId): boolean`(dedupe by id; enforce`MAX_QUEUE_SIZE`; return `false`if the write throws/no storage),`getPendingAdds(userId)`, `bumpAttempt(userId, creativeWorkId)`(increment; remove when`attempts >= MAX_DRAIN_ATTEMPTS`), `removePendingAdd(userId, creativeWorkId)`, `clearPendingAdds(userId)`. All access SSR-guarded (`typeof window`) + try/catch; a read failure returns `[]`, a write failure returns `false`. -- Greenfield offline queue; the per-user key + bounded retries are the core of the pass-1 fix.
- [x] `apps/client/src/features/events/hooks/useAddToWatchlist.ts` -- NEW. `useAddToWatchlist(creativeWorkId?)` → `{ isWatchlisted, add, isPending, canWatchlist }`. Composes `useWatchlistCheck` + `useWatchlistMutations().addMutation` + `useSession`. `add()` guards, in order: (1) `status === "loading"` → no-op (do NOT redirect during hydration); (2) `status === "unauthenticated"` → show `loginRequired` toast then `router.push` to signin with `callbackUrl` (fallback `pathname ?? \`/${locale}\``), no write/queue; (3) `!creativeWorkId` → no-op; (4) already watchlisted (`checkData?.isInWatchlist`) OR `addMutation.isPending`→ no-op (no POST, no toast — prevents the misleading "Ajouté" on a filled heart and duplicate POSTs); (5) offline →`enqueueAdd(userId, id)`; only on `true`apply optimistic`setQueryData(watchlistKeys.check(id), { isInWatchlist: true })`+`queued`toast, else`error`toast; (6) online →`addMutation.mutate`with success/error toast.`userId = session.user.userId`. Strings via `useTranslations("watchlist")`. -- Single testable source of the add branch matrix, hardened per pass 1.
- [x] `apps/client/src/features/events/hooks/useWatchlistSync.ts` -- NEW. Reconnect drain, **auth-gated and per-user**: read `useSession`; the drain no-ops unless `status === "authenticated"`, and operates only on `getPendingAdds(userId)`. On the window `online` event and once on mount when `navigator.onLine && authenticated`, replay each queued add via the add mutation: on success `removePendingAdd(userId, id)`; on failure `bumpAttempt(userId, id)` (which self-drops after `MAX_DRAIN_ATTEMPTS`). Re-entrancy guarded by a ref. Invalidate `watchlistKeys.list()` after any success. Re-run the effect when the authenticated `userId` changes. -- Fixes the cross-user replay + poison-entry retry-forever defects.
- [x] `apps/client/src/components/providers/ClientProviders.tsx` -- Mount the drain app-wide by calling `useWatchlistSync()` from a tiny child component rendered inside the existing `QueryClientProvider` (which is inside the NextAuth `SessionProvider`, so `useSession` resolves). -- Reconnect can happen off the detail page.
- [x] `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- Replace the local `useState`/`handleWatchlist` stub with `useAddToWatchlist(getEventFilm(event)?.documentId)`; feed its `isWatchlisted` and `onWatchlist={add}` to `FilmHero`; pass `watchlistDisabled={!canWatchlist}`. Remove the dead local `watchlisted` state. -- The "viewing an event" surface (AC).
- [x] `apps/client/src/features/events/components/FilmHero/FilmHero.tsx` -- (a) Add a `watchlistDisabled?: boolean` prop → set the button `disabled`, `aria-disabled`, disabled styling, and early-return in the click handler; when disabled, do NOT announce an actionable add/remove label. (b) Play `animate-watchlist-pulse` (defined in `src/styles/globals.css`) ONLY on a **user-initiated** add, not on the async `useWatchlistCheck` hydration: gate the pulse behind a `justClickedRef` set in the click handler and consumed when the false→true transition fires. Keep the `fill-primary` gold fill + 44px target. -- AC pulse; fixes the spurious load-pulse + disabled-affordance a11y.
- [x] `apps/client/locales/fr.json`, `apps/client/locales/ar.json`, `apps/client/locales/en.json` -- Add a `watchlist` namespace: `addSuccess` (FR = "Ajouté à la watchlist"), `queued`, `loginRequired`, `error`. (`loginRequired` is now shown on the unauthenticated tap; `add`/`remove` labels are supplied by FilmHero's `labels` prop, so do NOT add unused `add`/`remove` keys here.) Accurate AR/EN. -- AC toast copy; no dead keys.
- [x] `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- NEW `*.unit.test.ts` mirroring `events-manager/.../public-api.unit.test.ts` (mocked `strapi.documents()`): `add` returns the existing entry when `{ user, creativeWork }` matches (no second create) and otherwise creates scoped by user + creative-work `documentId`. -- Lock idempotent add.
- [x] `apps/client/src/features/events/utils/watchlistQueue.test.ts` -- NEW (matched by `utils/**`). Cover: per-user key isolation (user A's queue invisible to user B), enqueue-dedupe, `MAX_QUEUE_SIZE` cap drops oldest, `bumpAttempt` self-drop at `MAX_DRAIN_ATTEMPTS`, `enqueueAdd` returns `false` on throwing storage, remove, clear, malformed-payload → `[]`. -- Lock the hardened queue contract.
- [x] `apps/client/src/features/events/hooks/useAddToWatchlist.test.ts` -- NEW (`renderHook` under `QueryClientProvider`; `vi.mock` `@/lib/strapi-api`; mock `useSession`, `next/navigation`, `navigator.onLine`, `enqueueAdd`). Assert: online add → POST + success toast; offline add (enqueue ok) → queued toast + `result.current.isWatchlisted === true` + no POST; offline add (enqueue returns false) → error toast + NO optimistic fill; `status==="loading"` tap → neither redirect nor POST; already-watchlisted tap → no POST, no toast; unauthenticated tap → `loginRequired` toast + signin redirect, no write. -- Lock the full branch matrix incl. pass-1 guards.
- [x] `apps/client/src/features/events/hooks/useWatchlistSync.test.ts` -- NEW. `renderHook` with a mocked `useWatchlistMutations` and seeded per-user queue. Assert: on `window` `online` while authenticated, each queued add is replayed and removed on success; a rejected replay retains the item and bumps attempts (dropped after `MAX_DRAIN_ATTEMPTS`); `list()` invalidated after success; NO drain when `status !== "authenticated"`; only the current user's queue drains. -- Fills the biggest verification gap (core sync had zero tests).
- [x] `apps/client/src/lib/strapi-api/request-auth.test.ts` -- EDIT existing. Add assertions: `isStrapiEndpointAllowed("api/user-engagement/watchlist", "POST") === true`, GET `=== true`, and DELETE `=== false` (remove stays blocked). -- The whole feature's network path was previously unverified.
- [x] `apps/client/src/features/events/utils/eventMappers.test.ts` -- EDIT existing. Add a `getEventFilm` case: a representative event yields the film's `documentId`; a filmless event yields `undefined`. -- The detail-page id-extraction seam was unverified; a bad extraction would render every heart permanently disabled.
- [x] `apps/client/vitest.config.ts` -- Add `"src/features/events/hooks/**/*.test.ts"` AND `"src/features/events/components/FilmHero/**/*.test.tsx"` to the `include` allow-list. -- Otherwise the new hook tests and a FilmHero test never run.
- [x] `apps/client/src/features/events/components/FilmHero/FilmHero.test.tsx` -- NEW (Testing Library). Assert: `watchlistDisabled` renders a `disabled` button whose click does NOT call `onWatchlist`; the pulse class appears only after a user click drives false→true, not when `isWatchlisted` flips true without a click (load hydration). -- Locks the disabled affordance + user-only pulse.

**Acceptance Criteria:**

- Given an authenticated user on an event detail page, when they tap the heart while online, then the creative-work is persisted (a reload shows the heart filled — `check` returns watchlisted) and a "Ajouté à la watchlist" toast appears.
- Given the private proxy, when the watchlist GET/POST endpoints are called, then they are allow-listed (no 403), and DELETE stays blocked.
- Given an offline authenticated user whose add is stored, when connectivity returns, then it is replayed under **their** account and removed from the queue; a permanently-failing entry is dropped after 5 attempts rather than retried forever.
- Given two different users on the same browser, when user A queues an add offline and user B later signs in, then A's queued add is NEVER added to B's watchlist.
- Given an offline add whose queue write fails, when the tap is handled, then the user sees an error (not a "queued" confirmation) and the heart does not falsely fill.
- Given a user tapping during session hydration (`status === "loading"`), when the tap is handled, then they are NOT redirected to sign-in.
- Given an unauthenticated visitor, when they tap the heart, then a `loginRequired` toast shows and they are redirected to sign-in (callbackUrl back to the event); nothing is persisted.
- Given an already-watchlisted event, when the filled heart is tapped, then no add request fires and no "Ajouté" toast appears.
- Given an event already in the watchlist, when its detail page loads, then the heart does NOT play the add pulse (pulse fires only on a user-initiated add).
- Given any user-facing watchlist string, when rendered, then it resolves from the `watchlist` i18n namespace in the active locale (fr/ar/en).

## Spec Change Log

### 2026-07-10 — Review pass 1 (bad_spec loopback)

- **Triggering findings:** (1) HIGH — the offline pending-add queue used a single global localStorage key with an un-auth-gated, app-wide drain, so User A's offline add could replay into User B's watchlist on a shared browser. (2) MED — `add()` redirected to sign-in while the NextAuth session was still `loading`, bouncing already-authenticated users. (3) MED — tapping an already-watchlisted heart re-fired the POST and a false "Ajouté" toast (no guard). (4) MED — offline enqueue failures were silent (UI showed "queued" + optimistic fill anyway) and permanently-failing entries retried forever; queue unbounded. (5) MED — the core reconnect drain, the proxy allow-list additions, the FilmHero disabled/pulse behavior, and the `getEventFilm` id-extraction seam had no tests. (6) LOW — the add pulse fired on the async `useWatchlistCheck` hydration (page load), not only on a user add.
- **Amended (outside `<intent-contract>`):** added CRITICAL cross-cutting invariants (per-user `userId`-namespaced queue key, auth-gated + per-user drain, `enqueueAdd` returns success, `MAX_DRAIN_ATTEMPTS` self-drop, `MAX_QUEUE_SIZE` cap); rewrote the queue/hook/sync tasks and the FilmHero task (disabled prop + user-only pulse); dropped the unused `add`/`remove` i18n keys and wired `loginRequired`; added tasks + tests for `useWatchlistSync`, `request-auth.test.ts` allow-list assertions, `getEventFilm`, and a `FilmHero` test (+ vitest `include`); expanded ACs and the golden example with the guard order and per-user id.
- **Known-bad state avoided:** a cross-account data leak (one user's saves appearing in another's), a hydration-race sign-in bounce, a self-inflicted retry-forever POST loop, and a green test suite that never exercised the sync/allow-list/extraction paths.
- **KEEP (must survive re-derivation):** the architecture resolution (watchlist targets `creativeWork`; id via `getEventFilm(event)?.documentId`); reuse of the existing `useWatchlist.ts` react-query hooks (no Zustand/SWR); the proxy allow-list approach (GET+POST, no DELETE); localStorage as the queue store (jsdom-testable); the FilmHero `animate-watchlist-pulse` (globals.css) fill-gold + 44px target; the `watchlist` i18n namespace with FR `addSuccess` = "Ajouté à la watchlist"; the backend `watchlist.unit.test.ts` mirroring the events-manager unit test; scope discipline (detail page only, add-only, no 5.2–5.6).

## Review Triage Log

### 2026-07-10 — Review pass 1

- intent_gap: 0
- bad_spec: 6: (high 1, medium 4, low 1)
- patch: 0
- defer: 1
- reject: 6
- addressed_findings:
  - `[high]` `[bad_spec]` Offline queue not user-scoped / drain not auth-gated → cross-user watchlist leak — amended spec to require a `userId`-namespaced key + auth-gated, per-user drain.
  - `[medium]` `[bad_spec]` `add()` redirected during session `loading` — amended to no-op while loading; redirect only on `unauthenticated`.
  - `[medium]` `[bad_spec]` Re-adding an already-watchlisted heart fired a POST + false success toast — amended to no-op when watchlisted or a mutation is pending.
  - `[medium]` `[bad_spec]` Silent enqueue failure + poison-entry retry-forever + unbounded queue — amended: `enqueueAdd` returns success (else error toast, no optimistic), `MAX_DRAIN_ATTEMPTS` self-drop, `MAX_QUEUE_SIZE` cap.
  - `[medium]` `[bad_spec]` No verification for the drain, allow-list, FilmHero disabled/pulse, or `getEventFilm` — amended to add those tests (+ vitest `include`).
  - `[low]` `[bad_spec]` Pulse fired on async check hydration, not user add — amended to gate the pulse behind a click flag.

### 2026-07-10 — Review pass 2

All six pass-1 critical defects independently confirmed fixed and well-tested by all three reviewers. No intent_gap / bad_spec. Small hardening patches applied; residuals deferred.

- intent_gap: 0
- bad_spec: 0
- patch: 3: (medium 2, low 1)
- defer: 5: (medium 2, low 3)
- reject: 7
- addressed_findings:
  - `[medium]` `[patch]` A non-finite `attempts` (e.g. NaN → serialized `null`) passed `typeof === "number"` and could never reach `MAX_DRAIN_ATTEMPTS`, re-opening the poison-retry hole — hardened `isValidOp` with `Number.isFinite` (+ test `watchlistQueue.test.ts`).
  - `[medium]` `[patch]` The "drain once on mount while already online" branch (the common reopen-already-connected path, where no `online` event fires) had no test — added the authenticated+online mount-drain case to `useWatchlistSync.test.ts`.
  - `[low]` `[patch]` A re-enqueued id inherited its old (near-`MAX_DRAIN_ATTEMPTS`) attempt count and could be dropped after one more failure — reset `attempts` to 0 on re-enqueue so fresh user intent restores the retry budget (+ test).

## Design Notes

Add-flow routing (golden example for `useAddToWatchlist.add` — note the guard order and per-user id):

```ts
const userId = session?.user?.userId
const add = () => {
  if (status === "loading") return // don't bounce mid-hydration
  if (status !== "authenticated") {
    toast({ description: t("loginRequired") })
    router.push(
      `/${locale}/auth/signin?callbackUrl=${encodeURIComponent(pathname ?? `/${locale}`)}`
    )
    return
  }
  if (!creativeWorkId || !userId) return
  if (checkData?.isInWatchlist || addMutation.isPending) return // no-op filled heart / in-flight
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (!enqueueAdd(userId, creativeWorkId)) {
      toast({ variant: "destructive", description: t("error") })
      return
    }
    queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
      isInWatchlist: true,
    })
    toast({ description: t("queued") })
    return
  }
  addMutation.mutate(creativeWorkId, {
    onSuccess: () => toast({ description: t("addSuccess") }),
    onError: () => toast({ variant: "destructive", description: t("error") }),
  })
}
```

Per-user queue is the crux of the pass-1 fix: keying localStorage by `userId` plus an auth-gated drain makes it structurally impossible for one user's queued add to replay under another account — stale keys from a signed-out user simply never match the current drain scope. `bumpAttempt`'s self-drop bounds a poison entry (deleted/unpublished creative-work) so the drain converges instead of POSTing forever.

Why creative-work, not event: the epic story text says "event", but the ratified architecture (schema, controller, service, routes, and the react-query hooks) keys the watchlist on `creativeWork.documentId`. Re-targeting to `event` would discard working code and pull in the events `draftAndPublish` concern for no user-visible benefit. The detail page always has the film via `getEventFilm(event)`, so the user still "saves the event they're viewing."

Pulse only on user action: `useWatchlistCheck` resolves false→true asynchronously for an already-saved event, which would spuriously fire the "just added" pulse on page load. Gate the pulse behind a click flag so it reflects an add the user actually performed.

Known accepted limitation (not in scope to fully solve): the queue is per-browser localStorage, so two tabs of the SAME user can race the read-modify-write or double-drain; this is bounded by the backend's idempotent `add` (a double replay is harmless) and per-user scoping, and full multi-tab coordination belongs to the sync story (5.5).

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: the new `watchlist.unit.test.ts` passes (unit tier is the CI gate).
- `cd apps/client && yarn test` -- expected: `watchlistQueue.test.ts`, `useAddToWatchlist.test.ts`, `useWatchlistSync.test.ts`, `FilmHero.test.tsx`, the extended `request-auth.test.ts`, and `eventMappers.test.ts` all pass.
- `cd apps/client && yarn typecheck` -- expected: no NEW type errors attributable to changed/added files (baseline is repo-wide red; the pre-existing 5.3 `app/[locale]/watchlist/page.tsx` referencing this namespace's not-yet-built keys is out of scope — do NOT add its keys).
- `cd apps/client && yarn lint` -- expected: clean on changed files.

**Manual checks (if no CLI):**

- Grep `request-auth.ts` shows `api/user-engagement/watchlist` under GET and POST (not DELETE).
- `watchlistQueue.ts` uses a `userId`-namespaced key (no single global `tiween:watchlist:pending-add` key) and `useWatchlistSync.ts` imports `useSession` and no-ops when unauthenticated.
- `EventDetailPage.tsx` no longer contains the `setWatchlisted`/local-only `handleWatchlist` stub.

## Auto Run Result

Status: done

### Summary

Wired the event-detail heart (the "viewing an event" surface) to persist an add to the user's watchlist. The watchlisted entity is the event's underlying **creative-work** (`getEventFilm(event)?.documentId`) — the ratified architecture SOT — reusing the already-built `user-engagement` backend CRUD and the existing react-query `useWatchlist` hooks. Adds are auth-gated (unauthenticated → `loginRequired` toast + sign-in redirect), confirmed with a gold heart-fill + one-shot pulse and an "Ajouté à la watchlist" toast, and captured in a **per-user, bounded, auth-gated offline queue** that replays on reconnect. The proxy allow-list was opened for the watchlist GET/POST endpoints (DELETE stays blocked until 5.2).

### Files changed

- `apps/client/src/lib/strapi-api/request-auth.ts` — allow-list `api/user-engagement/watchlist` under GET + POST (+ `/toggle`-reachability comment); no DELETE.
- `apps/client/src/features/events/utils/watchlistQueue.ts` (NEW) — per-user (`tiween:watchlist:pending-add:<userId>`) bounded queue: `enqueueAdd` returns success, `MAX_QUEUE_SIZE` drop-oldest, `bumpAttempt` self-drop at `MAX_DRAIN_ATTEMPTS`, non-finite-`attempts` rejection.
- `apps/client/src/features/events/hooks/useAddToWatchlist.ts` (NEW) — add-flow hook with the hardened guard order (loading no-op, auth redirect, already-watchlisted/in-flight no-op, offline enqueue with failure surfacing, online mutate).
- `apps/client/src/features/events/hooks/useWatchlistSync.ts` (NEW) — auth-gated, per-user reconnect drain mounted app-wide.
- `apps/client/src/components/providers/ClientProviders.tsx` — mount the drain inside `QueryClientProvider`.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` — replace the local-`useState` stub with `useAddToWatchlist`; `watchlistDisabled={!canWatchlist}`.
- `apps/client/src/features/events/components/FilmHero/FilmHero.tsx` — `watchlistDisabled` prop (disabled/aria/click-guard) + user-initiated-only pulse.
- `apps/client/locales/{fr,ar,en}.json` — `watchlist` namespace (`addSuccess`/`queued`/`loginRequired`/`error`).
- Tests: `watchlistQueue.test.ts`, `useAddToWatchlist.test.ts`, `useWatchlistSync.test.ts`, `FilmHero.test.tsx` (NEW); extended `request-auth.test.ts` + `eventMappers.test.ts` (getEventFilm); backend `user-engagement/.../__tests__/watchlist.unit.test.ts` (NEW); `vitest.config.ts` include additions.

### Review findings breakdown

- Pass 1 (bad_spec loopback): 6 bad_spec (1 high — cross-user offline-queue leak; 4 medium; 1 low). Spec amended (per-user auth-gated bounded queue, guard order, pulse-on-user-add, full test coverage) and code re-derived. 1 deferred, 6 rejected.
- Pass 2: all 6 pass-1 criticals confirmed fixed by three independent reviewers. 3 patches applied (non-finite-attempts hardening; mount-while-online drain test; re-enqueue attempt-budget reset). 5 deferred, 7 rejected. No further loopback.

### Verification

- `cd apps/strapi && yarn test` — PASS (196 tests; new `watchlist.unit.test.ts` green).
- `cd apps/client && yarn test` — PASS (24 files / 306 tests).
- `cd apps/client && yarn typecheck` — no new errors from authored/edited files (repo baseline is pre-existing red; the out-of-scope 5.3 `app/[locale]/watchlist/page.tsx` namespace-key errors were intentionally not touched).
- `cd apps/client && yarn lint` — clean on changed files.

### Residual risks

Deferred (see `deferred-work.md`, 2026-07-10): reconnect optimistic-vs-refetch race (transient, self-heals; 5.5); offline-reload heart state not hydrated from the queue (5.4); allow-list `startsWith` has no path-segment boundary (pre-existing shared matcher; `/toggle` remove reachable but JWT-self-scoped and unused by 5.1 UI); disabled-heart a11y name (near-unreachable for MVP cinema); no `EventDetailPage` integration-seam test; and the desktop/map detail variants still use the old local stub (off the live route).
