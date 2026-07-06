---
title: "Date Range Filtering (Story 3.3)"
type: "feature"
created: "2026-07-06"
status: "done"
baseline_revision: "96827977a16e0b5292190aa206de907519ea8234"
final_revision: "d2ee887a5cfe6d36a1f533bbb5bac971c92010d0"
review_loop_iteration: 0
followup_review_recommended: false
sprint_key: "3-3-date-range-filtering"
depends_on:
  [
    "3-1-public-events-browse-api-and-data-foundation",
    "3-11-homepage-with-curated-event-listings",
  ]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-1-public-events-browse-api-and-data-foundation.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** A visitor cannot narrow event discovery to when they are free. The ACs for Stories 3.2–3.5 all say _"Given I am on the events listing page"_, but that page does not exist: `app/[locale]/events/` holds only `[documentId]/` (detail), and the homepage's own "See all" links already point at a missing `/[locale]/events?date=…` route. The homepage's date selector writes the `date` URL param but nothing filters on it (logged in `deferred-work.md` as an inert-selector UX trap). Story 3.3 is the first MVP filter story and must create the filterable listing surface + the date filter that actually queries by date.

**Approach (frontend only):** Create the `/[locale]/events` listing page — a thin SSR RSC that reads `searchParams`, resolves the `date` param to a Tunis-aware ISO `{startDate,endDate}` window, fetches a flat, paginated, date-filtered event list from the existing Story 3.1a public API (`fetchEvents`, `sort=startDateTime:asc`), and renders `EventCard`s with empty/loading/error states, i18n, and RTL. Add a listing date-filter control offering the AC presets (Aujourd'hui / Demain / Ce weekend) plus a custom-range calendar picker, with the selected option highlighted, driving the `date` URL param. Establish a small **shared URL-state filter mechanism** (typed parse/serialize helper + the Tunis-aware date resolver) that Stories 3.4/3.5 will extend. No backend changes: 3.1a already supports `startDate`/`endDate` + `startDateTime:asc`.

## Boundaries & Constraints

**Always:**

- Follow the existing URL-state convention: RSC reads validated `searchParams`; the client island uses `useSearchParams()` + `router.push(url, { scroll: false })`. **No Zustand, no nuqs** — they are not in the client and must not be introduced.
- Resolve all date windows through **Africa/Tunis (fixed UTC+1, no DST)** day boundaries using the existing helpers (`startOfToday`/`startOfDayInDays`/`endOfToday`/`endOfDayInDays` in `events-extended.ts`). Consolidate `date`→`{startDate,endDate}` into one range-capable resolver and fix the existing host-local `setHours` inconsistency in `buildDateRange`.
- `date` URL grammar (single param, extensible): a preset `today | tomorrow | weekend`, a single day `YYYY-MM-DD`, or a custom range `YYYY-MM-DD..YYYY-MM-DD`. Invalid/malformed values are ignored (treated as "no date filter" — default upcoming), never a crash.
- Consume the Strapi v5 response shape directly (`data`, `meta.pagination`) via `fetchEvents`; request `sort=startDateTime:asc` so results are ordered by showtime. Render only through the existing `EventCard` component; do not build a new card primitive.
- Reuse existing shadcn primitives (`components/ui/calendar.tsx`, `components/ui/popover.tsx`, and/or the existing `components/elementary/DateRangePicker.tsx` pattern) for the custom-range picker — do not hand-roll a calendar.
- SSR the listing route; French default, `ar` ⇒ `dir="rtl"` with Western numerals and DD/MM/YYYY; all copy via `getTranslations`/`useTranslations` (no hardcoded strings). Touch targets ≥44×44px; active filter chip visibly highlighted.
- Fail soft: an upstream API error or empty result renders the empty state, never a whole-page 500.

**Block If:** (none — the ACs are concrete, the backend contract exists, and all scoping decisions carry forward from 3.1a/3.1b. If a genuine backend gap appears — e.g. a needed filter/sort the 3.1a API cannot express — escalate as a 3.1a gap rather than adding backend surface.)

**Never:**

- Do not modify backend/plugin code. 3.1a owns the API; a missing capability is a 3.1a gap to escalate, not to patch here.
- Do not implement category (Story 3.2, deferred), region/city (Story 3.4), or venue (Story 3.5) filtering behavior. The listing RSC may read-through/pass those params for forward-compat, but must not filter on them.
- Do not rebuild the homepage curated slices to be reactive, and do not restyle the homepage `DateSelector`. Homepage scope here is limited to ensuring its existing "See all" date links land on a correctly-filtered listing.
- Do not add per-screening (sub-event) showtime re-ordering beyond the event-level `startDateTime:asc` the API provides (MVP events are point-in-time cinema screenings).

## I/O & Edge-Case Matrix

| Scenario           | Input / State                                   | Expected Output / Behavior                                                                                                                        | Error Handling                              |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Preset filter      | `/events?date=weekend`                          | List shows only events whose `startDateTime` falls in the Tunis weekend window, `startDateTime:asc`; "Ce weekend" chip highlighted                | 200; empty state if none                    |
| Today (default)    | `/events` (no `date`)                           | Defaults to upcoming events from start-of-today (Tunis) forward, `startDateTime:asc`; no chip forced-active or "Aujourd'hui" per resolver default | 200                                         |
| Custom single day  | `/events?date=2026-07-10`                       | Only events on that Tunis calendar day; custom chip shows the picked date                                                                         | 200; empty state if none                    |
| Custom range       | `/events?date=2026-07-10..2026-07-14`           | Events with `startDateTime` in `[start-of-10, end-of-14]` (Tunis); calendar range reflects selection                                              | 200; empty state if none                    |
| Inverted/malformed | `date=2026-07-14..2026-07-10` or `date=garbage` | Treated as no date filter (default upcoming); page still renders                                                                                  | Graceful; no crash, no 400 surfaced to user |
| Empty slice        | Valid date window with zero events              | Inline empty state ("Aucun événement pour cette date") + the filter bar remains usable to pick another date                                       | Graceful, no throw                          |
| Upstream API error | Strapi fetch fails/times out                    | List degrades to empty state; error logged server-side; filter bar still rendered                                                                 | Caught server-side, no whole-page 500       |
| RTL locale         | `ar` locale                                     | `dir="rtl"`, Western numerals, DD/MM/YYYY, localized chip labels                                                                                  | No error expected                           |

</intent-contract>

## Code Map

- `apps/client/src/app/[locale]/events/page.tsx` — **NEW** listing RSC route. Read+validate `searchParams.date`, resolve to `{startDate,endDate}`, `fetchEvents({startDate,endDate,sort:"startDateTime:asc",locale})`, `setRequestLocale`, `getTranslations` labels, hand off to the client island. (`events/` currently has only `[documentId]/`.)
- `apps/client/src/app/[locale]/events/loading.tsx` — **NEW** route-segment loading skeleton (co-location convention).
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — **NEW** `"use client"` island: renders the date-filter control + a responsive `EventCard` grid from the server-fetched list; owns URL writes (`useSearchParams` + `router.push`, `scroll:false`); shows the empty state.
- `apps/client/src/features/events/components/EventDateFilter/EventDateFilter.tsx` — **NEW** `"use client"` date-filter control: preset chips (Aujourd'hui / Demain / Ce weekend) + "Choisir" custom-range chip opening a `Popover`→`Calendar mode="range"`; emits a typed `DateFilterValue`; highlights the active option.
- `apps/client/src/features/events/filters/filterParams.ts` — **NEW** shared URL-state helper: `EventFilters` type, `parseEventFilters(searchParams)`, `serializeEventFilters(filters)` (date now; category/city/venue reserved for 3.4/3.5). The mechanism 3.4/3.5 extend.
- `apps/client/src/lib/strapi-api/content/events-extended.ts` — `fetchEvents` (already forwards `startDate`/`endDate`/`sort`); **make `buildDateRange` Tunis-aware and range-capable** (presets + `YYYY-MM-DD` + `YYYY-MM-DD..YYYY-MM-DD`), reusing the existing Tunis helpers instead of host-local `setHours`.
- `apps/client/src/features/events/components/EventCard/EventCard.tsx` — reused, unchanged, to render each result.
- `apps/client/src/components/ui/calendar.tsx`, `apps/client/src/components/ui/popover.tsx`, `apps/client/src/components/elementary/DateRangePicker.tsx` — existing shadcn/react-day-picker primitives to compose the custom-range picker (drop the `removeThisWhenYouNeedMe` scaffold marker if `DateRangePicker` is reused).
- `apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx` — `buildSeeAllUrl` already targets `/${locale}/events?date=…`; verify the emitted presets match this story's `date` grammar so the links land filtered.
- `apps/client/locales/{fr,en,ar}.json` — add an `events` listing namespace (page title, empty state, weekend/custom/clear labels) across all three locales.
- Tests: `apps/client/src/lib/strapi-api/content/events-extended.test.ts` (extend), `apps/client/src/features/events/filters/filterParams.test.ts` (**NEW**), `apps/client/src/features/events/components/EventDateFilter/EventDateFilter.test.tsx` (**NEW**) — Vitest.

## Tasks & Acceptance

**Execution:**

- [x] `lib/strapi-api/content/events-extended.ts` — rewrite `buildDateRange` to be Africa/Tunis-aware (reuse `startOfToday`/`startOfDayInDays`/`endOfToday`/`endOfDayInDays`) and to accept preset (`today|tomorrow|weekend`), single `YYYY-MM-DD`, and range `YYYY-MM-DD..YYYY-MM-DD`; return `{startDate,endDate}` ISO (undefined ⇒ default open-ended upcoming from start-of-today). Invalid input ⇒ no range.
- [x] `features/events/filters/filterParams.ts` — add `EventFilters` type + `parseEventFilters`/`serializeEventFilters` for the `date` key (validating the grammar), with category/city/venue reserved (parsed/preserved but unused) so 3.4/3.5 extend without a rewrite.
- [x] `features/events/components/EventDateFilter/EventDateFilter.tsx` — build the preset-chip + custom-range control; active option highlighted; custom chip opens a `Calendar mode="range"` popover; emits the `date` value; localized labels via props.
- [x] `features/events/components/EventsListing/EventsListing.tsx` — client island: render `EventDateFilter` + `EventCard` grid from props; on filter change, `serializeEventFilters`→`router.push(\`/${locale}/events?…\`, {scroll:false})`; render the empty state when the list is empty.
- [x] `app/[locale]/events/page.tsx` + `loading.tsx` — NEW SSR route: parse+validate `date`, resolve range, `fetchEvents({startDate,endDate,sort:"startDateTime:asc",locale})` inside a try/catch (empty on failure), `setRequestLocale`, pass events + active filters + labels to `EventsListing`; loading skeleton.
- [x] `locales/{fr,en,ar}.json` — add the `events` listing namespace (title, empty state, weekend/custom/clear/apply labels) in FR/EN/AR.
- [x] `features/events/components/HomePage/HomePageWithVenue.tsx` — align `buildSeeAllUrl` date presets with the new `date` grammar so homepage "See all" links land on a correctly-filtered listing (no restyle of the homepage selector).
- [ ] Tests (Vitest) — `buildDateRange` presets/single/range + Tunis boundary + invalid-input cases; `filterParams` parse/serialize round-trip incl. malformed `date`; `EventDateFilter` renders presets, highlights the active option, and emits the expected value on select (incl. custom range).

**Acceptance Criteria:**

- Given a visitor is on `/[locale]/events`, when they select a date preset (Aujourd'hui, Demain, or Ce weekend), then the list re-queries and shows only events in that Tunis date window, ordered by showtime (`startDateTime:asc`), and the selected chip is highlighted.
- Given a date filter is active, when the list renders, then the `date` URL param reflects the selection (preset, `YYYY-MM-DD`, or `YYYY-MM-DD..YYYY-MM-DD`) and reloading/deep-linking that URL reproduces the same filtered list (SSR).
- Given the visitor taps the custom option, when the calendar picker opens and a range is chosen, then the list filters to that range and the URL encodes it.
- Given a chosen date window has no events, when the page renders, then an inline empty state is shown and the filter bar remains usable to pick another date (never a whole-page error).
- Given the `ar` locale, when the listing renders, then layout is `dir="rtl"` with Western numerals and DD/MM/YYYY, and all filter labels are localized.
- Given a returning visit or cached navigation, when a date is re-selected, then filtering is effectively instant (RSC fetch served from the fetcher's revalidate cache), consistent with the existing curated-slice fetch behavior.

## Review Triage Log

### 2026-07-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 3, low 1)
- defer: 1
- reject: 10: (high 0, medium 0, low 10)
- addressed_findings:
  - `[medium]` `[patch]` The `weekend` preset skipped the **current Sunday**: `daysUntilSat = (6 - dow + 7) % 7` yielded `6` when `dow === 0`, jumping "Ce weekend" to _next_ Saturday and hiding a Sunday visitor's same-evening screenings. `buildDateRange` now special-cases Sunday (weekend already underway → show the remainder of today); added a Sunday-`now` regression test.
  - `[medium]` `[patch]` The homepage "Cette semaine → Voir tout" link built a `YYYY-MM-DD..YYYY-MM-DD` range from host-local `new Date()` inside `useMemo([])` — not Tunis-aware and hydration-unstable (server vs client compute different pairs near midnight). Replaced with a static link to the upcoming listing (`/[locale]/events`, ascending sort surfaces this-week first), matching the featured/trending See-all; removed the runtime date computation. This also moots the "`?date=this-week` legacy link regresses / dead code" finding: the homepage no longer emits it, the listing grammar deliberately excludes `this-week`, and `buildDateRange` keeps the `this-week` branch only for the legacy curated-slice fetchers (not dead).
  - `[medium]` `[patch]` The listing fetched a hard `pageSize = 24` with no pagination/count signal, silently truncating busy date windows. Raised `LISTING_PAGE_SIZE` to 60 (well above realistic per-date MVP cinema volume, ≤ backend max 100); true load-more/pagination beyond page 1 deferred (ledger).
  - `[low]` `[patch]` `EventDateFilter`'s `role="group"` had no accessible name (WCAG AA). Added a localized `aria-label` (`groupLabel`, new `events.listing.dateFilter` key in fr/en/ar) threaded through the label chain; updated the component test fixture.
  - Deferred (1, see deferred-work.md): no load-more/pagination beyond the first listing page and no total-count signal — an enhancement beyond the AC, real at scale.
  - Rejected (10, all low): duplicated calendar-day validation across `filterParams`/`events-extended` (maintainability only); "missing i18n key → 500" (all assumed keys verified present in fr/en/ar); `flex-wrap` "defeating" the scroll wrapper (wrapping is acceptable / better a11y); `fr-TN` custom-date formatting for all locales (that IS the spec-mandated DD/MM/YYYY + Western numerals — consistent with the prior 3-11 decision); invalid/inverted `date` not canonically redirected (graceful "no filter" is the spec's I/O-matrix behavior); range picker "unselectable"/untested (react-day-picker v9's first click leaves `to` undefined, so multi-day selection works; serialization is round-trip tested); Tunis helpers "unverified" (confirmed Tunis-pinned, as established in 3-11); fragile vitest React-dedupe aliases (test-only config, currently functioning); `readReserved` evaluated twice (micro); half-range "no resync" (an `useEffect` already resyncs `range` from `value`).

## Design Notes

**Date-window semantics (accepted MVP constraint):** The 3.1a API filters on the **event-level `startDateTime`** (`$gte`/`$lte`), i.e. point-in-time, not screening-overlap. MVP cinema events are point-in-time screenings, so this is correct and matches how the homepage tonight/this-week slices already work. Multi-day-run overlap semantics would require a 3.1a change and are out of scope (escalate if ever needed).

**Range encoding example:**

```
today            -> { startDate: startOfToday(),          endDate: endOfToday() }
weekend          -> { startDate: <Sat 00:00 Tunis>,       endDate: <Sun 23:59 Tunis> }
2026-07-10       -> { startDate: startOfDay("2026-07-10"), endDate: endOfDay("2026-07-10") }
2026-07-10..14   -> { startDate: startOfDay("2026-07-10"), endDate: endOfDay("2026-07-14") }
(none/invalid)   -> { startDate: startOfToday() }   // open-ended upcoming
```

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. the new `buildDateRange`/`filterParams`/`EventDateFilter` tests.
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in story-changed files (repo has a known pre-existing baseline).
- `yarn workspace @tiween/client lint` — expected: exit 0, no new errors (a11y, unused-vars).
- `yarn workspace @tiween/client build` — expected: the new `/[locale]/events` SSR route compiles.

**Manual checks (if no CLI):**

- With Strapi running the 3.1a API (`cd apps/strapi && yarn seed:fresh && yarn develop`), load `/fr/events`, `/fr/events?date=weekend`, `/fr/events?date=2026-07-10..2026-07-14`, and `/ar/events` — expected: correctly filtered, showtime-ordered lists; active chip highlighted; empty state on an empty window; RTL on `ar`.

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.3 (Date Range Filtering) as a frontend-only slice: a new `/[locale]/events` SSR listing page — the filterable surface the epic's filter stories (3.2–3.5) all reference but that did not exist — with a Tunis-aware date filter that actually queries the existing Story 3.1a public events API. The filter offers Aujourd'hui / Demain / Ce weekend presets plus a custom-range calendar, drives a single `date` URL param (preset | `YYYY-MM-DD` | `YYYY-MM-DD..YYYY-MM-DD`), sorts by showtime (`startDateTime:asc`), degrades gracefully on empty/error, and is SSR + i18n + RTL. It also establishes the shared, dependency-free URL-state filter mechanism (`filterParams.ts`) that Stories 3.4/3.5 extend. No backend changes.

**Files changed.**

- [apps/client/src/app/[locale]/events/page.tsx](../../apps/client/src/app/[locale]/events/page.tsx) & [loading.tsx](../../apps/client/src/app/[locale]/events/loading.tsx) — NEW SSR listing route: `parseEventFilters` → `buildDateRange` → `fetchEvents({startDate,endDate,sort:"startDateTime:asc",locale})` in a fail-soft try/catch, `setRequestLocale`, `getTranslations` labels, `generateMetadata`; co-located skeleton.
- [apps/client/src/features/events/filters/filterParams.ts](../../apps/client/src/features/events/filters/filterParams.ts) — NEW shared URL-state layer: `EventFilters`/`DateFilterValue`, `parseEventFilters`/`serializeEventFilters` + date parse/serialize; validates the `date` grammar, reserves category/city/venue for 3.4/3.5.
- [apps/client/src/features/events/components/EventDateFilter/EventDateFilter.tsx](../../apps/client/src/features/events/components/EventDateFilter/EventDateFilter.tsx) — NEW `'use client'` preset-chip + custom-range calendar control; active-highlight, ≥44px targets, localized labels incl. accessible group name.
- [apps/client/src/features/events/components/EventsListing/EventsListing.tsx](../../apps/client/src/features/events/components/EventsListing/EventsListing.tsx) — NEW `'use client'` island: `EventDateFilter` + responsive `EventCard` grid, serialize→`router.push` URL writes, inline empty state.
- [apps/client/src/lib/strapi-api/content/events-extended.ts](../../apps/client/src/lib/strapi-api/content/events-extended.ts) — `buildDateRange` rewritten Tunis-aware + range-capable (preset/single/range; invalid⇒open-ended upcoming); weekend-on-Sunday fixed.
- [apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx](../../apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx) — "Cette semaine → Voir tout" now links to the upcoming listing (removed the timezone-unsafe/hydration-unstable runtime range computation).
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — `events.listing.*` keys (title/empty/weekend/clear/dateFilter).
- Tests (Vitest): `filterParams.test.ts` (21), `EventDateFilter.test.tsx` (9), extended `events-extended.test.ts` (+9 incl. Sunday-weekend regression) — **71 passing**.
- Test config: `vitest.config.ts` (new test globs + React-dedupe aliases enabling the repo's first client component test under its React 18/19 dual-install — test-env only; app builds/runs on 19).

**Review findings breakdown.** 4 patches applied (3 medium, 1 low — see Review Triage Log): weekend-on-Sunday correctness, homepage See-all timezone/hydration fix, listing page-size 24→60, and an a11y group name. 1 deferred (listing pagination/count beyond page 1 → deferred-work.md). 10 rejected as noise/by-design/already-correct (incl. verifying all assumed i18n keys exist and that rdp v9 range selection works). No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0).

**Verification performed.**

- `yarn workspace @tiween/client test --run` → PASS (71/71).
- `yarn workspace @tiween/client typecheck` → 85 total errors = repo baseline, **0 in story-changed files** (0 net-new).
- `yarn workspace @tiween/client lint` → 0 errors in story files.
- `yarn workspace @tiween/client build` → the new `/[locale]/events` route reports `✓ Compiled successfully`; the whole-repo TS gate stops only on the pre-existing baseline red file `app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx:147` (not in this diff), exactly as documented for Story 3.11.

**Residual risks.**

- Not exercised against a live Strapi + seed (Strapi is not bootable in the unattended run); the date-range flow is verified by mocked-fetcher unit tests mirroring the 3.1a flat-query contract plus typecheck/build-compile. Recommend a `cd apps/strapi && yarn seed:fresh && yarn develop` + load `/fr/events?date=weekend` smoke check when an instance is available.
- Custom-range _calendar interaction_ is not driven in jsdom (no `user-event`/pointer-capture polyfills in the repo); range serialization is round-trip tested and rdp v9 selection semantics were verified by inspection.
- Listing shows page 1 only (60 events); load-more/pagination + a result count is deferred (ledger) — real at scale, harmless at MVP cinema volume.
- The whole-repo production build remains red on the pre-existing unrelated desktop-prototype file; making `next build` fully green is separate cleanup.
