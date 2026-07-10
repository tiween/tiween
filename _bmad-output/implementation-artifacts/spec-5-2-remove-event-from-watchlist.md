---
title: "Story 5.2 — Remove Event from Watchlist"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "d988d8dc9443ef7b337d0b3a9e7dd73b1d7a5486"
final_revision: "dc147a168302cd3a0b0808730c094a819af2de89"
review_loop_iteration: 1
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-5-1-add-event-to-watchlist.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** An authenticated user viewing a watchlisted event cannot remove it — tapping the filled event-detail heart calls the add-only `useAddToWatchlist` (a no-op on an already-saved item), and even if it called the shipped `removeMutation`, the private-proxy allow-list has **no DELETE array**, so every DELETE 403s. Story 5.1 also made only the ADD op queue offline; there is no offline-remove.

**Approach:** Make the event-detail heart a **toggle** — tapping a filled heart removes the underlying creative-work (heart → outline) via the already-shipped `removeMutation` (DELETE), shows a success toast with an **Undo** action that re-adds, and, when offline, queues the remove in a per-user queue generalized to carry both add and remove ops with last-write-wins reconciliation. Open the proxy allow-list for DELETE, and add the missing backend remove-path unit coverage.

## Boundaries & Constraints

**Always:**

- The removed entity is the **creative-work**, mirroring 5.1: `getEventFilm(event)?.documentId` is the `creativeWorkId`. Remove goes through the shipped `useWatchlistMutations().removeMutation` (DELETE `api/user-engagement/watchlist/:creativeWorkId`) over `PrivateStrapiClient` + `/api/private-proxy` — never a new endpoint.
- Reuse the existing react-query watchlist hooks and query-key factory (`watchlistKeys`, `useWatchlistCheck`, `useWatchlistMutations().removeMutation`/`addMutation`) — do NOT introduce Zustand/SWR or a second query cache.
- **Per-user, auth-gated offline queue (inherited 5.1 invariant, extended to removes):** every queued op — add OR remove — is stored under the current user's key and replays ONLY under that authenticated user. The drain runs ONLY when `status === "authenticated"` and ONLY over the current user's queue. NEVER a global key, NEVER a drain while unauthenticated. (Prevents User A's offline remove replaying under User B on a shared browser.)
- **Last-write-wins reconciliation:** enqueuing any op for a `creativeWorkId` REPLACES any existing pending op for that same id (add↔remove cancel to the user's latest intent) and resets its `attempts` — the queue never holds two contradictory ops for one id. This is the epic's "conflicts resolve last-write-wins."
- **No silent success:** if the offline enqueue write fails (storage blocked/quota/private mode), the enqueue returns `false`; the caller then shows the error toast and does NOT apply the optimistic outline and does NOT show the removeSuccess toast.
- **Backward-compatible generalization:** keep the existing localStorage key literal (`tiween:watchlist:pending-add:<userId>`) and treat any legacy op lacking a `kind` field as `kind:"add"`, so 5.1's in-flight queued adds still drain. `useAddToWatchlist.ts` (5.1) must keep working unchanged via a thin `enqueueAdd` compat wrapper.
- User-facing strings resolve from the next-intl `watchlist` namespace in all three locales (`fr`, `ar`, `en`) — no hardcoded copy.

**Block If:**

- Generalizing `watchlistQueue.ts` cannot preserve 5.1's in-flight add replay (the legacy no-`kind` op cannot be safely normalized to `kind:"add"`) — HALT rather than silently drop users' queued adds.
- The shipped `removeMutation` does NOT actually issue `DELETE api/user-engagement/watchlist/:creativeWorkId` self-scoped by JWT (i.e. the investigated contract is wrong) — HALT; do not invent a new route or re-target the schema.

**Never:**

- Do NOT change the `user-watchlist` schema, the backend `remove`/`toggle` service/controller/routes, or re-target watchlist off `creativeWork` — the backend remove path already exists and is correct; 5.2 only adds its missing test.
- Do NOT change `FilmHero.tsx` — its heart is already state-agnostic (`onWatchlist` fires regardless of state; fill↔outline is driven by `isWatchlisted`; the add pulse stays add-only). The toggle decision lives in `EventDetailPage`.
- Do NOT build the **watchlist-page card-exit animation** or wire undo into the watchlist page (`WatchlistPageClient`) — that page is Story 5.3's surface; it already removes functionally via query invalidation. 5.2's surface is the event **detail** heart (symmetric with 5.1). Record the page-level exit-animation + shared-undo as deferred to 5.3.
- Do NOT add a global toast-timeout change, cross-device sync (5.5), or the full offline read/last-synced UI (5.4).

## I/O & Edge-Case Matrix

| Scenario                    | Input / State                                                     | Expected Output / Behavior                                                                                                                                    | Error Handling                                                                                             |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Remove online (authed)      | Tap filled heart, `isInWatchlist`, `navigator.onLine === true`    | Optimistic `setQueryData(check → { isInWatchlist:false })` (heart outline); `removeMutation.mutate(id)`; toast `removeSuccess` with an **Undo** `ToastAction` | On API error: rollback check → true, destructive `error` toast                                             |
| Remove offline (authed)     | Tap filled heart, watchlisted, offline                            | `enqueueOp(userId,"remove",id)`; on `true` optimistic outline + `removeSuccess` toast with Undo; on `false` no optimistic change + `error` toast              | Enqueue write throws → returns `false` → error toast, heart stays filled                                   |
| Undo (re-add)               | Tap **Undo** in the remove toast                                  | Re-add via the 5.1 add path: online `addMutation.mutate(id)`; offline `enqueueOp(userId,"add",id)` (REPLACES the pending remove); optimistic check → true     | On add error: destructive `error` toast; check rolled back to false                                        |
| Reconnect drain (mixed)     | `online` fires (or mount while online) with add+remove ops queued | Replay each op by `kind` (`add`→`addMutation`, `remove`→`removeMutation`); on success remove that op; invalidate `watchlistKeys.list()`                       | Per-item failure `bumpAttempt` (self-drop at `MAX_DRAIN_ATTEMPTS`); never clear an op that did not persist |
| Tap on an unsaved heart     | Tap outline heart, `isInWatchlist === false`                      | Falls through to the 5.1 **ADD** flow — NOT remove                                                                                                            | n/a                                                                                                        |
| Idempotent remove           | DELETE for a creative-work not in the list                        | Backend returns `{ removed:false }`, HTTP 200 (no 404/throw); UI already shows outline                                                                        | n/a                                                                                                        |
| Remove while loading/unauth | Tap during `status==="loading"` or unauthenticated                | No-op (a filled heart is only reachable when authenticated+watchlisted; guard defends it): no DELETE, no queue, no redirect during hydration                  | n/a (guarded)                                                                                              |

</intent-contract>

## Code Map

- `apps/client/src/lib/strapi-api/request-auth.ts` -- `ALLOWED_STRAPI_ENDPOINTS` has GET+POST arrays but NO `DELETE` key; the per-method `startsWith` matcher rejects every DELETE. **The one true blocker.**
- `apps/client/src/features/events/hooks/useWatchlist.ts` -- shipped `useWatchlistMutations().removeMutation` (DELETE `api/user-engagement/watchlist/:creativeWorkId`, invalidates `list`+`check`) and `addMutation`; `watchlistKeys`, `useWatchlistCheck`. Reuse; no change.
- `apps/client/src/features/events/hooks/useAddToWatchlist.ts` -- 5.1 add hook (guard order, offline enqueue, optimistic). Reused for Undo's re-add; must keep working unchanged.
- `apps/client/src/features/events/utils/watchlistQueue.ts` -- 5.1 per-user add-only queue (`tiween:watchlist:pending-add:<userId>`, op `{creativeWorkId,addedAt,attempts}`, `enqueueAdd`/`getPendingAdds`/`bumpAttempt`/`removePendingAdd`/`clearPendingAdds`, `MAX_QUEUE_SIZE`/`MAX_DRAIN_ATTEMPTS`, `isValidOp` with `Number.isFinite`). **Generalize to carry `kind`.**
- `apps/client/src/features/events/hooks/useWatchlistSync.ts` -- 5.1 auth-gated per-user reconnect drain (currently add-only). **Extend to dispatch by `kind`.**
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- L147 wires `useAddToWatchlist(...)` add-only into FilmHero (`isWatchlisted`/`onWatchlist`/`watchlistDisabled`). **Compose remove: `onWatchlist = isWatchlisted ? remove : add`.**
- `apps/client/src/features/events/components/FilmHero/FilmHero.tsx` -- heart button; `onWatchlist` is state-agnostic, fill↔outline driven by `isWatchlisted`, `removeFromWatchlist` label already present. **No change.**
- `apps/client/src/components/ui/toast.tsx` -- exports `ToastAction` (+`ToastActionElement`); `apps/client/src/components/ui/use-toast.ts` `toast({ action })`; `toaster.tsx` renders `{action}`. Undo affordance ready. No change.
- `apps/client/locales/{fr,ar,en}.json` -- `watchlist` namespace has `addSuccess`/`queued`/`loginRequired`/`error`. Add `removeSuccess`, `undo`.
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` -- shipped `remove(userId,creativeWorkId)` (idempotent → `true/false`, deletes the matching row's `documentId`) and `toggle`. No logic change; add missing test.
- `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- 5.1 test covers `add` only; `buildStrapi` mocks `findMany`/`create`. Add a `delete` mock + `remove` cases.
- `apps/client/vitest.config.ts` -- already includes `src/features/events/hooks/**/*.test.ts` (5.1); the new remove-hook test is matched. No change.

## Tasks & Acceptance

<!-- AMENDED after review pass 1 (2026-07-10). A toggle introduces a concurrency
     concern the add-only 5.1 hook never had; see the CRITICAL invariant below. -->

**CRITICAL cross-cutting invariant (a violation is a correctness defect — do not ship without it):**

- **In-flight guard on the toggle.** Because the detail heart is now a toggle whose handler is rebound every render (`isWatchlisted ? remove : add`) and each op flips the `check` cache **optimistically and synchronously**, a rapid double-tap would otherwise fire the two ops back-to-back — the second tap reads the just-flipped state and fires the OPPOSITE op, so a `DELETE` and a `POST` race the same row with a non-deterministic final state (`add` and `remove` use separate mutation instances, so neither `isPending` cross-guards the other). The heart MUST be disabled while EITHER the add or the remove mutation is in flight: `watchlistDisabled={!canWatchlist || addIsPending || removeIsPending}` (both hooks already expose `isPending`). The Undo re-add must likewise no-op while `addMutation.isPending`.

**Execution:**

- [x] `apps/client/src/lib/strapi-api/request-auth.ts` -- Add a `DELETE: ["api/user-engagement/watchlist"]` entry to `ALLOWED_STRAPI_ENDPOINTS` (the `startsWith` matcher then covers `.../watchlist/:creativeWorkId`). Do NOT widen GET/POST. -- Without it the proxy 403s every remove.
- [x] `apps/client/src/features/events/utils/watchlistQueue.ts` -- Generalize the op to `PendingOp = { kind: "add" | "remove"; creativeWorkId: string; addedAt: string; attempts: number }`, **keeping the existing key literal** `pendingAddKey(userId)`. `isValidOp` normalizes a legacy op with no `kind` to `kind:"add"` (still `Number.isFinite(attempts)`). Add `enqueueOp(userId, kind, creativeWorkId): boolean` = **replace any existing op for that id (reset attempts to 0), then append** (last-write-wins reconciliation); enforce `MAX_QUEUE_SIZE` drop-oldest; return `false` on any write failure/no storage. Add `getPendingOps(userId)`, `removePendingOp(userId, id)`; keep `bumpAttempt(userId,id)` (kind-agnostic self-drop at `MAX_DRAIN_ATTEMPTS`) and `clearPendingOps`. Keep `enqueueAdd(userId,id) => enqueueOp(userId,"add",id)` as a compat wrapper so 5.1's add hook + its test are untouched. All access SSR-guarded + try/catch (read fail → `[]`, write fail → `false`). -- Enables symmetric offline remove without breaking 5.1.
- [x] `apps/client/src/features/events/hooks/useRemoveFromWatchlist.ts` -- NEW. `useRemoveFromWatchlist(creativeWorkId?)` → `{ remove }`. Composes `useWatchlistCheck` + `useWatchlistMutations()` (both `removeMutation` and `addMutation`, for Undo) + `useSession` + `useQueryClient`. `remove()` guards in order: (1) `status==="loading"` → no-op; (2) `status!=="authenticated"` → no-op (filled heart is unreachable while unauthenticated); (3) `!creativeWorkId || !userId` → no-op; (4) `!checkData?.isInWatchlist || removeMutation.isPending` → no-op (nothing to remove / in-flight); (5) offline → `enqueueOp(userId,"remove",id)`; only on `true` apply optimistic `setQueryData(watchlistKeys.check(id), { isInWatchlist:false })` + `removeSuccess` toast **with an Undo `ToastAction`**, else `error` toast (no optimistic change); (6) online → optimistic check→false, then `removeMutation.mutate(id)` with success (`removeSuccess` + Undo toast) / error (rollback check→true, `error` toast). Undo re-adds via the shared add primitives: online `addMutation.mutate(id)`, offline `enqueueOp(userId,"add",id)` (which replaces the pending remove), then optimistic check→true; the re-add no-ops while `addMutation.isPending` (no redundant double-fire). Strings via `useTranslations("watchlist")`; `userId = session.user.userId`. Expose `isPending` (from `removeMutation.isPending`) on the returned object so the detail page can build the in-flight guard. -- Single testable source of the remove branch matrix.
- [x] `apps/client/src/features/events/hooks/useWatchlistSync.ts` -- Extend the auth-gated per-user drain to iterate `getPendingOps(userId)` and dispatch by `kind`: `add`→`addMutation`, `remove`→`removeMutation`; on success `removePendingOp(userId,id)`, on failure `bumpAttempt(userId,id)`. Keep the re-entrancy ref, the mount-while-online branch, per-user re-run on `userId` change, and `invalidate(watchlistKeys.list())` after any success. -- Drains removes as well as adds; without it queued removes never replay.
- [x] `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` -- Keep `useAddToWatchlist(id)` for `isWatchlisted`/`add`/`canWatchlist`/`isPending`; add `useRemoveFromWatchlist(id)` for `remove`/`isPending`; wire `onWatchlist={isWatchlisted ? remove : add}` (id = `getEventFilm(event)?.documentId`). Set `watchlistDisabled={!canWatchlist || addIsPending || removeIsPending}` (the in-flight guard — see the CRITICAL invariant). FilmHero stays untouched. -- Makes the heart a race-free toggle (AC).
- [x] `apps/client/locales/fr.json`, `apps/client/locales/ar.json`, `apps/client/locales/en.json` -- Add `watchlist.removeSuccess` (FR ≈ "Retiré de la watchlist") and `watchlist.undo` (FR = "Annuler") to all three, accurate AR/EN. No other keys. -- AC toast copy; no dead keys.
- [x] `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- EDIT. Add a `delete: jest.fn()` to the `docApi` mock and `remove` cases: a matching row → `documents(WATCHLIST_UID).delete` called with `{ documentId: <matched row documentId> }` and returns `true`; no match → `delete` NOT called and returns `false`; optionally a `toggle` case delegating to remove when present. -- Locks the idempotent remove the whole feature depends on (currently untested).
- [x] `apps/client/src/features/events/utils/watchlistQueue.test.ts` -- EDIT. Add: `enqueueOp("remove")` then `getPendingOps` round-trips with `kind:"remove"`; enqueuing the opposite kind for the same id REPLACES (queue holds one op, attempts reset); a legacy op with no `kind` reads back as `kind:"add"`; `enqueueAdd` compat wrapper still works; `MAX_QUEUE_SIZE` drop-oldest and non-finite-`attempts` rejection still hold. -- Locks the generalized queue contract + 5.1 backward-compat.
- [x] `apps/client/src/features/events/hooks/useRemoveFromWatchlist.test.ts` -- NEW (`renderHook` under `QueryClientProvider`; mock `@/lib/strapi-api`, `useSession`, `next/navigation`, `navigator.onLine`, `enqueueOp`/`enqueueAdd`). Assert: online remove → DELETE (`removeMutation`) + `removeSuccess` toast whose `action` is present + `isWatchlisted` optimistic false; offline remove (enqueue ok) → `removeSuccess`+Undo, `enqueueOp(...,"remove",...)`, no DELETE; offline remove (enqueue `false`) → `error` toast, heart stays filled; tap when NOT watchlisted → no DELETE (add flow owns it); tap during `loading`/unauthenticated → no DELETE/queue/redirect; Undo online → `addMutation` fired + check→true; **Undo offline** (`navigator.onLine=false`) → `enqueueOp(userId,"add",id)` (NOT `"remove"`) + check→true + on enqueue-`false` an `error` toast with no refill. -- Locks the full remove branch matrix incl. both undo paths (the offline re-add is a plausible copy-paste regression site).
- [x] `apps/client/src/features/events/hooks/useWatchlistSync.test.ts` -- EDIT. Add: a seeded queue containing a `remove` op drains via `removeMutation` and is removed on success; a mixed add+remove queue replays each by kind; a failing `remove` replay bumps attempts (drops after `MAX_DRAIN_ATTEMPTS`); still no drain when unauthenticated; only the current user's queue drains. -- Locks kind-aware draining.
- [x] `apps/client/src/lib/strapi-api/request-auth.test.ts` -- EDIT. Add: `isStrapiEndpointAllowed("api/user-engagement/watchlist/abc", "DELETE") === true`; a non-watchlist DELETE (e.g. `"api/events-manager/events", "DELETE"`) `=== false`. -- Verifies the allow-list opens DELETE only for watchlist.
- [x] `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.test.tsx` -- NEW (Testing Library; `vi.mock` `useAddToWatchlist` and `useRemoveFromWatchlist` to return controlled `isWatchlisted` + spy `add`/`remove`, plus the usual next-intl/router/session mocks the surrounding tests use). Assert: with `isWatchlisted=true`, tapping the hero heart calls `remove` (NOT `add`); with `isWatchlisted=false`, it calls `add` (NOT `remove`); and the heart is disabled (no op fired) when a mutation reports `isPending`. -- Locks the toggle wiring + in-flight guard at the composition seam an inverted ternary would otherwise pass silently.
- [x] `apps/client/vitest.config.ts` -- Add `"src/features/events/components/EventDetailPage/**/*.test.tsx"` to the `include` allow-list. -- Otherwise the new wiring test never runs.

**Acceptance Criteria:**

- Given an authenticated user on an event detail page whose event is in their watchlist, when they tap the filled heart while online, then the creative-work is removed (a reload shows the heart outline — `check` returns not-watchlisted), the heart turns to outline, and a "Retiré de la watchlist" toast with an **Undo** action appears.
- Given that remove toast, when the user taps **Undo**, then the creative-work is re-added (heart fills again; `check` returns watchlisted) via the existing add path.
- Given a remove (or add) mutation in flight, when the user taps the heart again before it settles, then the heart is disabled and no opposing op is fired — the add `POST` and remove `DELETE` can never race the same row.
- Given an offline user who taps **Undo** on a removed event, when the re-add is handled, then it enqueues an `add` (not a `remove`) op and the heart refills; if the queue write fails, an `error` toast shows and the heart is not falsely refilled.
- Given the private proxy, when a watchlist DELETE is called, then it is allow-listed (no 403), while a non-watchlist DELETE stays blocked; GET/POST are unchanged.
- Given an offline authenticated user who removes a watchlisted event, when connectivity returns, then the DELETE is replayed under **their** account and the op is removed from the queue; a permanently-failing op is dropped after `MAX_DRAIN_ATTEMPTS` rather than retried forever.
- Given an offline user who adds then removes (or removes then adds) the same event before reconnecting, when the queue reconciles, then it holds only the latest intent (one op, not two contradictory ops) and the server converges to that state.
- Given two different users on the same browser, when user A queues a remove offline and user B later signs in, then A's queued remove is NEVER applied to B's watchlist.
- Given an offline remove whose queue write fails, when the tap is handled, then the user sees an `error` (not a success) toast and the heart stays filled.
- Given a user tapping during session hydration (`status==="loading"`), when the tap is handled, then nothing is removed and they are not redirected.
- Given the backend `remove` service, when called for a creative-work not in the list, then it is idempotent (returns `false`/`{removed:false}`, no throw, no 404).
- Given any user-facing watchlist string, when rendered, then it resolves from the `watchlist` i18n namespace in the active locale (fr/ar/en).

## Spec Change Log

### 2026-07-10 — Review pass 1 (bad_spec loopback)

- **Triggering findings:** (1) MED — the detail heart became a toggle (`isWatchlisted ? remove : add`) but was never disabled while a mutation was in flight, and each op flips the `check` cache synchronously; a rapid double-tap therefore fired the OPPOSITE op, racing a `DELETE` and a `POST` against the same row (the two hooks use separate mutation instances, so neither `isPending` cross-guarded the other) → non-deterministic final watchlist state. (2) MED — no test pinned the toggle wiring (an inverted `filled→add`/`empty→remove` ternary would pass the whole suite) nor the offline-Undo re-add branch (a `"remove"`-for-`"add"` copy-paste would ship silently). (3) LOW — the Undo re-add was unguarded against a double-fire.
- **Amended (outside `<intent-contract>`):** added a CRITICAL in-flight-guard invariant (`watchlistDisabled={!canWatchlist || addIsPending || removeIsPending}`; both hooks already expose `isPending`); required the remove hook to expose `isPending` and to no-op the Undo re-add while `addMutation.isPending`; added tasks for an `EventDetailPage.test.tsx` toggle-wiring/guard test (+ the `vitest.config.ts` `include` glob it needs) and an offline-Undo assertion in `useRemoveFromWatchlist.test.ts`; expanded the ACs with the guard and offline-undo behaviors.
- **Known-bad state avoided:** an add/remove double-tap race that leaves the server in an indeterminate state, and a green suite that never exercised the central toggle wiring or the offline-undo path.
- **KEEP (must survive re-derivation):** the backend `remove`/`toggle` service is correct + idempotent — keep the added remove/toggle unit tests; the queue generalization (a `kind` field, the **preserved 5.1 key literal**, legacy no-`kind`→`add` normalization, last-write-wins reconciliation that replaces any existing op for an id, the `enqueueAdd` compat wrapper, `Number.isFinite`) is sound — keep as-is; the DELETE allow-list addition (watchlist-only, JWT-self-scoped) is correct; the remove hook's guard order (1–6), offline no-silent-success, and optimistic-outline+rollback; the kind-dispatch reconnect drain; the `removeSuccess`/`undo` i18n keys; FilmHero untouched; and the `isWatchlisted ? remove : add` toggle wiring (now hardened with the pending-guard, not replaced).

## Review Triage Log

### 2026-07-10 — Review pass 1

- intent_gap: 0
- bad_spec: 3: (high 0, medium 2, low 1)
- patch: 0
- defer: 0
- reject: 8
- addressed_findings:
  - `[medium]` `[bad_spec]` Toggle double-tap fired concurrent add `POST` + remove `DELETE` (no in-flight guard) → amended spec to require disabling the heart while either mutation is pending + guarding the Undo re-add.
  - `[medium]` `[bad_spec]` No verification for the toggle wiring or the offline-Undo re-add branch → amended spec to add an `EventDetailPage` wiring/guard test (+ vitest include) and an offline-Undo assertion.
  - `[low]` `[bad_spec]` Undo re-add unguarded against a double-fire → amended spec to no-op it while `addMutation.isPending`.
  - (rejected as noise / consistent-with-shipped-5.1 / self-healing: offline "Removed" vs "queued" copy — the frozen intent-contract deliberately chose `removeSuccess`; missing `cancelQueries` — mirrors the accepted 5.1 add hook and self-heals; queue naming aliases + `addedAt` misnomer — documented `@deprecated`; `checkData`-loading no-op — moot; offline `list()` cache not updated — 5.3 surface. Moot this pass under re-derive: DELETE `startsWith` path boundary — pre-existing shared matcher, no exploit route; backend multi-row delete — pre-existing, `add` idempotency prevents duplicates; drain-vs-concurrent-enqueue — very narrow, self-heals.)

### 2026-07-10 — Review pass 2

All three reviewers independently converged on ONE substantive new finding — the in-flight guard, added in pass 1, did not cover the Undo re-add's own `addMutation` instance. Fixed by patch. No intent_gap / bad_spec.

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 1, low 1)
- defer: 1: (low 1)
- reject: 7
- addressed_findings:
  - `[medium]` `[patch]` In-flight guard hole: the Undo re-add runs on the remove hook's OWN `addMutation`, whose pending state was not exposed, so after tapping Undo the heart re-enabled while the re-add `POST` was in flight and a heart tap could race a `DELETE` against it. Fixed: `isPending = removeMutation.isPending || addMutation.isPending` (EventDetailPage already folds it into `watchlistDisabled`); added three `isPending` guard tests.
  - `[low]` `[patch]` `normalizeOp` silently coerced any non-`"remove"` kind to `"add"` (a corrupt/case-variant `kind` would replay a remove as an add — intent inversion). Fixed: `isValidOp` now rejects an unknown present `kind` (dropped, not coerced); added a corrupt-kind drop test.
  - `[low]` `[defer]` Mid-drain snapshot vs. by-id `removePendingOp`: if the network flaps offline during a drain `await` and the user enqueues an opposite-kind op for an id still in the snapshot, the awaited success drops the fresh op by id. Very narrow timing; recorded in `deferred-work.md`.
  - (rejected: re-raised offline `removeSuccess` copy + `cancelQueries` — same pass-1 disposition; Undo toast-button double-tap — bounded by idempotent backend add; `addedAt` `@deprecated` nit; guard-3 `!creativeWorkId` untested — defended by `canWatchlist`; DELETE `startsWith` — already tracked from 5.1; `WatchlistPageClient` untested — pre-existing 5.3 surface, out of diff.)

## Design Notes

Toggle wiring (golden example — the heart is one button; state decides the op):

```ts
// EventDetailPage
const id = getEventFilm(event)?.documentId
const { isWatchlisted, add, canWatchlist } = useAddToWatchlist(id)
const { remove } = useRemoveFromWatchlist(id)
// FilmHero: onWatchlist={isWatchlisted ? remove : add}  watchlistDisabled={!canWatchlist}
```

Remove flow with Undo (guard order + undo re-add):

```ts
const remove = () => {
  if (status === "loading") return
  if (status !== "authenticated" || !id || !userId) return
  if (!checkData?.isInWatchlist || removeMutation.isPending) return
  const undo = (
    <ToastAction altText={t("undo")} onClick={reAdd}>{t("undo")}</ToastAction>
  )
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (!enqueueOp(userId, "remove", id)) return toast({ variant: "destructive", description: t("error") })
    queryClient.setQueryData(watchlistKeys.check(id), { isInWatchlist: false })
    return toast({ description: t("removeSuccess"), action: undo })
  }
  queryClient.setQueryData(watchlistKeys.check(id), { isInWatchlist: false }) // optimistic outline
  removeMutation.mutate(id, {
    onSuccess: () => toast({ description: t("removeSuccess"), action: undo }),
    onError: () => { queryClient.setQueryData(watchlistKeys.check(id), { isInWatchlist: true }); toast({ variant: "destructive", description: t("error") }) },
  })
}
// reAdd(): online addMutation.mutate(id); offline enqueueOp(userId,"add",id) (replaces the pending remove); then setQueryData(check → true)
```

Last-write-wins reconciliation is the crux: `enqueueOp` removes any existing op for the id before appending, so an offline add-then-remove (or remove-then-add) never leaves two contradictory ops. Combined with the per-user key + auth-gated drain (inherited from 5.1), a queued op can only ever replay under the user who created it. Undo is just a re-add, so it reuses 5.1's exact add primitives — online `addMutation`, offline `enqueueOp("add")` (which cancels the pending remove). Keeping the 5.1 key literal + defaulting `kind:"add"` for legacy ops means any add queued by a 5.1 client still drains after this change.

Why FilmHero is untouched: its `onWatchlist` callback is state-agnostic and the fill↔outline is already bound to `isWatchlisted`; making the parent pass `remove` vs `add` is the entire toggle. The add-only pulse (no pulse on remove) is intentional and unchanged.

Watchlist-page scope: the 5.3 watchlist page already removes via query invalidation (the card disappears on refetch), so the "card disappears" behavior holds; the page-level exit **animation** and wiring the shared undo into `WatchlistPageClient` belong to Story 5.3 and are recorded as deferred — 5.2's surface is the detail-page heart, symmetric with 5.1.

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: the extended `watchlist.unit.test.ts` passes (remove cases green; unit tier is the CI gate).
- `cd apps/client && yarn test` -- expected: `useRemoveFromWatchlist.test.ts`, the extended `watchlistQueue.test.ts`, `useWatchlistSync.test.ts`, and `request-auth.test.ts` all pass; 5.1's `useAddToWatchlist.test.ts` still passes unchanged.
- `cd apps/client && yarn typecheck` -- expected: no NEW type errors attributable to changed/added files (repo baseline is pre-existing red).
- `cd apps/client && yarn lint` -- expected: clean on changed files.

**Manual checks (if no CLI):**

- Grep `request-auth.ts` shows `api/user-engagement/watchlist` under a new `DELETE` array; GET/POST unchanged.
- `watchlistQueue.ts` keeps the `pending-add:<userId>` key literal, its op carries `kind`, and `isValidOp` defaults a missing `kind` to `"add"`.
- `EventDetailPage.tsx` passes `onWatchlist={isWatchlisted ? remove : add}`; `FilmHero.tsx` is unchanged in the diff.

## Auto Run Result

Status: done

### Summary

Made the event-detail heart a **toggle**: tapping a filled heart removes the event's underlying **creative-work** (`getEventFilm(event)?.documentId`) from the watchlist via the already-shipped `removeMutation` (DELETE `api/user-engagement/watchlist/:creativeWorkId`), flips the heart to outline optimistically, and shows a "Retiré de la watchlist" toast with an **Undo** action that re-adds. The one true client blocker — the private-proxy allow-list had no DELETE array — was opened for the watchlist endpoint only (JWT-self-scoped). The 5.1 offline queue was generalized from add-only to carry both `add` and `remove` ops with **last-write-wins reconciliation** (any new op for an id replaces the pending one), keeping the 5.1 key literal and normalizing legacy no-`kind` ops to `add`; the reconnect drain now dispatches by op kind. The backend `remove`/`toggle` service (previously untested) got unit coverage. A rapid-double-tap add/remove race is prevented by an **in-flight guard** that disables the heart while either the remove OR the (Undo) re-add mutation is pending.

### Files changed

- `apps/client/src/lib/strapi-api/request-auth.ts` — add `DELETE: ["api/user-engagement/watchlist"]` (watchlist-only, self-scoped); GET/POST unchanged.
- `apps/client/src/features/events/utils/watchlistQueue.ts` — generalize ops to carry `kind` (5.1 key literal kept); `enqueueOp` last-write-wins reconciliation; `getPendingOps`/`removePendingOp`/`clearPendingOps`; legacy no-`kind`→`add`; `isValidOp` rejects an unknown `kind`; `enqueueAdd`/`getPendingAdds`/… compat wrappers.
- `apps/client/src/features/events/hooks/useRemoveFromWatchlist.tsx` (NEW) — remove-guard matrix (1–6), optimistic outline+rollback, offline no-silent-success, `removeSuccess`+Undo toast; `isPending = removeMutation.isPending || addMutation.isPending` (covers the re-add).
- `apps/client/src/features/events/hooks/useWatchlistSync.ts` — reconnect drain dispatches queued ops by `kind` (auth-gated, per-user, bounded).
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` — `onWatchlist={isWatchlisted ? remove : add}` + in-flight guard `watchlistDisabled={!canWatchlist || addIsPending || removeIsPending}`. FilmHero untouched.
- `apps/client/locales/{fr,ar,en}.json` — `watchlist.removeSuccess` + `watchlist.undo`.
- Tests (NEW/EDIT): `useRemoveFromWatchlist.test.ts` (NEW, full matrix + both Undo paths + isPending guard), `EventDetailPage.test.tsx` (NEW, toggle wiring + guard), `watchlistQueue.test.ts`, `useWatchlistSync.test.ts`, `request-auth.test.ts`, backend `watchlist.unit.test.ts` (remove/toggle); `vitest.config.ts` include glob.

### Review findings breakdown

- Pass 1 (bad_spec loopback): 3 bad_spec (medium 2 — toggle double-tap race with no in-flight guard, missing wiring/offline-undo tests; low 1 — unguarded Undo re-add). Spec amended (in-flight-guard invariant, required tests, expanded ACs), code re-derived. 8 rejected.
- Pass 2: 0 intent_gap / 0 bad_spec. 2 patches applied (medium — in-flight guard did not cover the Undo re-add's own `addMutation`; low — `normalizeOp` silently coerced unknown `kind` to add). 1 deferred (narrow mid-drain snapshot-vs-by-id race). 7 rejected. No loopback.

### Verification

- `cd apps/strapi && yarn test` — PASS (200 tests / 16 suites; new watchlist remove/toggle cases green).
- `cd apps/client && yarn test` — PASS (337 tests / 26 files).
- `cd apps/client && yarn typecheck` — no new errors from authored/edited files (repo baseline pre-existing red; off-route `EventDetailPageWithMap.tsx` and other pre-existing files untouched).
- `cd apps/client && yarn lint` — clean on changed files.

### Residual risks

Deferred (see `deferred-work.md`, 2026-07-10): the reconnect-drain mid-flap snapshot-vs-by-id race (very narrow). Accepted/bounded: repeated taps of the Undo toast button issue idempotent re-add POSTs (backend `add` is read-then-return, so harmless); the offline remove toast says "Retiré" (removed) rather than a queued message (the intent-contract's deliberate choice; optimistic state is correct); no `cancelQueries` before the optimistic write (mirrors the shipped 5.1 add hook; self-heals on invalidation); the watchlist-page (5.3) card-exit animation and shared-undo are out of scope (the card already disappears on refetch); the DELETE allow-list uses the pre-existing shared `startsWith` matcher (already tracked from 5.1); desktop/map detail variant still uses the old stub (off the live route).
