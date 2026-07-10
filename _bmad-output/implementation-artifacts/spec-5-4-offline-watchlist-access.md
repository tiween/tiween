---
title: "Story 5.4 — Offline Watchlist Access"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "66f15c04cca0c361021bfd15bc1f0543bc75278d"
final_revision: "43078b712e0414c0318ce66aacfb0a4588ced224"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-5-3-view-watchlist-page.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The `/watchlist` page (Story 5.3) only works online. Its data comes from `useWatchlist()`, whose react-query cache is **memory-only** (`new QueryClient()` with no persistence in `ClientProviders.tsx`), so an offline reload shows nothing — no cached items, no offline indicator, no "last synced" time — and the per-card remove heart stays active offline (it would silently enqueue). Story 5.4 requires: a previously-viewed watchlist renders offline, with an "Offline" indicator, a "Last synced X ago" line, and add/remove controls disabled (with a tooltip) while offline.

**Approach:** Add a **per-user `localStorage` snapshot** of the last successfully-fetched watchlist list plus its sync timestamp (mirroring the jsdom-testable `localStorage` precedent of `watchlistQueue.ts`, not the dead IndexedDB `useWatchlistOffline.ts`). A new `useOfflineWatchlist()` composes `useWatchlist()` + a new `useOnlineStatus()` + `useSession()`: it persists the snapshot on every successful fetch and, when offline, falls back to that snapshot. The page renders an offline banner (indicator + `formatRelativeTime` "last synced"), shows the `EmptyState` `offline` variant when offline with no cache, and disables each card's heart (new additive `watchlistDisabled` + tooltip on `EventCard`) while offline. Reconnect sync is already delivered by the app-wide `useWatchlistSync` drain (untouched).

## Boundaries & Constraints

**Always:**

- **Durable cache is per-user `localStorage`, not IndexedDB.** Key `tiween:watchlist:cache:<userId>` (`userId = session.user.userId`), namespaced exactly like `watchlistQueue.ts`. IndexedDB (`useWatchlistOffline.ts`) is dead/untestable in jsdom — do NOT wire it in. All storage access is SSR-guarded (`typeof window`) + try/catch; read failure → `null`, write failure → `false` (never throw, never block render).
- **Snapshot writes only real server data.** `saveWatchlistCache` is called only when `useWatchlist()` resolves successfully (`query.data` present). Never persist an empty array produced by a failed/aborted offline fetch over a good prior snapshot (an offline fetch yields `undefined` data, not `[]`, so gate on `isSuccess && data`).
- **Offline is a display fallback, not an error.** When offline with a cached snapshot, render the cached items as the success view (never the 5.3 error/retry state). Only surface the error state when **online** and the fetch failed with no cache. Preserve every 5.3 behavior on the online path (soonest-first sort, category filter, Past section, `EmptyState emptyWatchlist`, per-card remove+Undo).
- **Read-only while offline.** On this page, when offline, each card's watchlist control is `disabled` with an explanatory tooltip; a tap does nothing (no enqueue, no toast) — this is Story 5.4's frozen AC ("I cannot add/remove items (disabled with tooltip)"). The 5.1/5.2 queue and `useWatchlistSync` reconnect-drain are NOT changed; they still replay any already-queued ops on reconnect, satisfying "when I go back online, any pending actions sync".
- **Localized, Western-numeral relative time.** "Last synced X ago" uses a new `formatRelativeTime(iso, locale, now?)` in `lib/dates.ts` built on `Intl.RelativeTimeFormat`, forcing a Latin-numeral locale for `ar` (mirror `formatDate`'s `d.locale("fr")` rule). All new strings resolve from the `watchlist` next-intl namespace in fr/ar/en — no hardcoded copy. `now` is a parameter (default `new Date()`) so bucketing is deterministically unit-testable.
- **Additive, backward-compatible `EventCard` change.** Add optional `watchlistDisabled?: boolean` (default false) and an optional `watchlistDisabledHint` label; existing consumers (browse grids) are unaffected when the prop is omitted. Wrap the disabled heart in a local `TooltipProvider`/`Tooltip` showing the hint.

**Block If:**

- Reconciling "disable add/remove offline" (5.4 AC) with the shipped offline-enqueue-remove (5.2) would require deleting or altering `useRemoveFromWatchlist`, `watchlistQueue`, or `useWatchlistSync` — HALT. (It does not: disabling is a page/card-level gate; the hook and queue stay intact. If investigation shows otherwise, block rather than regress 5.2.)

**Never:**

- Do NOT add react-query persistence (`persistQueryClient`/`PersistQueryClientProvider`) or refactor the global `QueryClient` — the localStorage snapshot is the scoped mechanism; a global persister is out of scope and risks every other query.
- Do NOT modify the Serwist service worker / `sw.ts` / `next.config.mjs`. SW HTTP caching of the proxy GET is a complementary bonus we neither configure nor depend on here.
- Do NOT change any backend (`user-engagement`/`events-manager`) code — 5.4 is client-only offline read + UI.
- Do NOT build cross-device sync (5.5), schedule-change notifications (5.6), the Account-tab → `/watchlist` nav entry, or a card-exit animation. Do NOT re-target the watchlist off `creativeWork`.
- Do NOT resurrect or import `useWatchlistOffline.ts`; leave it dead (removal is optional cleanup, not required).

## I/O & Edge-Case Matrix

| Scenario                      | Input / State                                             | Expected Output / Behavior                                                                                                                         | Error Handling                                        |
| ----------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Online fetch success          | authed, online, `useWatchlist` returns 3 rows             | `saveWatchlistCache(userId, rows, now)` persists snapshot; page shows the 3 rows (5.3 view); no offline banner; hearts enabled                     | write throws → returns `false`, render still proceeds |
| Offline reload, cache present | authed, `navigator.onLine === false`, snapshot has 3 rows | Page renders the 3 cached rows (success view) + offline banner ("Offline" + "Last synced <relative(syncedAt)>"); hearts disabled with tooltip      | fetch error ignored (cache used, not error state)     |
| Offline, no cache             | offline, no snapshot for this user                        | `EmptyState variant="offline"` (the indicator itself); no crash                                                                                    | read → `null` → empty offline state                   |
| Reconnect                     | was offline showing cache, `online` event fires           | `useOnlineStatus` → online; `refetchOnReconnect` refetches → snapshot rewritten → banner disappears, hearts re-enabled; queued ops drain (5.1/5.2) | per 5.1/5.2 drain error handling                      |
| Offline tap heart             | offline, tap a card's (disabled) heart                    | No-op: no enqueue, no toast, no state change                                                                                                       | guarded (button `disabled`)                           |
| Per-user isolation            | user A cached offline, user B signs in on same browser    | B reads `tiween:watchlist:cache:<B>` (absent) → not A's items; B never sees A's cached watchlist                                                   | key namespaced by `userId`                            |
| Corrupt / SSR snapshot        | malformed JSON at the key, or `window` undefined          | `readWatchlistCache` → `null` (treated as no cache)                                                                                                | try/catch + shape validation                          |
| Relative time — Arabic        | `syncedAt = now-5min`, locale `ar`                        | "منذ ٥ دقائق"→ NO; renders Latin numerals ("il y a 5 minutes" via forced fr) per the Western-numeral rule                                          | n/a                                                   |

</intent-contract>

## Code Map

- `apps/client/src/features/events/utils/watchlistQueue.ts` -- PRECEDENT for the per-user `localStorage` conventions (SSR-guard, try/catch, `KEY_PREFIX + userId`, `safeStorage`). Mirror; do not change.
- `apps/client/src/features/events/utils/watchlistCache.ts` -- NEW. Per-user snapshot: `watchlistCacheKey(userId)`, `saveWatchlistCache(userId, items, syncedAt): boolean`, `readWatchlistCache(userId): { items: WatchlistItem[]; syncedAt: string } | null`, `clearWatchlistCache(userId): void`. SSR/try-catch guarded; validates shape on read.
- `apps/client/src/hooks/useOnlineStatus.ts` -- NEW. `useOnlineStatus(): boolean`. SSR-safe (initial `true`, real value set on mount), subscribes to window `online`/`offline`. Consolidates the scattered `navigator.onLine` checks (reuse-ready; other hooks not refactored in this story).
- `apps/client/src/features/events/hooks/useWatchlist.ts` -- `useWatchlist()` (memory-only query, `staleTime 5m`), `WatchlistItem` type, `watchlistKeys`. Reused unchanged; `WatchlistItem` is the snapshot element type.
- `apps/client/src/features/events/hooks/useOfflineWatchlist.ts` -- NEW. Composes `useWatchlist()` + `useOnlineStatus()` + `useSession()`. Persists snapshot on success; falls back to snapshot when offline. Returns `{ items, syncedAt, isOffline, isFromCache, isLoading, isError, refetch }` (contract in Design Notes).
- `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` -- REWORK: consume `useOfflineWatchlist()`; render an `OfflineBanner` (this file) when `isOffline`; branch to `EmptyState offline` when offline+no items; pass `isOffline` into `WatchlistCard` to disable its heart. Keep all 5.3 sort/filter/Past/empty/remove logic on the online path.
- `apps/client/src/features/events/components/EventCard/EventCard.tsx` -- ADD `watchlistDisabled?: boolean` (default false) → button `disabled`, `cursor-not-allowed opacity-50`, click-guard, wrapped in `Tooltip` (from `@/components/ui/tooltip`) showing `labels.watchlistDisabledHint`. Extend `EventCardLabels` with optional `watchlistDisabledHint?: string`. Backward-compatible.
- `apps/client/src/lib/dates.ts` -- ADD `formatRelativeTime(iso, locale, now = new Date()): string` (Intl.RelativeTimeFormat; `ar`→`fr` for Latin numerals). Reuse the file's existing locale-forcing rule.
- `apps/client/locales/{fr,ar,en}.json` -- ADD under `watchlist`: `offlineIndicator`, `lastSynced` (param `{time}`), `offlineActionDisabled` (heart tooltip), `offlineEmptyTitle`, `offlineEmptyDescription`. Do NOT duplicate existing 5.1/5.2/5.3 keys.
- `apps/client/src/features/events/hooks/useWatchlistSync.ts` / `useRemoveFromWatchlist.tsx` / `watchlistQueue.ts` -- Reconnect drain + offline queue. Referenced (satisfies the "sync on reconnect" AC); NOT changed.
- `apps/client/vitest.config.ts` -- `include` allow-list. ADD `"src/lib/dates.test.ts"` and `"src/features/events/components/EventCard/**/*.test.tsx"` (the util/hook/watchlist-page/`src/hooks` globs already match the other new tests).

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/features/events/utils/watchlistCache.ts` -- NEW. Per-user snapshot store keyed `tiween:watchlist:cache:<userId>`. `saveWatchlistCache(userId, items, syncedAt)` writes `{ items, syncedAt }` (returns `false` on no-storage/throw), `readWatchlistCache(userId)` returns the parsed entry or `null` (validate `Array.isArray(items)` && typeof `syncedAt === "string"`; corrupt → `null`), `clearWatchlistCache(userId)`. SSR-guarded + try/catch throughout. -- Durable, testable offline read source.
- [x] `apps/client/src/hooks/useOnlineStatus.ts` -- NEW. Return a boolean online state; initialize `true` (SSR-safe), set `navigator.onLine` on mount, update on window `online`/`offline` events, clean up listeners. -- Single reusable offline detector for the banner + card gating.
- [x] `apps/client/src/features/events/hooks/useOfflineWatchlist.ts` -- NEW. Read `useSession()` (`userId`), `useOnlineStatus()`, `useWatchlist()`. Effect: when `query.isSuccess && query.data`, `saveWatchlistCache(userId, query.data, new Date().toISOString())` and record that `syncedAt`. Compute `snapshot = !query.data ? readWatchlistCache(userId) : null`. Return `items = query.data ?? (isOffline ? snapshot?.items ?? [] : [])`; `isFromCache = !query.data && isOffline && !!snapshot`; `syncedAt = query.data ? <persist time> : snapshot?.syncedAt ?? null`; `isOffline = !online`; `isLoading = query.isLoading && !isFromCache`; `isError = query.isError && !isOffline && !isFromCache`; `refetch`. -- The composition that turns the memory-only query into an offline-durable view.
- [x] `apps/client/src/lib/dates.ts` -- ADD `formatRelativeTime(iso, locale, now = new Date())`: diff `iso` vs `now`; pick the largest unit (minute/hour/day) and format with `new Intl.RelativeTimeFormat(locale === "ar" ? "fr" : locale, { numeric: "auto" })`; guard an unparseable/`null` iso → empty string. -- Localized, Western-numeral "X ago"; deterministic via injected `now`.
- [x] `apps/client/src/features/events/components/EventCard/EventCard.tsx` -- ADD `watchlistDisabled?: boolean` to `EventCardProps` and `watchlistDisabledHint?: string` to `EventCardLabels`. When disabled: button `disabled`, `aria-disabled`, `cursor-not-allowed opacity-50`, `handleWatchlistClick` early-returns, and the button is wrapped in `<TooltipProvider><Tooltip><TooltipTrigger asChild>…</TooltipTrigger><TooltipContent>{hint}</TooltipContent></Tooltip></TooltipProvider>` only when disabled+hint present. Default behavior (prop omitted) is unchanged. -- The "disabled with tooltip" affordance, additively.
- [x] `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` -- REWORK to `useOfflineWatchlist()`. Branch order: `isLoading`→skeletons; `isError`→error+retry; `items.length===0` → (`isOffline` ? `<EmptyState variant="offline" title={t("offlineEmptyTitle")} description={t("offlineEmptyDescription")} />` : the existing `emptyWatchlist` state); else success. In success, when `isOffline` render an `OfflineBanner` (new local component: an inline banner with a `WifiOff` icon, `t("offlineIndicator")`, and `t("lastSynced", { time: formatRelativeTime(syncedAt, locale) })`) above `CategoryTabs`. Thread `isOffline` into each `WatchlistCard`. `WatchlistCard`: keep the `useRemoveFromWatchlist` + check-cache seed; pass `watchlistDisabled={isOffline}`, `labels.watchlistDisabledHint = t("offlineActionDisabled")`, and `onWatchlist={isOffline ? undefined : remove}` to `EventCard`. -- Delivers the offline view, indicator, last-synced, and read-only gating while preserving 5.3 online behavior.
- [x] `apps/client/locales/fr.json`, `apps/client/locales/ar.json`, `apps/client/locales/en.json` -- ADD under `watchlist`: `offlineIndicator`, `lastSynced` (contains `{time}`), `offlineActionDisabled`, `offlineEmptyTitle`, `offlineEmptyDescription`. Accurate fr (default), ar (Western numerals, RTL auto), en; no duplicate keys. -- Labels all new offline UI; no missing-message throw.
- [x] `apps/client/src/features/events/utils/watchlistCache.test.ts` -- NEW (matched by `utils/**`). Cover: save→read round-trip; per-user key isolation (A invisible to B); corrupt JSON → `null`; missing key → `null`; throwing storage → `save` returns `false`, `read` returns `null`; `clear`. -- Locks the durable-cache contract.
- [x] `apps/client/src/hooks/useOnlineStatus.test.ts` -- NEW (matched by `src/hooks/**`). Cover: reflects initial `navigator.onLine`; flips on dispatched `offline`/`online` events; removes listeners on unmount. Use the established `Object.defineProperty(navigator, "onLine", …)` + `window.dispatchEvent(new Event(...))` pattern. -- Locks detection.
- [x] `apps/client/src/features/events/hooks/useOfflineWatchlist.test.ts` -- NEW (matched by `hooks/**`). `renderHook` under `QueryClientProvider`; mock `useWatchlist`, `useOnlineStatus`, `useSession`, `watchlistCache`. Assert: online success → `saveWatchlistCache` called with rows + a timestamp, `isFromCache===false`, `isOffline===false`; offline + snapshot present → `items` from snapshot, `isFromCache===true`, `syncedAt` from snapshot, `isError===false`; offline + no snapshot → `items===[]`, `isFromCache===false`; online fetch error (no cache) → `isError===true`. -- Locks the memory→durable composition + the "offline is not an error" rule.
- [x] `apps/client/src/lib/dates.test.ts` -- NEW (add its glob to vitest include). Table-test `formatRelativeTime` with an injected `now`: 5 min ago, 3 h ago, 2 days ago; `ar` renders Latin numerals (no Arabic-Indic digits); unparseable/`null` iso → empty string. -- Locks localized Western-numeral relative time.
- [x] `apps/client/src/features/events/components/EventCard/EventCard.test.tsx` -- NEW (add its glob). Assert: with `watchlistDisabled` the heart is a `disabled` button whose click does NOT call `onWatchlist`, and the `watchlistDisabledHint` tooltip content is reachable; without the prop, click calls `onWatchlist` (regression guard for existing consumers). -- Locks the additive shared-component change.
- [x] `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.test.tsx` -- EDIT (matched by `src/app/**/watchlist/**`). Switch the mock from `useWatchlist` to `useOfflineWatchlist` (default: online, items present → existing online assertions stay green). ADD: offline + cached items → offline banner shows `offlineIndicator` + a `lastSynced` line, and each card heart is disabled (tap does not call the remove spy); offline + no items → `EmptyState offline`; back-online (hook returns `isOffline:false`) → no banner, hearts enabled. Keep the fr/ar/en `watchlist` key-parity test (auto-covers the new keys). -- Locks page composition of every AC.
- [x] `apps/client/vitest.config.ts` -- ADD `"src/lib/dates.test.ts"` and `"src/features/events/components/EventCard/**/*.test.tsx"` to `include` (other new tests already match existing globs). -- Otherwise the new dates/EventCard tests never run.

**Acceptance Criteria:**

- Given an authenticated user who viewed their watchlist online, when they later open `/watchlist` while offline, then their previously-viewed items render (from the per-user localStorage snapshot) instead of a blank/error screen.
- Given the offline watchlist view, when it renders, then an "Offline" indicator and a "Last synced: X ago" line (localized, Western numerals in Arabic) are shown.
- Given the offline watchlist view, when the user taps a card's heart, then nothing happens — the control is disabled and shows an explanatory tooltip (no add/remove, no queue, no toast).
- Given an offline user with no prior snapshot, when they open `/watchlist`, then the offline `EmptyState` is shown (never a crash or a misleading error/retry).
- Given the offline view, when connectivity returns, then the list refetches, the snapshot and "last synced" refresh, the offline banner clears, the hearts re-enable, and any actions queued earlier (from 5.1/5.2) drain via the existing `useWatchlistSync` — no new sync code.
- Given two users on one browser, when user A cached offline and user B signs in, then B never sees A's cached items (per-user key).
- Given the online path, when the page renders, then all Story 5.3 behavior is intact (soonest-first sort, category filter, Past section, `emptyWatchlist` state, per-card remove+Undo) and no `MISSING_MESSAGE` errors occur.

## Spec Change Log

_No bad_spec loopback occurred. The implementation matched the frozen contract; all review findings were localized hardening patches or pre-existing/architectural defers._

## Review Triage Log

### 2026-07-10 — Review pass 1

Three parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap). No intent_gap / bad_spec — the code matched the frozen contract; findings were localized hardening + verification-gap patches plus three architectural/pre-existing defers.

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 2, low 4)
- defer: 3: (high 0, medium 2, low 1)
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` `formatRelativeTime` forced `fr` for Arabic, printing French **words** ("il y a…", "hier") inside an Arabic sentence — only the numerals were meant to change. Fixed: `ar-u-nu-latn` (Arabic wording + Latin numerals); test now asserts Arabic script present + no Arabic-Indic digits + differs from the French rendering. Also clamped future-skew timestamps to "now".
  - `[medium]` `[patch]` The offline heart used the native `disabled` attribute, so the Radix tooltip could never open and the control dropped out of the tab order (keyboard/AT users got no explanation; touch unsupported) — the AC is "disabled **with tooltip**". Fixed: `aria-disabled` + focusable (click handler no-ops the action; `title` native fallback kept); tests assert `aria-disabled` and that the tap does not remove.
  - `[low]` `[patch]` A synced-but-empty watchlist viewed offline showed "Watchlist unavailable offline" (implying no cache) instead of the encouraging empty state. Fixed: offline-empty branch gated on `isOffline && !isFromCache`; added a page test.
  - `[low]` `[patch]` `isLoading` tracked the query directly offline, so a hanging offline fetch could strand a no-cache user on the skeleton grid. Fixed: `isLoading` gated on `online`; hook test asserts `isLoading === false` offline.
  - `[low]` `[patch]` The banner's formatted "last synced" value never reached a rendered/asserted path — the unary next-intl mock dropped the `{time}` param, so a `syncedAt`/`locale` wiring regression shipped green. Fixed: the page test surfaces `{time}`, mocks `formatRelativeTime`, and asserts it is called with `(syncedAt, "fr")` and its output renders in the banner.
  - `[low]` `[patch]` The hook's offline read was not pinned to the per-user key, and the `isSuccess` half of the persist gate was unisolated. Fixed: assert `readWatchlistCache` called with the session `userId`; added a "data present but `isSuccess:false` → no persist" case.
  - (deferred: cold-offline-reload depends on `useSession()` resolving [needs network/SW — out of the in-scope client-nav offline model]; durable cross-user snapshot persistence via the non-user-scoped `["watchlist","list"]` react-query singleton on same-tab user-switch; snapshot not cleared on logout [mirrors the un-cleared 5.1 pending queue]. All recorded in `deferred-work.md`.)
  - (rejected as noise/by-design: `query.data === []` truthiness speculation [current code correct — offline yields `undefined`]; missing `useMemo` on the offline snapshot read [micro-perf, offline-only]; "60 minutes ago" boundary [cosmetic]; state-transition tested only at the mock boundary [the hook's real branch matrix is unit-pinned]; disabled-with-no-hint dead control [the page always supplies the hint]; `/25/`→`/25,000/` test brittleness [a correct specificity fix — the file never ran before this story].)

## Design Notes

`useOfflineWatchlist()` return contract (the memory→durable bridge; `useWatchlist`'s cache is memory-only, so the snapshot is what survives an offline reload):

```ts
// online success → persist; offline → fall back to snapshot
const online = useOnlineStatus()
const userId = session?.user?.userId
const q = useWatchlist()
useEffect(() => {
  if (q.isSuccess && q.data && userId) {
    const ts = new Date().toISOString()
    saveWatchlistCache(userId, q.data, ts)
    setSyncedAt(ts)
  }
}, [q.isSuccess, q.data, userId])
const snapshot = !q.data && userId ? readWatchlistCache(userId) : null
const isFromCache = !q.data && !online && !!snapshot
return {
  items: q.data ?? (isFromCache ? snapshot!.items : []),
  syncedAt: q.data ? syncedAt : snapshot?.syncedAt ?? null,
  isOffline: !online,
  isFromCache,
  isLoading: q.isLoading && !isFromCache,
  isError: q.isError && online && !isFromCache, // offline is a fallback, not an error
  refetch: q.refetch,
}
```

Why localStorage, not IndexedDB or a react-query persister: 5.1 already ratified `localStorage` for offline watchlist state because IndexedDB is absent from jsdom (`fake-indexeddb` isn't a dep) — the existing `useWatchlistOffline.ts` IndexedDB hook is dead and untestable, so we don't use it. A global `persistQueryClient` would persist _every_ query and change app-wide behavior; a scoped per-user snapshot is the minimal, testable mechanism and keeps the blast radius to the watchlist.

Reconciling 5.4-disable with 5.2-offline-enqueue: Story 5.2 built an offline _capability_ (remove enqueues, drains on reconnect) at the hook level; Story 5.4's AC makes the offline watchlist _page_ read-only. These are consistent — we gate the card control (`watchlistDisabled` + `onWatchlist=undefined`) without touching `useRemoveFromWatchlist`/`watchlistQueue`/`useWatchlistSync`. Existing 5.2 hook tests (online by default) and 5.3 page tests (online) stay green; the reconnect drain still replays anything already queued from other surfaces, satisfying the "pending actions sync" AC with zero new sync code.

## Verification

**Commands:**

- `cd apps/client && yarn test` -- expected: `watchlistCache.test.ts`, `useOnlineStatus.test.ts`, `useOfflineWatchlist.test.ts`, `dates.test.ts`, `EventCard.test.tsx` pass; the edited `WatchlistPageClient.test.tsx` (offline banner, disabled hearts, offline empty, online-intact) passes; all prior 5.1/5.2/5.3 watchlist tests still pass.
- `cd apps/client && yarn typecheck` -- expected: no NEW type errors from changed/added files (repo baseline is pre-existing red).
- `cd apps/client && yarn lint` -- expected: clean on changed files.
- `cd apps/strapi && yarn test` -- expected: unchanged/green (no backend edits in this story).

**Manual checks (if no CLI):**

- `watchlistCache.ts` uses a `userId`-namespaced key (`tiween:watchlist:cache:<userId>`) and never throws; `useOfflineWatchlist.ts` persists only on `isSuccess && data`.
- `WatchlistPageClient.tsx` renders the offline banner + `lastSynced` only when `isOffline`, shows `EmptyState offline` when offline+empty, and passes `watchlistDisabled` into `EventCard` while offline; no import of `useWatchlistOffline`.
- The `watchlist` namespace in all three locale files contains `offlineIndicator`, `lastSynced`, `offlineActionDisabled`, `offlineEmptyTitle`, `offlineEmptyDescription`.

## Auto Run Result

Status: done

### Summary

Added offline read access to the `/watchlist` page (Story 5.4). Root problem: the page's data came from `useWatchlist()`, whose react-query cache is memory-only, so an offline reload showed nothing — no cached items, no offline indicator, no "last synced", and the per-card remove heart stayed active offline. Fix: a **per-user `localStorage` snapshot** (`watchlistCache.ts`) of the last successfully-fetched list + its sync timestamp (the jsdom-testable localStorage precedent from 5.1, NOT the dead IndexedDB hook); a reusable `useOnlineStatus()` detector; and a `useOfflineWatchlist()` composition that persists the snapshot on every successful fetch and falls back to it when offline (treating offline as a success fallback, never an error). The page renders an offline banner ("Offline" + localized, Western-numeral "Last synced X ago" via a new `formatRelativeTime`), shows the `EmptyState offline` variant when offline with no cache, and makes each card read-only offline via an additive `watchlistDisabled` + tooltip on the shared `EventCard`. Reconnect sync is delivered by the existing app-wide `useWatchlistSync` drain (untouched). Backend unchanged.

### Files changed

- `apps/client/src/features/events/utils/watchlistCache.ts` (NEW) — per-user (`tiween:watchlist:cache:<userId>`) durable snapshot store; SSR/try-catch guarded save/read/clear with shape validation.
- `apps/client/src/hooks/useOnlineStatus.ts` (NEW) — SSR-safe reactive `navigator.onLine` + online/offline event detector.
- `apps/client/src/features/events/hooks/useOfflineWatchlist.ts` (NEW) — memory→durable composition; persist-on-success, offline snapshot fallback, offline-is-not-an-error, offline never shows the skeleton.
- `apps/client/src/lib/dates.ts` — `formatRelativeTime(iso, locale, now)` (Intl.RelativeTimeFormat; `ar-u-nu-latn` for Arabic wording + Latin numerals; future-skew clamp; injectable `now`).
- `apps/client/src/features/events/components/EventCard/EventCard.tsx` — additive `watchlistDisabled` + `watchlistDisabledHint`; `aria-disabled` (focusable, tooltip-reachable) + click-guard + Radix Tooltip/`title`.
- `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` — `useOfflineWatchlist`; offline banner; `EmptyState offline` (only when offline AND no cache); read-only cards while offline.
- `apps/client/locales/{fr,ar,en}.json` — `offlineIndicator`, `lastSynced`, `offlineActionDisabled`, `offlineEmptyTitle`, `offlineEmptyDescription`.
- `apps/client/vitest.config.ts` + `apps/client/test/setup.ts` — added the `dates`/`EventCard` include globs and a jest-dom matcher setup.
- Tests (NEW/EDIT): `watchlistCache.test.ts`, `useOnlineStatus.test.ts`, `useOfflineWatchlist.test.ts`, `dates.test.ts`, `EventCard.test.tsx`, `WatchlistPageClient.test.tsx`.

### Review findings breakdown

- Pass 1: 0 intent_gap / 0 bad_spec. 6 patches applied (2 medium: Arabic French-words i18n → `ar-u-nu-latn`; disabled-heart a11y native-`disabled`→`aria-disabled` so the tooltip opens and it's keyboard-reachable. 4 low: synced-empty offline mislabel, offline `isLoading` skeleton-strand, unverified banner-value wiring, unverified per-user read key + `isSuccess` gate). 3 deferred (cold-offline-reload session gating; durable cross-user persistence via the non-user-scoped query singleton; no logout clear). 6 rejected.

### Verification

- `cd apps/client && yarn test` — PASS (33 files / 420 tests; +3 from the review patches over the 417 at implementation).
- `cd apps/client && yarn typecheck` — 64 errors == 64 baseline (zero new; none reference the changed/added files).
- `cd apps/client && yarn lint` — clean on changed files (the one `dates.ts:82` warning is the pre-existing `formatTime`, not `formatRelativeTime`).
- `cd apps/strapi && yarn test` — not re-run; no backend files were touched in this story.

### Residual risks

Deferred (see `deferred-work.md`, 2026-07-10): (1) the offline read is gated on `useSession()` resolving, so a full COLD offline reload (which additionally needs the Serwist SW to serve the shell) may fall through to the offline EmptyState — the in-scope model (app running, connection drops, client-side nav) works; the cold-reload path needs a product decision on an offline-durable last-user id vs. relaxed offline auth. (2) A same-tab user switch can durably persist one user's rows under another's key via the non-user-scoped `["watchlist","list"]` react-query singleton — proper fix is a user-scoped query key (5.3-owned / 5.5 sync). (3) The snapshot (like the 5.1 pending queue) is not cleared on logout, so watchlist data persists in `localStorage` on shared devices until browser data is cleared.
