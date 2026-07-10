---
title: "Story 5.5 — Watchlist Sync Across Devices"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "cc0110f39387550a55f231bfc16635a01f040abd"
final_revision: "a8fd02cd4813b847e606cf5723c0e56753d1a37a"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-5-4-offline-watchlist-access.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** A user logged in on two devices does not see the same watchlist. `useWatchlist()` is a memory-only react-query with `staleTime: 5m` and **no polling** (no `refetchInterval`, no realtime channel), so an add/remove on device A does not appear on device B for up to 5 minutes. There is also **no user-facing surface for sync state** — the story requires cross-device propagation "within 5 seconds while online", last-write-wins conflict resolution, offline changes syncing on reconnect, and sync status visible in settings.

**Approach:** Deliver sync at the level the existing architecture supports (no new backend infra): (1) add a **gated 5-second `refetchInterval`** to the single `useWatchlist` list query (poll only while online; react-query pauses it in a hidden tab and offline), complemented by react-query's default refetch-on-focus/reconnect, so another device viewing the list converges within ~5s; (2) treat **last-write-wins as the server's already-idempotent, arrival-order application of ops** (the last add/remove to reach Strapi determines set membership) and **lock that property with a backend unit test** — no backend production change; (3) reuse the **existing app-wide `useWatchlistSync` reconnect drain** (5.2/5.4) for offline→online replay, unchanged; (4) add a **"Watchlist sync" section to the profile page** (the de-facto settings screen) showing online/offline, "Last synced X ago", and a pending-changes count, sourced from a new read-only `useWatchlistSyncStatus()` hook over the existing localStorage cache + queue.

## Boundaries & Constraints

**Always:**

- **Polling is gated and scoped.** `useWatchlist`'s `refetchInterval` returns `5000` (ms) only when online and `false` when offline, via a pure exported helper `watchlistRefetchInterval(online): number | false` (unit-testable). Set `refetchIntervalInBackground: false` (explicit; hidden tabs do not poll) and `refetchOnReconnect: true` (explicit). Keep `staleTime`/`gcTime`/`enabled` as-is. Polling therefore runs only while a component subscribing to `watchlistKeys.list()` is mounted (the watchlist page), which is exactly when cross-device freshness is observable.
- **Last-write-wins is the server's arrival-order idempotent semantics.** Strapi's `add` (dedupe: re-add returns the existing row, never a duplicate) and `remove` (idempotent: remove-of-absent returns `false`) mean the final membership reflects whichever op reached the server last. The single new backend artifact is a **unit test** asserting this convergence (add-then-remove ⇒ removed; remove-then-add ⇒ present; duplicate add ⇒ one row). Do NOT change backend production code.
- **Sync status is read-only and does not fetch.** `useWatchlistSyncStatus()` composes `useOnlineStatus()`, the session `userId`, `readWatchlistCache(userId)?.syncedAt` (last-synced snapshot from 5.4), and `getPendingOps(userId).length` (pending queue from 5.1/5.2). It reads localStorage on mount and re-reads on `online`/`offline`/window `focus`/`storage` events. It NEVER mounts `useWatchlist` / issues a network request (the profile page must not trigger a watchlist fetch). SSR-safe: pre-mount it returns `{ isOnline: true, lastSyncedAt: null, pendingCount: 0 }`.
- **Settings surface = the profile page.** There is no `/settings` or `/account` route; `apps/client/src/app/[locale]/auth/profile/` is where 4.4/4.5 shipped preferences. Mount the new `WatchlistSyncStatus` section inside `ProfilePageClient.tsx` (a `Separator` + the section) after `ProfileForm`, following the existing section pattern.
- **Localized, Western-numeral, additive i18n.** All new copy resolves from the `watchlist` next-intl namespace in fr/ar/en; reuse the existing `lastSynced` (`"Dernière synchronisation {time}"`) and `offlineIndicator` keys. "Last synced X ago" uses the existing `formatRelativeTime(iso, locale)` from `lib/dates.ts` (already Latin-numeral for Arabic). Add only the genuinely new keys; do not duplicate any existing `watchlist` key.
- **Backward-compatible.** The `useWatchlist` polling change must not alter any existing consumer's contract (return shape unchanged); 5.4's `useOfflineWatchlist` (which composes `useWatchlist`) keeps working — when online it simply refetches more often (snapshot stays fresh); when offline the interval is `false` and react-query's offline pause applies.

**Block If:**

- Achieving "within 5 seconds" would require introducing a realtime transport (WebSocket/SSE/pusher) or a new backend endpoint/service — HALT. Polling on the existing proxy is the sanctioned mechanism for this story; a push channel is a separate infrastructure decision.
- Implementing full timestamp-based conflict reconciliation would require a Strapi schema change (soft-delete tombstones or surfacing/conditioning on `updatedAt`) or altering `add`/`remove`/`toggle` service logic — HALT rather than reshape the backend. (It does not: the online/converged LWW is already satisfied by arrival order; the offline-interim edge is an explicit deferral below.)

**Never:**

- Do NOT add a realtime channel, a `refetchInterval` anywhere except `useWatchlist`, or global `QueryClient` `defaultOptions`. Do NOT add react-query persistence.
- Do NOT change any backend production code (`user-engagement` schema/controller/service/routes). The only backend edit is the additive unit test.
- Do NOT modify `useWatchlistSync.ts`, `watchlistQueue.ts`, `watchlistCache.ts`, `useOfflineWatchlist.ts`, `useOnlineStatus.ts`, `EventCard.tsx`, or the `/watchlist` page — 5.5 reuses them as-is.
- Do NOT implement offline-interim timestamp reconciliation (a stale queued op replayed on reconnect winning over a newer edit made on another device meanwhile). Undetectable without tombstones/`updatedAt` conditioning; record as deferred, do not attempt.
- Do NOT build 5.6 schedule-change notifications, an Account-tab → `/watchlist` nav entry, or re-target the watchlist off `creativeWork`.

## I/O & Edge-Case Matrix

| Scenario                         | Input / State                                                 | Expected Output / Behavior                                                                                       | Error Handling                                         |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Poll interval — online           | `watchlistRefetchInterval(true)`                              | returns `5000`                                                                                                   | n/a                                                    |
| Poll interval — offline          | `watchlistRefetchInterval(false)`                             | returns `false` (no polling; react-query offline pause also applies)                                             | n/a                                                    |
| Cross-device propagation         | device B viewing `/watchlist`, online; device A adds an event | B's list query refetches on the next ≤5s poll (or immediately on window focus) → the new item renders within ~5s | failed poll → react-query ret/backoff; stale data kept |
| LWW converge (add then remove)   | server ops in order: add(X), remove(X)                        | membership = removed (last write wins)                                                                           | idempotent; no throw                                   |
| LWW converge (remove then add)   | server ops in order: remove(X), add(X)                        | membership = present (last write wins)                                                                           | idempotent; no throw                                   |
| Duplicate add                    | add(X), add(X) for same user                                  | exactly one row (dedupe), not two                                                                                | idempotent                                             |
| Reconnect drain                  | queued ops present, `online` event fires                      | existing `useWatchlistSync` replays them in order; `pendingCount` drops to 0; list invalidated                   | per existing 5.2 drain (bump/self-drop)                |
| Sync status — online, synced     | online, snapshot `syncedAt` present, 0 pending                | section shows online indicator + `lastSynced` relative time; no pending line                                     | read failure → `null` → "never synced"                 |
| Sync status — offline w/ pending | offline, snapshot present, 2 pending ops                      | section shows offline indicator + last-synced time + `pendingChanges {count: 2}`                                 | read failure → count 0                                 |
| Sync status — never synced       | authed, no snapshot for this user                             | section shows current online/offline + `neverSynced` (no relative-time crash)                                    | `readWatchlistCache` → `null`                          |
| Per-user isolation               | user A pending/snapshot cached, user B signs in same browser  | B's status reads B's keys only (never A's pending count / synced time)                                           | keys namespaced by `userId`                            |
| SSR / pre-mount                  | server render, `window` undefined                             | hook returns `{ isOnline: true, lastSyncedAt: null, pendingCount: 0 }`; no crash                                 | SSR-guarded reads                                      |

</intent-contract>

## Code Map

- `apps/client/src/features/events/hooks/useWatchlist.ts` -- EDIT. Add `export const WATCHLIST_POLL_MS = 5000` and `export function watchlistRefetchInterval(online: boolean): number | false` (`online ? WATCHLIST_POLL_MS : false`). In `useWatchlist()` add `refetchInterval: () => watchlistRefetchInterval(typeof navigator !== "undefined" ? navigator.onLine : true)`, `refetchIntervalInBackground: false`, `refetchOnReconnect: true`. Leave `staleTime`/`gcTime`/`enabled`/`WatchlistItem`/`watchlistKeys`/mutations untouched.
- `apps/client/src/features/events/hooks/useWatchlistSyncStatus.ts` -- NEW. `useWatchlistSyncStatus(): { isOnline: boolean; lastSyncedAt: string | null; pendingCount: number }`. Composes `useOnlineStatus()` + `useSession()` (`userId`) + a mounted-only re-read of `readWatchlistCache(userId)?.syncedAt` and `getPendingOps(userId).length`. Re-reads on mount and on window `online`/`offline`/`focus`/`storage`. SSR-safe defaults. No `useWatchlist` / no fetch.
- `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx` -- NEW. Presentational section: title (`t("syncStatusTitle")`), an online/offline indicator (`t("syncStatusOnline")` / `t("offlineIndicator")`), a last-synced line (`t("lastSynced", { time: formatRelativeTime(lastSyncedAt, locale) })` or `t("neverSynced")`), and a `pendingCount > 0` line (`t("pendingChanges", { count })`). Uses `useTranslations("watchlist")`, `useLocale()`, `useWatchlistSyncStatus()`, `formatRelativeTime`. RTL-safe. Colocated in `_components/` so the existing vitest glob covers its test.
- `apps/client/src/app/[locale]/auth/profile/ProfilePageClient.tsx` -- EDIT. After `<ProfileForm .../>` add `<Separator className="my-6" />` + `<WatchlistSyncStatus />` (before the existing actions block). Minimal, additive; existing profile behavior unchanged.
- `apps/client/src/lib/dates.ts` -- REUSE `formatRelativeTime` (5.4). No change.
- `apps/client/src/hooks/useOnlineStatus.ts` / `features/events/utils/watchlistCache.ts` (`readWatchlistCache`) / `features/events/utils/watchlistQueue.ts` (`getPendingOps`) -- REUSE unchanged; the sync-status data sources.
- `apps/client/src/features/events/hooks/useWatchlistSync.ts` -- REFERENCED (delivers AC "offline changes sync on reconnect"). NOT changed.
- `apps/client/locales/{fr,ar,en}.json` -- ADD under `watchlist`: `syncStatusTitle`, `syncStatusOnline`, `neverSynced`, `pendingChanges` (param `{count}`). Reuse existing `lastSynced`, `offlineIndicator`. No duplicates.
- `apps/client/vitest.config.ts` -- ADD glob `"src/app/**/profile/**/*.test.tsx"` so `ProfilePageClient.test.tsx` (at the `profile/` root, not `_components/`) runs. Hooks/util tests already match existing globs.
- `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- EDIT (additive). Add LWW-convergence cases over the existing mocked-`documents()` harness.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/features/events/hooks/useWatchlist.ts` -- ADD `WATCHLIST_POLL_MS`, `watchlistRefetchInterval(online)`; wire `refetchInterval` (gated on `navigator.onLine`), `refetchIntervalInBackground: false`, `refetchOnReconnect: true` into `useWatchlist()`. -- 5s cross-device propagation while online; no polling offline/hidden.
- [x] `apps/client/src/features/events/hooks/useWatchlistSyncStatus.ts` -- NEW read-only hook per Code Map. SSR-safe; per-user; re-reads localStorage cache + queue on mount and on `online`/`offline`/`focus`/`storage`; returns `{ isOnline, lastSyncedAt, pendingCount }`; no fetch. -- Single source for the settings sync surface.
- [x] `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx` -- NEW presentational section (online/offline indicator, last-synced relative time or `neverSynced`, pending-count line when >0), fully localized via the `watchlist` namespace, RTL-safe. -- Makes sync status visible in settings.
- [x] `apps/client/src/app/[locale]/auth/profile/ProfilePageClient.tsx` -- EDIT: render `<Separator/>` + `<WatchlistSyncStatus/>` after `<ProfileForm/>`. -- Mounts the sync section on the de-facto settings screen.
- [x] `apps/client/locales/fr.json`, `apps/client/locales/ar.json`, `apps/client/locales/en.json` -- ADD under `watchlist`: `syncStatusTitle`, `syncStatusOnline`, `neverSynced`, `pendingChanges` (`{count}`). Accurate fr (default), ar (Western numerals, RTL auto), en. No duplicate keys. -- Labels the new UI; no `MISSING_MESSAGE`.
- [x] `apps/client/src/features/events/hooks/useWatchlist.test.ts` -- NEW (matched by `hooks/**`). Table-test `watchlistRefetchInterval(true) === 5000` and `watchlistRefetchInterval(false) === false`; assert `WATCHLIST_POLL_MS === 5000`. -- Locks the poll-gating logic (the timing-based AC's testable core).
- [x] `apps/client/src/features/events/hooks/useWatchlistSyncStatus.test.ts` -- NEW (matched by `hooks/**`). `renderHook`; mock `useOnlineStatus`, `useSession`, `watchlistCache.readWatchlistCache`, `watchlistQueue.getPendingOps`. Assert: online + snapshot + 2 pending → `{ isOnline: true, lastSyncedAt: <snapshot>, pendingCount: 2 }`; offline → `isOnline: false`; no snapshot → `lastSyncedAt: null`; reads the session `userId` key (per-user); re-reads after a dispatched `online` event. -- Locks the status composition.
- [x] `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.test.tsx` -- NEW (matched by `profile/_components/**`). Mock `useWatchlistSyncStatus` + `formatRelativeTime`; assert: online → `syncStatusOnline` shown; offline → `offlineIndicator` shown; `lastSyncedAt` present → `lastSynced` line with `formatRelativeTime` output; `lastSyncedAt` null → `neverSynced`; `pendingCount 2` → `pendingChanges` line; `pendingCount 0` → no pending line. -- Locks the presentational contract + i18n wiring.
- [x] `apps/client/src/app/[locale]/auth/profile/ProfilePageClient.test.tsx` -- NEW (needs the new glob). Mock `./_components/ProfileForm` and `./_components/WatchlistSyncStatus` to sentinels, `useCurrentUser` → `{ isLoading: false }`, `next-intl`, `next/navigation`, `next-auth/react`. Assert the `WatchlistSyncStatus` sentinel renders on the profile page (proves "visible in settings"). -- Locks the mount.
- [x] `apps/client/vitest.config.ts` -- ADD `"src/app/**/profile/**/*.test.tsx"` to `include`. -- Otherwise `ProfilePageClient.test.tsx` never runs.
- [x] `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- ADD LWW-convergence cases (add→remove ⇒ final absent; remove→add ⇒ final present; duplicate add ⇒ single row via existing dedupe) over the mocked `documents()` harness. No production change. -- Locks "conflict resolution uses last-write-wins" as the server's arrival-order guarantee.

**Acceptance Criteria:**

- Given an authenticated user viewing `/watchlist` on device B while online, when they add an event on device A, then device B's list reflects it within ~5 seconds (the list query polls at a 5s cadence while online and also refetches on window focus/reconnect) — with no polling while offline or in a hidden tab.
- Given concurrent add/remove of the same event across devices, when the operations reach Strapi, then the final membership is the last operation applied (last-write-wins), and a duplicate add never creates two rows — asserted by the backend unit test.
- Given a user with queued offline changes, when connectivity is restored, then the existing app-wide reconnect drain replays them (unchanged) and the settings sync section's pending count returns to zero.
- Given the profile (settings) page, when it renders, then a "Watchlist sync" section shows the online/offline state, a localized Western-numeral "Last synced X ago" (or "never synced"), and a pending-changes count when > 0 — reading only the per-user localStorage snapshot/queue, issuing no network request, and never showing another user's data.
- Given the whole change, when the client test suite runs, then all prior 5.1–5.4 watchlist tests still pass, no `MISSING_MESSAGE` errors occur, and the fr/ar/en `watchlist` namespaces stay key-consistent.

## Spec Change Log

_No bad_spec loopback occurred. The implementation matched the frozen contract; all review findings were localized hardening patches or rejected noise/by-design items._

## Review Triage Log

### 2026-07-10 — Review pass 1

Three parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap). No intent_gap / bad_spec — the code matched the frozen contract; findings were localized hardening + verification-gap patches plus rejected noise/by-design/cosmetic items.

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 3, low 3)
- defer: 0
- reject: 8
- addressed_findings:
  - `[medium]` `[patch]` Arabic pending-count rendered Arabic-Indic numerals (ICU `#` under `ar` → `٢`), violating the frozen Western-numeral rule / AC4. Fixed: added `formatCount(count, locale)` forcing `ar-u-nu-latn` and switched the `pendingChanges` message from `#` to a `{display}` param (Latin-formatted) while keeping `{count}` for plural selection; added a `formatCount` unit test asserting no Arabic-Indic digits.
  - `[medium]` `[patch]` The settings pending count stayed stale after a same-tab reconnect drain (drain empties the queue async and fires no in-tab `storage` event) — AC3's "pending count returns to zero" failed on the active screen. Proper fix (queue emits a change event) is contract-forbidden (`watchlistQueue`/`useWatchlistSync` are frozen `Never`), so fixed self-contained in the status hook: a slow (`WATCHLIST_STATUS_REFRESH_MS = 3000`) localStorage re-read interval (not a network/react-query poll) + a shallow-equal `setState` guard so it doesn't churn re-renders; hook test asserts the interval re-read via fake timers.
  - `[low]` `[patch]` The status hook re-read only on `online`; also added a `document` `visibilitychange` listener (react-query itself refreshes on visibility) so returning to a background tab refreshes the section. Parameterized the hook test over `online`/`offline`/`focus`/`storage`/`visibilitychange`.
  - `[low]` `[patch]` The status live region was not announced to assistive tech; added `role="status"` + `aria-live="polite"` so online/offline flips and pending-count changes are surfaced.
  - `[medium]` `[patch]` The poll options (`refetchInterval`/`refetchIntervalInBackground`/`refetchOnReconnect`) wired into `useWatchlist`'s `useQuery` were never asserted — only the detached pure helper was tested, so dropping the wiring shipped green. Added a `useWatchlist` test that spies on `useQuery` and asserts the options object (`refetchIntervalInBackground === false`, `refetchOnReconnect === true`, `refetchInterval()` returns 5000 online / false offline).
  - `[low]` `[patch]` The backend LWW stateful mock keyed membership on `creativeWork` only (a per-user-scope regression would not surface) and overclaimed "interleaved" writes. Fixed: keyed the mock on `(user, creativeWork)`, softened the comment, and added a per-user isolation case (A's add invisible to B).
  - (rejected as noise/by-design/cosmetic: the `navigator.onLine` poll gate is redundant with react-query's offline pause [behavior correct]; hardcoded `bg-green-500` dot [cosmetic, visible in both themes]; the new broad profile vitest glob subsumes the narrow `_components` one [harmless redundancy]; unbounded 5s polling without jitter [spec-sanctioned]; one-frame "Online" flash on first paint [inherent to the reused `useOnlineStatus`, cosmetic]; `read()` resets to defaults during a transient unauth flap [the profile page is auth-gated]; the `typeof window` SSR-guard disjunct is unexercised [not observable in jsdom, low-risk for a `"use client"` file]; finer Arabic CLDR plural arms (two/few/many) [low value, risks subtly-wrong un-reviewed Arabic — one/other fallback retained]).

### 2026-07-10 — Review pass 2

Independent follow-up review (fresh Blind Hunter, Edge Case Hunter, Verification Gap reviewers on the full since-baseline diff). No intent_gap / bad_spec — the implementation still matches the frozen contract. Two low-severity localized patches applied; one pre-existing backend concurrency limitation deferred; the rest rejected as cosmetic / spec-sanctioned / already-decided-in-pass-1 / inherent.

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 1
- reject: 5
- addressed_findings:
  - `[low]` `[patch]` An unparseable-but-non-empty `syncedAt` (a corrupt/tampered cache passes `readWatchlistCache`'s string-only `isValidEntry`, and `formatRelativeTime` returns `""` for it) rendered a blank "Last synced " line instead of "never synced". Fixed in `WatchlistSyncStatus.tsx`: compute `relativeSynced` once and fall back to `neverSynced` on an empty relative-time string; added a component test case (`formatRelativeTime → "" ⇒ neverSynced`, no `lastSynced` line).
  - `[low]` `[patch]` Verification gap: the new `watchlist` sync keys — especially the `pendingChanges` ICU plural + `{display}` substitution — were never run through a real formatter (the component tests echo keys via a next-intl mock; the parity guard only compares key _sets_), so a future malformed plural/placeholder/brace in any locale would keep all three keys present and the suite green yet throw/garble at runtime. Added `_components/watchlistSyncI18n.test.tsx`: formats the new + reused keys with the real `createTranslator` across fr/ar/en, asserting `{display}` substitution and no Arabic-Indic digits.
  - (deferred — 1, appended to `deferred-work.md`: the backend `add` dedupe is non-atomic [read-before-write, no unique `(user, creativeWork)` constraint], so concurrent cross-device double-adds can create duplicate rows; pre-existing since 5.1, and the new LWW tests only cover serial order over an in-memory mock. Needs a schema/integration change the intent-contract forbids in-story.)
  - (rejected as noise/by-design/inherent: the "Last synced X ago" label does not tick with the wall clock while the page sits open [cosmetic, coarse-grained, self-heals on any state change/navigation; a re-render tick would fight the deliberate anti-churn `setState` guard]; the 3s status interval JSON-parses the whole cache to read one timestamp [spec-sanctioned same-tab-drain safety net, negligible cost]; Arabic `pendingChanges` defines only `one`/`other` plural arms [explicitly decided in pass 1 — finer CLDR arms risk subtly-wrong un-reviewed Arabic]; no true end-to-end "converge within ~5s" round-trip test [inherent to polling; the `useQuery`-option wiring test is adequate to catch a dropped/flipped option]; the `read()` no-op-on-unchanged path is unobserved by tests [benign, by design].)

## Design Notes

Why polling (not realtime) for the 5s AC: there is no WebSocket/SSE/pusher anywhere in the client and no realtime backend; the `QueryClient` has no `defaultOptions`. A gated `refetchInterval` on the one list query is the minimal, dependency-free mechanism that satisfies "within ~5 seconds while online", and react-query already pauses it in hidden tabs (`refetchIntervalInBackground: false`) and offline. A push channel is explicitly a separate infrastructure decision (Block-If).

```ts
// useWatchlist.ts — pure, testable gate
export const WATCHLIST_POLL_MS = 5000
export function watchlistRefetchInterval(online: boolean): number | false {
  return online ? WATCHLIST_POLL_MS : false
}
// in useQuery({...}):
refetchInterval: () =>
  watchlistRefetchInterval(typeof navigator !== "undefined" ? navigator.onLine : true),
refetchIntervalInBackground: false,
refetchOnReconnect: true,
```

Why LWW = server arrival order (no backend change): Strapi's `add` is dedupe-idempotent (re-add returns the existing row) and `remove` is idempotent (remove-of-absent returns `false`). The watchlist is a set-membership model, so the final state is fully determined by the last add/remove the server processes — that _is_ last-write-wins for the online/converged case that AC1 describes, and cross-device polling makes both devices reflect it within ~5s. The one case this does NOT cover is a _stale offline op_ replayed on reconnect that predates a newer edit made on another device meanwhile; detecting that needs server tombstones or `updatedAt` conditioning (a schema/logic change) and is explicitly deferred (see `deferred-work.md`). We lock the in-scope guarantee with a unit test rather than new code.

```ts
// useWatchlistSyncStatus.ts — read-only, no fetch
const online = useOnlineStatus()
const userId = session?.user?.userId
const [state, setState] = React.useState({
  lastSyncedAt: null,
  pendingCount: 0,
})
const read = React.useCallback(() => {
  if (!userId || typeof window === "undefined") return
  setState({
    lastSyncedAt: readWatchlistCache(userId)?.syncedAt ?? null,
    pendingCount: getPendingOps(userId).length,
  })
}, [userId])
// read on mount + on online/offline/focus/storage; return { isOnline: online, ...state }
```

Sync status lives on the profile page because there is no `/settings` route — 4.4/4.5 shipped all preferences there. The section is read-only and deliberately does not mount `useWatchlist` (so opening settings never triggers a watchlist fetch); it reads the durable snapshot's `syncedAt` (5.4) and the pending queue length (5.1/5.2) directly.

## Verification

**Commands:**

- `cd apps/client && yarn test` -- expected: new `useWatchlist.test.ts`, `useWatchlistSyncStatus.test.ts`, `WatchlistSyncStatus.test.tsx`, `ProfilePageClient.test.tsx` pass; all prior 5.1–5.4 watchlist tests still pass; fr/ar/en `watchlist` key-parity test green.
- `cd apps/client && yarn typecheck` -- expected: no NEW type errors from changed/added files (repo baseline is pre-existing red — compare count).
- `cd apps/client && yarn lint` -- expected: clean on changed files.
- `cd apps/strapi && yarn test` -- expected: `watchlist.unit.test.ts` passes including the new LWW-convergence cases; rest unchanged/green.

**Manual checks (if no CLI):**

- `useWatchlist.ts` sets `refetchInterval` gated on `navigator.onLine` (5000 online, false offline), `refetchIntervalInBackground: false`, `refetchOnReconnect: true`; the return shape/type is unchanged.
- Opening `/[locale]/auth/profile` shows a "Watchlist sync" section with an online/offline indicator, a last-synced line (or "never synced"), and a pending-count line only when pending > 0; no network request to `/user-engagement/watchlist` is issued by that page.
- The `watchlist` namespace in fr/ar/en contains the four new keys and reuses `lastSynced`/`offlineIndicator`.

## Auto Run Result

Status: done

### Summary

Delivered Story 5.5 "Watchlist Sync Across Devices" as a client-focused change over the existing (untouched) backend. Cross-device propagation (AC1) is a **gated 5-second `refetchInterval`** on the single `useWatchlist` list query (polls only while online, paused in hidden tabs and offline), complemented by react-query's refetch-on-focus/reconnect — so another device viewing `/watchlist` converges within ~5s with no realtime infra. **Last-write-wins (AC2)** is the server's already-idempotent, arrival-order set-membership semantics (the last add/remove the server processes determines membership); locked with additive backend unit tests, no backend production change. **Offline→reconnect sync (AC3)** reuses the existing app-wide `useWatchlistSync` drain unchanged, surfaced via a pending-changes count. **Sync status in settings (AC4)** is a new "Watchlist sync" section on the profile page (the de-facto settings screen — there is no `/settings` route) showing online/offline, a localized Western-numeral "Last synced X ago", and a pending-count, sourced from a new read-only `useWatchlistSyncStatus()` hook over the existing localStorage snapshot + queue (no network fetch).

### Files changed

- `apps/client/src/features/events/hooks/useWatchlist.ts` — added `WATCHLIST_POLL_MS` + pure `watchlistRefetchInterval(online)`; wired gated `refetchInterval`, `refetchIntervalInBackground: false`, `refetchOnReconnect: true` into `useWatchlist()`. Types/mutations/staleTime untouched.
- `apps/client/src/features/events/hooks/useWatchlistSyncStatus.ts` (NEW) — read-only `{ isOnline, lastSyncedAt, pendingCount }` over `useOnlineStatus` + session `userId` + `readWatchlistCache`/`getPendingOps`; re-reads on `online`/`offline`/`focus`/`storage`/`visibilitychange` + a slow (`3000ms`) localStorage-only interval with a shallow-equal guard; SSR-safe; no fetch.
- `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx` (NEW) — profile "Watchlist sync" section; online/offline indicator, `formatRelativeTime` "last synced" (or `neverSynced`), pending line via a Western-numeral `formatCount` + `{display}` param; `role="status"`/`aria-live="polite"`.
- `apps/client/src/app/[locale]/auth/profile/ProfilePageClient.tsx` — mounts the section (additive) after `ProfileForm`.
- `apps/client/locales/{fr,ar,en}.json` — added `syncStatusTitle`, `syncStatusOnline`, `neverSynced`, `pendingChanges` (ICU plural, `{display}` Western-numeral count); reused `lastSynced`/`offlineIndicator`.
- `apps/client/vitest.config.ts` — added `src/app/**/profile/**/*.test.tsx` glob.
- `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` — additive LWW-convergence + per-user-isolation cases over a stateful `(user, creativeWork)`-keyed `documents()` harness (no production change).
- Tests (NEW): `useWatchlist.test.ts`, `useWatchlistSyncStatus.test.ts`, `_components/WatchlistSyncStatus.test.tsx`, `ProfilePageClient.test.tsx`.

### Review findings breakdown

- Pass 1: 0 intent_gap / 0 bad_spec. **6 patches** (3 medium: Arabic pending-count numerals → `ar-u-nu-latn` + `{display}`; same-tab reconnect pending-count staleness → self-contained localStorage re-read interval; unasserted poll-option wiring → `useQuery`-spy test. 3 low: `visibilitychange` re-read + listener test coverage; status `aria-live`; backend LWW mock user-scoping + isolation case). **8 rejected** (noise/by-design/cosmetic/spec-sanctioned). **0 deferred.**

### Verification

- `cd apps/client && yarn test` — PASS (37 files / 447 tests; +9 from the review-patch tests over the 438 at implementation).
- `cd apps/client && yarn typecheck` — 64 errors == 64 baseline (zero new; none reference the changed/added files).
- `cd apps/client && yarn lint` — clean on changed files.
- `cd apps/strapi && yarn test` — PASS (16 suites / 213 tests; the 4 new watchlist unit cases — 3 LWW-convergence + 1 per-user isolation — confirmed running).

### Residual risks

- **Cross-device "within 5s" is polling-based:** an add/remove appears on another device only while it is viewing a surface subscribed to the watchlist list, on the next ≤5s poll (or focus/reconnect). A true push channel (SSE/WebSocket) is a deliberate out-of-scope infrastructure decision.
- **Offline-interim LWW reconciliation is out of scope (deferred):** a stale offline op replayed on reconnect can win over a newer edit made on another device meanwhile — undetectable without server tombstones/`updatedAt` conditioning. The in-scope LWW (online/converged, arrival-order) holds.
- **Same-tab pending-count freshness is interval-bounded (~3s):** the proper event-driven fix (queue emitting a change signal) is blocked by the frozen `Never` list; the 3s localStorage re-read is the contract-respecting workaround.

### Follow-up review pass (2026-07-10)

An independent second review pass (fresh Blind/Edge/Verification reviewers on the full since-baseline diff) confirmed the implementation still matches the frozen contract (0 intent_gap / 0 bad_spec). Two low-severity patches were applied and one pre-existing limitation deferred:

- `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.tsx` — an unparseable non-empty `syncedAt` (corrupt/tampered cache; `formatRelativeTime` → `""`) now falls back to `neverSynced` instead of a blank "Last synced " line (compute `relativeSynced` once, branch on it).
- `apps/client/src/app/[locale]/auth/profile/_components/WatchlistSyncStatus.test.tsx` — added the invalid-timestamp → `neverSynced` case.
- `apps/client/src/app/[locale]/auth/profile/_components/watchlistSyncI18n.test.tsx` (NEW) — closes a verification gap: formats the new + reused `watchlist` keys (incl. the `pendingChanges` ICU plural + `{display}`) through the real `createTranslator` across fr/ar/en, so a future malformed ICU/placeholder fails the suite instead of shipping green (previously only echoed by the component mock / compared as key-sets by the parity guard).
- Deferred (see `deferred-work.md`): non-atomic backend `add` dedupe (no unique `(user, creativeWork)` constraint) allows duplicate rows under concurrent cross-device double-adds; pre-existing since 5.1, only serial-order-tested here.

**Verification (follow-up pass):** `apps/client` — `yarn test` PASS (38 files / 454 tests, +1 file / +7 cases over the prior 37/447); `yarn typecheck` — 64 errors == 64 baseline (zero new; none reference changed files); `yarn eslint` clean on the three changed files. No backend files changed this pass (the strapi suite is unchanged from the prior green `done` state).
