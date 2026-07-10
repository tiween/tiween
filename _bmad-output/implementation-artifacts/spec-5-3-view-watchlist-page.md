---
title: "Story 5.3 — View Watchlist Page"
type: "feature"
created: "2026-07-10"
status: "done"
baseline_revision: "8f39f665e52f19097154a9fae0b309dd0292dcb6"
final_revision: "2e3530847132c45bacbb336b2b6cc6fdb1146fe1"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-5-2-remove-event-from-watchlist.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The `/watchlist` page exists but is broken and incomplete: `page.tsx` reads `watchlist.*` i18n keys (`pageTitle`, `title`, `subtitle`, `empty.title`, `loading`, `retry`, …) that exist in **no** locale, and `WatchlistPageClient` renders each saved item with a **fake** `date: item.addedAt` and `venueName: ""`. None of Story 5.3's acceptance behaviors exist: no event-date sort, no category filter, no separate "Past" section, and the encouraging empty-state CTA is hand-rolled. The root cause is a data gap — the watchlist stores **creative-works** (`{title, type, poster, addedAt}` only; decided by shipped 5.1/5.2), while "event date", "venue", and expired-status live on the `event` entity, which the watchlist API does not return.

**Approach:** Enrich the watchlist list server-side: add a **new `events-manager` `public-api` facade method** that, for a set of saved creative-work documentIds, returns each one's **soonest upcoming** and **most-recent past** screening date (+ venue) by querying from the event side (`screenings.movie.documentId $in [...]`); `getUserWatchlist` calls it (the first sanctioned `user-engagement → events-manager` edge) and merges the result onto each row. Then rework `WatchlistPageClient` to sort upcoming items soonest-first, filter by category (from `creativeWork.type`), split expired items into a "Past" section, use the shared `EmptyState`, and remove via the shipped `useRemoveFromWatchlist` (toast + Undo). Add the missing `watchlist` i18n keys in fr/ar/en.

## Boundaries & Constraints

**Always:**

- **Watchlist target stays `creative-work`.** Do NOT re-target the schema to events. Enrichment is read-only join data, never a stored field. The saved id is `creativeWork.documentId`; event detail nav uses it (`/events/:creativeWorkId`, unchanged).
- **Cross-plugin only via the facade.** `getUserWatchlist` reaches events-manager ONLY through `strapi.plugin("events-manager").service("public-api").<method>(...)` — never a foreign-UID `strapi.documents("plugin::events-manager...")` call from user-engagement. The event-side query lives inside events-manager (where the UID is owned), mirroring `events.ts` `screenings.movie` filtering and the `ticketing → public-api` precedent (`order.ts:59`).
- **Date rule (soonest-first + Past).** For each saved creative-work: `nextScreeningDate` = the earliest **published** event `startDateTime >= now` whose screenings reference it; `lastScreeningDate` = the latest such event with `startDateTime < now`; `venueName` = the venue of the chosen (next, else last) event. An item is **Upcoming** when `nextScreeningDate != null` (sorted ascending by it, soonest first); **Past** only when `nextScreeningDate == null && lastScreeningDate != null` (sorted descending); an item with **both null** (a saved work with no scheduled events yet) is NOT "Past" — it stays in the main list after the dated items (secondary sort `addedAt` desc). This is the epic's "expired events in a separate Past section" without misfiling never-scheduled works.
- **Category filter is client-side, from `creativeWork.type`.** Reuse `CategoryTabs` (`CategoryType`) and `mapCategoryToType`: `activeCategory === "all"` shows all, else keep items whose `creativeWork.type === mapCategoryToType(activeCategory)`. The filter applies to BOTH the Upcoming and Past sections. No backend category param.
- **Reuse shipped surfaces, do not fork them:** `useWatchlist()` (list query + `watchlistKeys`), `EventCard`/`EventCardSkeleton`, `CategoryTabs`, `EmptyState` (`variant="emptyWatchlist"`), `useRemoveFromWatchlist` (5.2 toast+Undo). All user-facing copy resolves from next-intl (`watchlist` namespace for page copy; existing `events` keys for the card's add/remove/priceFrom) in fr/ar/en — no hardcoded strings.
- **Remove uses the shared hook.** Each rendered card removes via `useRemoveFromWatchlist(creativeWork.documentId)` so the "Retiré … + Undo" toast (Story 5.2) is consistent. Because that hook no-ops when its `watchlistKeys.check(id)` cache is not yet `{isInWatchlist:true}`, each card MUST seed that cache on mount (every listed item is, by definition, watchlisted) so the first tap removes rather than silently no-opping.
- **Auth-gated.** The page stays server-side auth-guarded (redirect to signin with `callbackUrl`). The list query is `enabled` only when authenticated (unchanged).
- **All four async states.** loading (skeleton grid), error (retry), empty (encouraging `EmptyState` + discovery CTA), success — never a blank screen.

**Block If:**

- The events-manager `public-api` facade cannot be extended to run an event-side `screenings.movie.documentId $in [...]` query (e.g. the relation/filter proven at `events.ts:187` no longer holds) — HALT rather than adding a foreign-UID query inside user-engagement or a raw SQL join.
- Reworking the page to real event dates would require re-targeting the `user-watchlist` schema off `creativeWork` — HALT; the creative-work target is frozen by shipped 5.1/5.2.

**Never:**

- Do NOT change the `user-watchlist` schema, or the watchlist `add`/`remove`/`toggle`/`isInWatchlist` service methods, controller routes, or the proxy allow-list. Only `getUserWatchlist` (read enrichment) changes on the backend.
- Do NOT change `useAddToWatchlist`, `useRemoveFromWatchlist`, `useWatchlistSync`, `watchlistQueue`, or the offline-queue behavior — 5.3 is online read/display; offline watchlist read (cached list + "last synced") is **Story 5.4**.
- Do NOT build cross-device sync (5.5) or schedule-change notifications (5.6).
- Do NOT build a card-exit **animation** or an Account-hub page / BottomNav "account" wiring — no `/account` route exists yet; the nav entry point belongs to an account-page story. Record both as deferred.
- Do NOT add a public `movie`/`creativeWork` filter to the `/events-manager/events` REST endpoint (not needed; enrichment is server-internal via the facade).

## I/O & Edge-Case Matrix

| Scenario                  | Input / State                                                                    | Expected Output / Behavior                                                                                                                                                                    | Error Handling                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Facade — mixed dates      | ids `[A,B]`; A has events at `now-2d` & `now+3d` & `now+10d`, B only at `now-5d` | Returns `{ A: {nextScreeningDate: now+3d, lastScreeningDate: now-2d, venueName: <venue of now+3d> }, B: {nextScreeningDate: null, lastScreeningDate: now-5d, venueName: <venue of now-5d>} }` | n/a                                                                                       |
| Facade — no events for id | id `C` referenced by no published event                                          | `C` absent from the returned record (service merges → all-null enrichment)                                                                                                                    | n/a                                                                                       |
| Facade — empty ids        | `creativeWorkIds = []`                                                           | Returns `{}`; does NOT hit the Document Service                                                                                                                                               | n/a                                                                                       |
| Service enrichment        | `getUserWatchlist` with 3 rows                                                   | Each row gains `nextScreeningDate`/`lastScreeningDate`/`venueName` (null when the facade omitted its id); ordering preserved for the client to sort                                           | Facade throws → catch, log, return rows with all-null enrichment (page still lists items) |
| Page — sort               | Upcoming items D(+1d), E(+5d), F(+2d)                                            | Rendered order D, F, E (ascending `nextScreeningDate`)                                                                                                                                        | n/a                                                                                       |
| Page — Past split         | one item with `next=null,last=now-1d`                                            | Rendered under a separate "Past" heading, not in the main grid; Past hidden when none                                                                                                         | n/a                                                                                       |
| Page — undated            | saved work, `next=null && last=null`                                             | Stays in the main (Upcoming) grid after dated items; NOT in Past                                                                                                                              | n/a                                                                                       |
| Page — category filter    | `activeCategory="cinema"`                                                        | Only items with `creativeWork.type==="film"` shown, across both sections; empty filtered result → inline "no items in this category" message (not the full emptyState)                        | n/a                                                                                       |
| Page — remove + undo      | tap a card's filled heart                                                        | `useRemoveFromWatchlist` removes (list invalidates → card leaves), toast "Retiré…" with Undo; Undo re-adds (card returns on refetch)                                                          | Hook's own error toast on failure                                                         |
| Page — states             | list loading / error / empty                                                     | skeleton grid / error+retry / `EmptyState emptyWatchlist` + discovery CTA                                                                                                                     | error toast/state from the query                                                          |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` -- cross-plugin facade (only `adjustInventory` today). **Add `findScreeningInfoByMovies(creativeWorkIds, now)`** — the event-side enrichment query.
- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` -- reference for the proven `filters.screenings.movie` nested filter (L184-191), `status:"published"`, `EVENT_UID`, `venue`/`screenings.movie` populate, `startDateTime` sort. Mirror; no change.
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` -- `getUserWatchlist` (populate `creativeWork`, sort `addedAt:desc`). **Enrich via the facade + merge.** Other methods untouched.
- `apps/strapi/src/plugins/user-engagement/server/src/controllers/watchlist.ts` -- `list` already returns `{ data: items }`; enriched items flow through unchanged. No change.
- `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/public-api.unit.test.ts` -- EXISTS (covers `adjustInventory`); extend for the new method (mock `strapi.documents(...).findMany`).
- `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- 5.1/5.2 unit tests; **add** `getUserWatchlist` calls the facade with row ids and merges enrichment (mock `strapi.plugin("events-manager").service("public-api")`).
- `apps/client/src/features/events/hooks/useWatchlist.ts` -- `WatchlistItem` type + `useWatchlist()` list query. **Extend the type** with `nextScreeningDate?/lastScreeningDate?/venueName?` (nullable). Query/keys unchanged.
- `apps/client/src/features/events/utils/watchlistView.ts` -- NEW. Pure helpers: `partitionWatchlist(items)` → `{ upcoming, past }` (sort rules above) and `filterByCategory(items, activeCategory)`. Keeps the component thin + unit-testable.
- `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` -- REWORK: `useTranslations("watchlist")` (drop the labels prop), `CategoryTabs`, partition/sort/filter via `watchlistView`, Upcoming + Past sections, `EmptyState`, and a per-item `WatchlistCard` (defined in this file) that owns `useRemoveFromWatchlist` + seeds `watchlistKeys.check(id)`.
- `apps/client/src/app/[locale]/watchlist/page.tsx` -- keep auth-guard + `generateMetadata` (`pageTitle`/`pageDescription`); render `<WatchlistPageClient locale={locale} />` (remove the now-dead `labels` object).
- `apps/client/locales/fr.json`, `ar.json`, `en.json` -- `watchlist` namespace currently has only 5.1/5.2 keys. **Add** the page keys (see task).
- `apps/client/src/features/events/components/CategoryTabs/CategoryTabs.tsx` / `EmptyState` / `EventCard` / `useRemoveFromWatchlist.tsx` -- reused as-is. No change.
- `apps/client/src/features/events/utils/categoryMapper.ts` -- `mapCategoryToType` (UI cat → `creativeWork.type`) for the filter; `mapTypeToCategory` for the card's display category label. Reuse.
- `apps/client/vitest.config.ts` -- `include` allow-list. **Add** the watchlist page + `watchlistView` test globs.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` -- Add `async findScreeningInfoByMovies(creativeWorkIds: string[], now: string): Promise<Record<string, { nextScreeningDate: string | null; lastScreeningDate: string | null; venueName: string | null }>>`. Return `{}` immediately when `creativeWorkIds.length === 0`. Otherwise `strapi.documents("plugin::events-manager.event").findMany({ status:"published", filters:{ screenings:{ movie:{ documentId:{ $in: creativeWorkIds } } } }, populate:{ venue:true, screenings:{ populate:{ movie:true } } }, sort:"startDateTime:asc" } as never)`. Fold results into the record keyed by each matched screening's `movie.documentId`: track earliest `startDateTime >= now` (→ `nextScreeningDate` + that event's `venue.name`) and latest `startDateTime < now` (→ `lastScreeningDate`, and `venueName` only if no upcoming). One event's `screenings` can reference several movies — attribute the event to every referenced saved id. -- The whole sort/Past feature depends on this join.
- [x] `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` -- In `getUserWatchlist`, after the `findMany`, collect `rows.map(r => r.creativeWork?.documentId).filter(Boolean)`; if any, call `strapi.plugin("events-manager").service("public-api").findScreeningInfoByMovies(ids, new Date().toISOString())` inside try/catch (on throw: log via `strapi.log.error`, treat as `{}`); return each row spread with `nextScreeningDate`/`lastScreeningDate`/`venueName` from the record (all `null` when absent). Keep `populate:["creativeWork"]` and `sort:{addedAt:"desc"}`. -- The sanctioned cross-plugin enrichment; degrades gracefully so the list never 500s on an events-manager fault.
- [x] `apps/client/src/features/events/hooks/useWatchlist.ts` -- Extend `WatchlistItem` with `nextScreeningDate?: string | null; lastScreeningDate?: string | null; venueName?: string | null`. No change to `queryFn`/`watchlistKeys`. -- Types the enriched response.
- [x] `apps/client/src/features/events/utils/watchlistView.ts` -- NEW pure module. `partitionWatchlist(items: WatchlistItem[]): { upcoming: WatchlistItem[]; past: WatchlistItem[] }` — upcoming = `nextScreeningDate != null` OR both dates null; past = `nextScreeningDate == null && lastScreeningDate != null`; upcoming sorted by `nextScreeningDate` asc with null-dated ones last (tiebreak `addedAt` desc); past sorted `lastScreeningDate` desc. `filterByCategory(items, activeCategory: CategoryType)` — `all` → passthrough, else keep `item.creativeWork.type === mapCategoryToType(activeCategory)`. -- Isolated, exhaustively testable sort/split/filter logic.
- [x] `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` -- Rework per Code Map. Use `useTranslations("watchlist")` (+ `useTranslations("events")` for card labels). Local `activeCategory` state (`CategoryType`, default `"all"`) driving `<CategoryTabs>`. Compute `filtered = filterByCategory(items, activeCategory)` then `{ upcoming, past } = partitionWatchlist(filtered)`. Render the four states; success = an Upcoming grid (heading) and, when `past.length`, a "Past" grid (heading). Empty (no items at all) → `<EmptyState variant="emptyWatchlist" primaryAction={{label, onClick→router.push('/')}} />`. Filtered-to-empty (items exist but none match category) → a lightweight inline message, NOT the full empty state. Add a `WatchlistCard({ item })` component (same file): seeds `queryClient.setQueryData(watchlistKeys.check(item.creativeWork.documentId), { isInWatchlist:true })` on mount, calls `useRemoveFromWatchlist(item.creativeWork.documentId)`, and renders `<EventCard isWatchlisted onWatchlist={remove} onClick={→/events/:id} event={{ id, title, posterUrl, category: mapTypeToCategory(type), venueName: item.venueName ?? "", date: item.nextScreeningDate ?? item.lastScreeningDate ?? undefined }} />`. -- Delivers every AC behavior; the seed prevents the remove-hook guard from no-opping the first tap.
- [x] `apps/client/src/app/[locale]/watchlist/page.tsx` -- Keep the auth-guard + redirect and `generateMetadata` (reads `pageTitle`/`pageDescription`). Drop the `labels` object; render `<WatchlistPageClient locale={locale} />`. -- Removes reliance on now-relocated copy; the client owns its strings.
- [x] `apps/client/locales/fr.json`, `apps/client/locales/ar.json`, `apps/client/locales/en.json` -- Under `watchlist`, add: `pageTitle`, `pageDescription`, `title`, `subtitle`, `upcomingTitle`, `pastTitle`, `emptyTitle`, `emptyDescription`, `emptyAction`, `noneInCategory`, `loading`, `error`, `retry`, and a `categories` object (`all/cinema/theater/shorts/music/exhibitions`) for the `CategoryTabs` labels. Accurate fr (default), ar (Western numerals, RTL auto), en. Do NOT duplicate the existing `events` add/remove/priceFrom keys. -- Fixes the broken page + labels all new UI; no hardcoded copy, no missing-message throw.
- [x] `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/public-api.unit.test.ts` -- Cover `findScreeningInfoByMovies`: empty ids → `{}` + no `findMany`; mixed past/future events for one movie → correct earliest-future `nextScreeningDate` + latest-past `lastScreeningDate` + correct `venueName` (from the upcoming event); a movie with only past events → `next=null,last=<latest past>`; an id with no events → absent from the record; an event whose `screenings` reference two saved movies → both keyed. -- Locks the join/bucketing crux.
- [x] `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` -- EDIT. Mock `strapi.plugin("events-manager").service("public-api").findScreeningInfoByMovies`; assert `getUserWatchlist` calls it with the rows' creative-work ids and merges `nextScreeningDate`/`lastScreeningDate`/`venueName` onto each row (absent id → nulls); assert a **facade throw** is caught and rows return with all-null enrichment (no throw). Existing add/remove/toggle cases stay green. -- Locks the cross-plugin merge + graceful degradation.
- [x] `apps/client/src/features/events/utils/watchlistView.test.ts` -- NEW. Table-test `partitionWatchlist` (soonest-first ordering; past desc; null-dated stays in upcoming, after dated; both-null not in past) and `filterByCategory` (`all` passthrough; `cinema`→`film`; cross-section application). -- Locks the display contract independent of React. (Already matched by the existing `src/features/events/utils/**/*.test.ts` include glob — no vitest change needed for this file.)
- [x] `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.test.tsx` -- NEW (Testing Library; mock `useWatchlist`, `useRemoveFromWatchlist` (spy `remove`), next-intl, `@/lib/navigation`, session, `QueryClientProvider`). Assert: renders Upcoming cards sorted soonest-first; a past-only item appears under the Past heading (upcoming item does not); selecting a `CategoryTabs` category filters both sections; empty list → `EmptyState` (emptyWatchlist) with a CTA that routes to `/`; loading → skeletons; error → retry; tapping a card heart calls `remove` (and the card seeded its `check` cache so `remove` is not a no-op). -- Locks page composition + the seed-then-remove wiring.
- [x] `apps/client/vitest.config.ts` -- Add `"src/app/**/watchlist/**/*.test.tsx"` to `include` (the `watchlistView` util test is ALREADY covered by the existing `src/features/events/utils/**/*.test.ts` glob — do NOT re-add it). NOTE: `[locale]` is a glob char-class — match via `**`. -- Otherwise the new page test never runs.

**Acceptance Criteria:**

- Given an authenticated user with saved events, when the watchlist page loads, then all saved items render as `EventCard`s and the page shows no missing-i18n placeholders or console `MISSING_MESSAGE` errors.
- Given saved items with upcoming screenings, when the page renders, then they appear sorted by event date soonest-first (each card shows its real next-screening date and venue, not `addedAt`/blank).
- Given a saved item whose only screenings are in the past, when the page renders, then it appears in a separate "Past" section (and a saved item with no scheduled screenings at all stays in the main list, not "Past").
- Given the category filter, when the user selects a category, then only items whose creative-work type matches are shown across both the Upcoming and Past sections; selecting "all" restores everything.
- Given an empty watchlist, when the page renders, then the encouraging `EmptyState` (emptyWatchlist) with a CTA back into discovery is shown — never a blank screen; loading shows a skeleton grid and a failed load shows an error with retry.
- Given a listed card, when the user taps its filled heart, then the item is removed (it leaves the list on refetch) and a "Retiré de la watchlist" toast with Undo appears — the first tap removes (the per-card `check` cache seed prevents a silent no-op).
- Given `getUserWatchlist`, when it enriches, then it reaches events-manager only through `strapi.plugin("events-manager").service("public-api")`, and an events-manager fault is caught so the list still returns (items unsorted/undated rather than a 500).
- Given any user-facing watchlist page string, when rendered, then it resolves from the `watchlist` i18n namespace in the active locale (fr/ar/en), with Arabic dates in Western numerals.

## Design Notes

Facade join (the crux — one event-side query, attributed back to each saved movie):

```ts
// public-api.ts — findScreeningInfoByMovies(ids, now)
const events = await strapi.documents("plugin::events-manager.event").findMany({
  status: "published",
  filters: { screenings: { movie: { documentId: { $in: ids } } } },
  populate: { venue: true, screenings: { populate: { movie: true } } },
  sort: "startDateTime:asc",
} as never)
const out: Record<
  string,
  {
    nextScreeningDate: string | null
    lastScreeningDate: string | null
    venueName: string | null
  }
> = {}
for (const ev of events) {
  const when = ev.startDateTime,
    upcoming = when >= now
  for (const s of ev.screenings ?? []) {
    const id = s.movie?.documentId
    if (!id || !ids.includes(id)) continue
    const cur = (out[id] ??= {
      nextScreeningDate: null,
      lastScreeningDate: null,
      venueName: null,
    })
    if (upcoming) {
      if (!cur.nextScreeningDate || when < cur.nextScreeningDate) {
        cur.nextScreeningDate = when
        cur.venueName = ev.venue?.name ?? null
      }
    } else if (!cur.lastScreeningDate || when > cur.lastScreeningDate) {
      cur.lastScreeningDate = when
      if (!cur.nextScreeningDate) cur.venueName = ev.venue?.name ?? null
    }
  }
}
```

Why the check-cache seed matters: `useRemoveFromWatchlist(id)` guards `if (!checkData?.isInWatchlist || removeMutation.isPending) return`. On the list page nothing has populated `watchlistKeys.check(id)`, so the first tap would read `undefined` and no-op. Every listed item IS watchlisted, so `WatchlistCard` seeds `setQueryData(watchlistKeys.check(id), { isInWatchlist: true })` on mount — the heart also renders filled and the first tap removes. (Because hooks can't run inside `.map`, `WatchlistCard` is a real component; one hook instance per row is fine.)

Why enrichment is server-side (not a second client fetch): the watchlist GET is JWT-private and the events data is public; joining on the server keeps the client a single `useWatchlist()` call, keeps the cross-plugin edge inside Strapi (facade rule), and avoids adding a public `movie` filter to the events REST endpoint. `now` is passed into the facade (not read inside) so the bucketing is deterministically unit-testable.

Deferred to record in `deferred-work.md`: (1) the card-exit **animation** on remove (epic UX polish; the card already leaves on refetch) — Story 5.3 scope-trimmed; (2) the Account-tab → `/watchlist` navigation entry point (no `/account` route exists; belongs to an account-hub story); (3) an offline-cached read of the list + "last synced" is **Story 5.4**.

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: new `public-api` `findScreeningInfoByMovies` cases + extended `watchlist.unit.test.ts` (enrichment merge + graceful-degradation) pass; existing suites green.
- `cd apps/client && yarn test` -- expected: `watchlistView.test.ts` and `WatchlistPageClient.test.tsx` pass; 5.1/5.2 watchlist hook/util tests still pass.
- `cd apps/client && yarn typecheck` -- expected: no NEW type errors from changed/added files (repo baseline is pre-existing red).
- `cd apps/client && yarn lint` -- expected: clean on changed files.

**Manual checks (if no CLI):**

- Grep `public-api.ts` shows `findScreeningInfoByMovies` with a `screenings.movie.documentId $in` event query; `watchlist.ts` `getUserWatchlist` calls `strapi.plugin("events-manager").service("public-api")` inside try/catch.
- `WatchlistPageClient.tsx` no longer passes `date: item.addedAt`/`venueName: ""`; renders `CategoryTabs`, an Upcoming and a conditional Past section, and `EmptyState`.
- The `watchlist` namespace in all three locale files contains the new page keys (`pageTitle`, `title`, `upcomingTitle`, `pastTitle`, `emptyTitle`, …, `categories.*`).

## Review Triage Log

### 2026-07-10 — Review pass 1

Three parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap). No intent_gap / bad_spec — the implementation matched the frozen contract; all findings were localized hardening or verification gaps fixable by patch.

- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 4, low 1)
- defer: 2: (high 0, medium 2, low 0)
- reject: 7
- addressed_findings:
  - `[medium]` `[patch]` Client `WatchlistCard`/`filterByCategory` dereferenced `item.creativeWork.*` unguarded while the backend treats it as nullable — a dangling row (deleted creative-work) would crash the whole page. Fixed: filter out null-`creativeWork` rows before render + null-safe `filterByCategory`; added drop tests (util + page).
  - `[medium]` `[patch]` Card category badge used the French-only `mapTypeToCategory`, rendering "Cinéma" in ar/en (violates the i18n AC). Fixed: resolve the badge through the localized `categories` labels (type → CategoryType → label); added a localized-badge test.
  - `[medium]` `[patch]` No test pinned that the card renders the REAL `nextScreeningDate`/`venueName` — a revert to `addedAt`/blank (the exact bug this story fixes) shipped green. Fixed: added display assertions (upcoming date+venue, past `lastScreeningDate`).
  - `[medium]` `[patch]` The component test mocks next-intl (echoes keys), so a key missing in one locale was invisible. Fixed: added a `watchlist` namespace key-parity test across fr/ar/en (recursive, incl. nested `categories`).
  - `[low]` `[patch]` Facade + `partitionWatchlist` compared ISO dates lexicographically (correct only for Z-normalized equal-precision). Fixed: compare parsed instants (`Date.parse`) in both; `Set`-membership in the facade; added the remaining category-mapping coverage.
  - (deferred: per-card `useWatchlistCheck` fetch storm — N proxied requests on load, functionally correct but a perf regression whose fix (pre-seed check caches in the parent) cannot be verified by the mocked unit tests; poster media never populated by `getUserWatchlist` — pre-existing, spec deliberately kept `populate:["creativeWork"]`.)
  - (rejected as noise/by-design: header shows total-saved count under an active filter; never-scheduled items under the "Upcoming" heading; seed→remove causal link only structurally pinned (guard lives in 5.2 tests); `?? ""` vs `?? undefined` (identical via `formatDate` NaN guard); stale `check` cache after removal (remove hook already sets check→false optimistically); `as never` on the Document Service query (established codebase pattern); `includes` vs `Set` micro-perf.)

### 2026-07-10 — Review pass 2 (follow-up)

Three parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) re-ran on the committed diff. No intent_gap / bad_spec — the implementation still matches the frozen contract; findings were two verification-gap patches plus two latent/cosmetic defers. Ground-truth verified against the schemas: `creative-work.type` enum is `["film","play","short-film"]` (so `concert`/`exhibition` category tabs are impossible types) and the MVP event surface is cinema-only (`events.ts` `MVP_CATEGORY = "movie_screening"`), which downgrades the "plays not enriched" and "dead category tabs" findings to latent/by-design.

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 1, low 1)
- defer: 2: (high 0, medium 0, low 2)
- reject: 14
- addressed_findings:
  - `[medium]` `[patch]` The card-body → `/events/:creativeWorkId` navigation (the page's primary interaction, a frozen invariant) had no test — a regression to the watchlist row's own `documentId` (wrong entity) would deep-link wrong and ship green. Fixed: added a card-click test asserting `push("/events/cw-D")`.
  - `[low]` `[patch]` The pass-1 localized category badge (type → CategoryType → label) was pinned only for `film`; a wrong `TYPE_TO_CATEGORY` entry for another type would ship green. Fixed: extended the badge test to a table over all three real enum types (`film`→cinema, `play`→theater, `short-film`→shorts).
  - (deferred: (1) enrichment is screenings-only — `performances.play` events get no date/venue [latent; theater is out of the cinema-only MVP; frozen by the contract]; (2) the localized badge label misses `EventCard`'s French-keyed `categoryVariants`, so ar/en badges lose their color variant [cosmetic; touches the shared EventCard contract]. Both recorded in `deferred-work.md`, 2026-07-10 follow-up.)
  - (rejected as noise/by-design/unreachable: dead `music`/`exhibitions` category tabs [impossible `creative-work.type` values; consistent with the shared CategoryTabs used app-wide]; badge French fallback for null/unmapped type [all three valid enum types are mapped; null-`creativeWork` rows already filtered]; `WatchlistItem.creativeWork` typed non-null vs backend null [runtime guard + a dangling-row test already protect it]; empty meta row for undated works [spec-accepted]; header count = total-saved under a filter [pass-1 rejected]; `locale` prop unused / `fr-TN` dates [pre-existing EventCard; AC's Western-numeral requirement satisfied]; per-card `/check` fetch storm [already deferred pass 1]; facade non-ISO `now` / server-bucketed-date-passes-before-render / double-unparseable NaN comparator [not reachable — the facade only emits parseable dates and is called with `new Date().toISOString()`]; all-null rows → EmptyState [correct behavior]; seed→remove causal link only structurally pinned [accepted residual, guard lives in 5.2 tests]; sort test not section-scoped & poster/date/venue fallbacks [date/venue display is already asserted; posters known-deferred].)

## Auto Run Result

Status: done

### Summary

Reworked the (previously broken) `/watchlist` page into the real Story 5.3 surface. Root problem: the page read `watchlist.*` i18n keys that existed in no locale, and rendered each saved item with a fake `date: addedAt` / blank venue, because the watchlist stores **creative-works** with no event dates. Fix: enrich the list **server-side** via a new `events-manager` `public-api` facade method `findScreeningInfoByMovies` (event-side `screenings.movie.documentId $in` join → each creative-work's soonest-upcoming + most-recent-past screening date and venue); `getUserWatchlist` calls it (the first sanctioned `user-engagement → events-manager` cross-plugin edge, try/catch-degraded). The client sorts Upcoming soonest-first, filters by category (from `creativeWork.type`), splits expired items into a "Past" section, uses the shared `EmptyState`, and removes each card via the shipped 5.2 `useRemoveFromWatchlist` (toast+Undo) — seeding each card's `check` cache so the hook's guard doesn't no-op the first tap. All missing `watchlist` i18n keys added in fr/ar/en.

### Files changed

- `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` — NEW facade method `findScreeningInfoByMovies(ids, now)` (event-side join, instant-based bucketing, `Set` membership).
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` — `getUserWatchlist` enriches via the facade (cross-plugin, try/catch graceful degradation).
- `apps/client/src/features/events/hooks/useWatchlist.ts` — `WatchlistItem` extended with `nextScreeningDate`/`lastScreeningDate`/`venueName`.
- `apps/client/src/features/events/utils/watchlistView.ts` — NEW pure `partitionWatchlist` (instant-sorted Upcoming/Past) + null-safe `filterByCategory`.
- `apps/client/src/app/[locale]/watchlist/WatchlistPageClient.tsx` — reworked (tabs, Upcoming+Past, EmptyState, localized category badge, null-row skip, per-card seed+remove).
- `apps/client/src/app/[locale]/watchlist/page.tsx` — simplified (auth-guard + metadata; client owns its strings).
- `apps/client/locales/{fr,ar,en}.json` — added the `watchlist` page keys + nested `categories`.
- Tests (NEW/EDIT): `public-api.unit.test.ts`, `watchlist.unit.test.ts` (enrichment + degradation), `watchlistView.test.ts`, `WatchlistPageClient.test.tsx` (+ i18n parity), `vitest.config.ts` include glob.

### Review findings breakdown

- Pass 1: 0 intent_gap / 0 bad_spec. 5 patches applied (4 medium: null-`creativeWork` page crash, non-localized category badge, missing date/venue display test, next-intl-mock-hidden i18n gap; 1 low: lexicographic date compare). 2 deferred (per-card check fetch storm; poster populate — both recorded in `deferred-work.md`). 7 rejected.

### Verification

- `cd apps/strapi && yarn test` — PASS (209 tests / 16 suites).
- `cd apps/client && yarn test` — PASS (363 tests / 28 files; +8 from the review patches).
- `cd apps/client && yarn typecheck` — no new errors from changed/added files (repo baseline pre-existing red).
- `cd apps/client && yarn lint` — clean on changed files.

### Residual risks

Deferred (see `deferred-work.md`, 2026-07-10): (1) per-card `useWatchlistCheck` fires N proxied `/check` requests on load — functionally correct (all return true) but a load-time perf regression on the mobile-first target; the fix (pre-seed check caches in the parent, or add `initialData`/`enabled` to `useWatchlistCheck`) needs an integration test the current mocked suite can't provide. (2) Posters render as the placeholder because `getUserWatchlist` populates only `["creativeWork"]` (pre-existing). Scope-trimmed and recorded: card-exit animation on remove, the Account-tab → `/watchlist` nav entry point (no `/account` route yet), and offline-cached read (Story 5.4).

### Follow-up review pass (2026-07-10)

A second independent review pass (triggered by pass-1's `followup_review_recommended`) re-ran the three reviewers on the committed diff. No intent_gap / bad_spec; the code still matches the frozen contract. Two verification-gap **patches** applied (test-only, additive):

- Added a card-body click test asserting navigation to `/events/:creativeWorkId` (the page's primary interaction / a frozen invariant that was previously untested — a wrong-entity-id regression would have shipped green).
- Extended the localized category-badge test to a table over all three real `creative-work.type` enum values (`film`→cinema, `play`→theater, `short-film`→shorts), locking the pass-1 badge fix beyond the single `film` case.

Two new **defers** recorded (`deferred-work.md`, 2026-07-10 follow-up): screening enrichment is film-only (theater `performances.play` events get no date/venue — latent, out of the cinema-only MVP, frozen by the contract); and the localized badge label misses `EventCard`'s French-keyed `categoryVariants`, so ar/en badges lose their color variant (cosmetic; touches the shared EventCard contract). Verification re-run: `cd apps/client && yarn test` → PASS (365 tests / 28 files, +2 from this pass); lint clean on the changed test file. Backend untouched this pass (no Strapi re-run needed). `followup_review_recommended` set to `false` — the changes were two localized, low-consequence, test-only additions.
