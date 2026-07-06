---
title: "Venue Filtering (Story 3.5)"
type: "feature"
created: "2026-07-06"
status: "done"
baseline_revision: "f7f2db77093653fc08ec864d6d4142c2b20a1c43"
final_revision: "4394681396dc3f9b426eb62eab9bd82463717c3f"
review_loop_iteration: 0
followup_review_recommended: false
sprint_key: "3-5-venue-filtering"
depends_on:
  [
    "3-1-public-events-browse-api-and-data-foundation",
    "3-3-date-range-filtering",
    "3-4-region-and-city-filtering",
  ]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-1-public-events-browse-api-and-data-foundation.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-4-region-and-city-filtering.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The `/[locale]/events` listing filters by date (3.3) and region/city (3.4) but not by venue, yet the epic requires narrowing discovery "by venue/cinema" so a visitor can answer "what's playing **at this specific place**?". Two gaps: (1) the Story 3.1a public events endpoint accepts **no** `venue` param and never filters `event → venue`; (2) the shared `filterParams` only _round-trips_ `venue` (reserved, not acted on) and no venue picker is wired into the listing.

**Approach (cross-layer):** Backend — add an optional `venue` (Strapi `documentId`) param to the events-manager public browse endpoint, validated with the same `optionalDocumentId` preprocess as `city`/`region`, and translated in `buildFilters` into a relation filter on the event query (`venue.documentId`), **merged into the same `filters.venue` object** that city/region already populate so venue + location AND-combine. Frontend — promote `venue` in `filterParams` from reserved to acted-on; forward it through `fetchEvents`; build a **searchable** `EventVenueFilter` (shadcn Popover + Command/cmdk combobox) fed by the existing `getVenuesForSelector` data, with type-as-you-go client-side name search; wire it into the listing island + SSR page alongside the date and location filters; persist the last-selected venue to `localStorage` and reconcile-restore it **into the URL** on a fresh visit. No geolocation; no new backend popularity signal.

## Boundaries & Constraints

**Always:**

- Backend change is additive and minimal: extend the events-manager `listQuerySchema` with one optional `venue` param using the **existing** `optionalDocumentId` preprocess (`z.preprocess(trim→undefined, z.string().min(1).max(255).optional())`); thread it to the read service via the transparent `parsed.data` passthrough. Keep `EVENT_POPULATE` unchanged (filtering needs no new populate), keep error CODES and the v5 `data`/`meta.pagination` shape. Absent/blank/whitespace `venue` ⇒ no venue filter (never a 500).
- In `buildFilters`, venue must **merge with** city/region, not overwrite: build one `venue: Record<string,unknown>` object, set `venue.documentId = params.venue` when present, set `venue.cityRef = {...}` when city/region present, and assign `filters.venue = venue` once. The gate becomes `if (params.venue || params.city || params.region)`. Precedent: this is the same event-query relation-filter approach `search.ts`/3.4 use — never a foreign-UID `strapi.documents()` call.
- Frontend follows the established URL-state convention: RSC reads validated `searchParams` via `parseEventFilters`; the client island uses `useSearchParams` + `router.push(url,{scroll:false})` (`router.replace` only for mount-time restore). **No Zustand, no nuqs.** `venue` value is a locale-stable `documentId` (not a localized `slug`), so remembered/shared URLs stay valid across FR/EN/AR — matches `city`/`region`.
- The venue picker is **searchable**: reuse `getVenuesForSelector(locale)` (already returns `{documentId,name,type,city}[]`, `status:approved`, name-sorted, `pageSize:100`, 1h cache) as the data source and filter it **client-side** via cmdk `CommandInput` (no per-keystroke server round-trip). Build on the installed `components/ui/popover.tsx` + `components/ui/command.tsx`.
- `EventVenueFilter` mirrors `EventLocationFilter`'s contracts: all copy via localized `labels` props (no hardcoded strings), `onChange(value, { replace? })` signature, `localStorage` persist + **reconciled** restore-on-mount (drop a saved venue that no longer exists in the fetched list; purge storage when nothing survives; guard a single restore run and bail when `venues.length === 0` or a `venue` is already in the URL), a "clear"/"all venues" affordance, `role="group"` with accessible name, ≥44×44px touch targets (`min-h-11`), and an active-state highlight. Storage key `tiween.events.venue`.
- SSR the route; FR default, `ar` ⇒ `dir="rtl"` with localized labels; all copy via `getTranslations`/`useTranslations`. Venue names render as stored (venue proper nouns are not translated).
- Fail soft: a `getVenuesForSelector` failure (it already returns `[]` on error) renders the listing with the venue filter hidden (`if (venues.length === 0) return null`) — date and location filters still work, never a whole-page error. Same contract as the 3.4 location path.
- Persistence keeps the URL as the single source of truth: on selection save `{venue}` to `localStorage`; on a fresh `/events` visit with **no** `venue` param, reconcile-restore the saved value by updating the URL (`router.replace`, `scroll:false`), then the RSC filters from `searchParams` as usual.

**Block If:** (none — the relation-filter path, the venue-list data source, and the combobox primitives all exist and are precedented. The one thing to escalate rather than guess: if the `venue.documentId` relation filter cannot be expressed or returns wrong results against seeded data when combined with city/region in one `filters.venue` object, treat it as a genuine backend-capability gap.)

**Never:**

- No geolocation / "near me" and no distance-based ordering: the AC's "nearby venues" clause is **superseded** by the binding epic context, which defers geolocation to Story 3.9 / Phase 2 (same treatment 3.4 applied). Do not add location permission prompts or `navigator.geolocation`.
- No new backend popularity work this pass: no `eventCount`/`popularityScore` field on the venue content-type and no popularity sort. No such signal exists today, and the events endpoint cannot cheaply derive per-venue counts. The venue list ships **name-ordered** (the existing `name:asc`); true popularity ordering is deferred (see Design Notes). Do not fabricate a hardcoded "popular venues" list.
- No category (Story 3.2, deferred) filtering behavior; the listing may pass `category` through but must not act on it.
- Do not add an arbitrary `filters`/`populate` passthrough to the public endpoint; add only the one typed `venue` param.
- Do not introduce a cookie/SSR default that competes with the URL as source of truth; persistence only seeds the URL. Do not modify or restyle the existing `VenueSelector`, `EventCard`, `EventDateFilter`, or `EventLocationFilter`; do not rebuild the homepage.

## I/O & Edge-Case Matrix

| Scenario            | Input / State                               | Expected Output / Behavior                                                                                     | Error Handling                        |
| ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Venue selected      | `/events?venue=<docId>`                     | Only events whose `venue.documentId` matches, `startDateTime:asc`; venue shown active in the picker            | 200; empty state if none              |
| Venue + date/loc    | `/events?date=weekend&region=<r>&venue=<v>` | AND of all filters; `venue`+`cityRef` merged into one `filters.venue` object; all pickers reflect state        | 200                                   |
| Search in picker    | user types "pathé" in the combobox          | Client-side cmdk narrows the venue list by name; no server round-trip; selecting emits `{venue}`               | No error                              |
| Empty/unknown venue | `/events?venue=` or a bogus id              | Blank/whitespace ⇒ ignored (no venue filter); valid-but-unmatched id ⇒ empty slice; never a crash              | Graceful; preprocess trims blanks     |
| Remembered visit    | `/events` (no venue param) + `localStorage` | Client reconciles saved venue vs fetched list, restores surviving value into URL (`router.replace`); refilters | Graceful; one client URL update       |
| Venue fetch err     | `getVenuesForSelector` returns `[]`/throws  | Listing renders; venue filter hidden; date + location filters still usable                                     | Caught server-side, no whole-page 500 |
| RTL locale          | `ar`                                        | `dir="rtl"`, localized labels; venue proper names as stored                                                    | No error expected                     |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts` — add `venue: optionalDocumentId` to `listQuerySchema` (the `city`/`region` block ~L65-66); no other change (params forwarded via `parsed.data`).
- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` — add `venue?: string` to `FindEventsParams` and to the inline `buildFilters` param type; rewrite the location block (~L99-109) to build a single `venue` object merging `documentId` (venue) with `cityRef` (city/region). No `EVENT_POPULATE` change; `findEvent`/`findTrending` untouched.
- `apps/strapi/.../events-manager/server/src/{services,controllers}/__tests__/events.unit.test.ts` — extend: venue-only filter shape; venue+city merge shape; omitted ⇒ no venue filter; controller blank/whitespace-strip ⇒ `arg.venue` undefined.
- `apps/client/src/features/events/filters/filterParams.ts` — flip `venue` doc comments from "reserved" to "acted on (Story 3.5)"; parse/serialize already handle it (verify round-trip test still green).
- `apps/client/src/lib/strapi-api/content/events-extended.ts` — add `venue?` to `EventQueryParams`; add `...(venue ? { venue } : {})` to the `fetchEvents` forward block; update the stale "venue filtering out of scope" header/comment.
- `apps/client/src/lib/strapi-api/content/venues.ts` — **reuse** `getVenuesForSelector(locale)` (venues with `{documentId,name,type,city}`) as the picker data source; no change expected.
- `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx` — **NEW** `'use client'` searchable combobox (Popover + Command): `CommandInput` search box, `CommandItem` per venue, selected check, "all venues"/clear, active highlight, localized labels via props, ≥44px trigger; emits `{venue?}`; owns `localStorage` save + reconciled restore-on-mount (drives URL via `onChange`).
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — add `venues` prop + `venue` label sub-bundle; memoize `venueValue` from `activeFilters.venue`; add `handleVenueChange` mirroring `handleLocationChange` (spreads `...activeFilters`, serialize→`router.push`/`replace`); render `EventVenueFilter` as a sibling filter row.
- `apps/client/src/app/[locale]/events/page.tsx` — `getVenuesForSelector(locale)` in a fail-soft try/catch; forward `venue: filters.venue` to `fetchEvents`; add a `venue` label bundle; pass `venues` to `EventsListing`.
- `apps/client/src/app/[locale]/events/loading.tsx` — add a venue-filter skeleton chip row; keep `mb-6` on the last filter row before the grid.
- `apps/client/locales/{fr,en,ar}.json` — add `events.listing` venue keys (`venueFilter`, `allVenues`, `searchVenue`, `noVenueFound`) in FR/EN/AR.
- Tests: `apps/client/src/features/events/filters/filterParams.test.ts` (venue acted-on round-trip incl. empty), `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.test.tsx` (**NEW**), `apps/client/src/lib/strapi-api/content/events-extended.test.ts` (venue forwarded/omitted).

## Tasks & Acceptance

**Execution:**

- [x] `events-manager/.../services/events.ts` — add `venue?: string` to params; rewrite the location block to build one `venue` object (`venue.documentId` when venue present; `venue.cityRef` when city/region present) and assign `filters.venue` once; gate `if (params.venue || params.city || params.region)`. Unchanged otherwise.
- [x] `events-manager/.../controllers/events.ts` — add `venue: optionalDocumentId` to `listQuerySchema`; forwarded automatically. Blank/whitespace ⇒ ignored (no venue filter).
- [x] `events-manager/.../__tests__/events.unit.test.ts` (services + controllers) — cover venue-only shape (`filters.venue = { documentId }`), venue+city merge (`filters.venue = { documentId, cityRef: { documentId } }`), omitted ⇒ no venue filter, and controller blank/whitespace-strip.
- [x] `features/events/filters/filterParams.ts` — update `venue` doc comments to "acted on (Story 3.5)"; confirm parse/serialize round-trip (no behavior change needed).
- [x] `lib/strapi-api/content/events-extended.ts` — add `venue?` to `EventQueryParams`, forward to the endpoint, update the stale scope comment.
- [x] `features/events/components/EventVenueFilter/EventVenueFilter.tsx` — build searchable Popover+Command venue combobox (client-side name search, active highlight, clear/all-venues, ≥44px, localized labels via props); emit `{venue?}`; `localStorage` persist + reconciled restore-on-mount (restore uses `router.replace`, selections use `router.push`); `return null` when `venues` is empty.
- [x] `features/events/components/EventsListing/EventsListing.tsx` — add `venues` prop + venue labels; render `EventVenueFilter` with the date/location filters; on change `serializeEventFilters`→`router.push({scroll:false})` preserving other params.
- [x] `app/[locale]/events/page.tsx` + `loading.tsx` — `getVenuesForSelector(locale)` in a fail-soft try/catch; forward `venue` to `fetchEvents`; pass `venues`+labels to `EventsListing`; add the skeleton row.
- [x] `locales/{fr,en,ar}.json` — add the `events.listing` venue labels in FR/EN/AR.
- [x] Tests (Vitest) — `filterParams` venue acted-on round-trip incl. empty/malformed; `EventVenueFilter` renders venues, filters by search text, highlights active, emits/persists/reconciled-restores the expected value; `events-extended` forwards/omits `venue`.

**Acceptance Criteria:**

- Given a visitor on `/[locale]/events`, when they open the venue filter, then they see a searchable list of venues (from the geography/venues data) and can type to narrow it by name.
- Given a venue is selected, when the list re-queries, then only events at that venue are shown, ordered `startDateTime:asc`, and the active venue is highlighted in the picker.
- Given a venue filter is active, when the list renders, then the URL carries `venue` (`documentId`) and reloading/deep-linking that URL reproduces the same SSR-filtered list.
- Given a venue filter is combined with date and/or location filters, when the list renders, then only events matching **all** active filters are shown (venue AND location merge into one backend relation filter).
- Given the venue filter is active, when the visitor clears it, then all events (subject to any other active filters) are shown again and the venue param is removed from the URL.
- Given a returning visitor who previously chose a venue, when they open `/events` with no venue param, then their last venue is reconciled against the current list and, if still valid, restored (localStorage → URL) and applied.
- Given a chosen venue has no events, when the page renders, then the inline empty state is shown and the filter bar remains usable (never a whole-page error).
- Given the `ar` locale, when the listing renders, then layout is `dir="rtl"` with localized filter labels.

## Spec Change Log

## Review Triage Log

### 2026-07-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 1, low 1)
- defer: 1
- reject: 10
- addressed_findings:
  - `[medium]` `[patch]` **Dual restore-on-mount clobber.** On a fresh `/events` visit with a remembered venue **and** a remembered region/city, the location and venue filters each fired their once-only restore effect in the same commit, each serializing from the stale `activeFilters` prop and issuing a separate `router.replace`; the second call omitted the first's axis, so the last write silently dropped a remembered filter. Fixed in `EventsListing.tsx` by routing all three change handlers through a `pushFilters` helper that composes off a synchronously-updated `latestFiltersRef` (children-before-parents effect order means the concurrent restores now accumulate into one coherent URL); the ref resyncs to the URL-derived filters after each navigation.
  - `[low]` `[patch]` **RTL chevron margin.** The venue trigger's `ChevronsUpDown` used physical `ml-auto`, pinning it to the wrong edge under `dir="rtl"`; switched to logical `ms-auto` (the spec lists RTL as an invariant).
  - Deferred (1): the venue picker offers venues that can never match an MVP cinema-only event (non-cinema types, venues outside the active region/city, venues beyond the 100-row selector cap, and a mislabeled "All venues" trigger for an out-of-list URL venue) — all graceful empty-listing dead-ends whose real fixes need product decisions and/or a backend popularity/event-count signal. Logged to `deferred-work.md`.
  - Rejected (10, all low unless noted): skeleton reserves a venue row that vanishes on the empty-venues fail-soft path (cosmetic, rare — 3.4 rejected the identical finding); URL-forgeable `?venue=<non-approved-id>` (no unpublished-data leak; events stay `published`; city/region have no status guard either); "stale" category doc comment (verified coherent — `category` is correctly still reserved for deferred Story 3.2, `venue` correctly reclassified as acted-on); cmdk `onSelect`→emit path untested (documented jsdom option-commit limitation, same class 3.4 accepted; covered indirectly via clear + reconciled-restore); `EventVenueOption` declared twice vs. the fetcher's inline type (structural-compat maintainability nit); persisted venue re-applies on fresh visits (by design — the epic mandates remembered selection; `clear` persists empty so it is escapable, as 3.4 established); double-swallowed `getVenuesForSelector` error (fail-soft by design; observability nit); whitespace-only `?venue=%20` shows active client-side while the backend trims it (hand-crafted inconsistent URL, graceful — 3.4 precedent); array-valued `?venue=a&venue=b` ⇒ 400 (the existing spec-sanctioned malformed-query behavior, consistent with `sort`/`locale`); redundant history entry on re-selecting the already-active venue (harmless; 3.4 did not guard it either).

### 2026-07-06 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 1, low 0)
- defer: 1
- reject: 12
- addressed_findings:
  - `[medium]` `[patch]` **Combobox never announces the active venue.** The `EventVenueFilter` trigger hardcoded `aria-label={labels.groupLabel}`, which (unlike the sibling location Select, whose value is announced) shadowed the visible selected-venue text — a screen-reader user heard "Filtrer par salle" whether or not a venue was set and could not tell which venue was active. Fixed in `EventVenueFilter.tsx` by composing the accessible name from the selection (`${groupLabel}: ${selectedVenue.name}` when active, bare `groupLabel` when empty); test updated to assert the venue name reaches the trigger's accessible name. Tests 114/114 green; typecheck 85 = baseline (0 net-new); lint 0 errors.
  - Deferred (1): same-named venues are indistinguishable in the picker (each row renders only `venue.name`, discarding the fetched city context); proper fix needs `getVenuesForSelector` to return `cityRef` name for a secondary line — logged to `deferred-work.md` as a new entry, distinct from the venue-list-scoping/cap deferral already recorded.
  - Rejected (12): 100-venue-cap reconciliation purge of a valid saved venue (subsumed by the already-deferred over-cap dead-end); contradictory active-highlight-with-"All venues" label for an out-of-list URL venue (already deferred — deriving `active` from `selectedVenue` would remove the clear-chip escape hatch, a product tradeoff); venue list not scoped to the active region/city (already deferred); cmdk `onSelect` select→filter commit untested (documented jsdom limitation, already rejected in the first pass, covered indirectly); concurrent restore-on-mount ref race (already-documented residual risk, no concrete realistic failure, prior pass applied the composition fix and flagged follow-up); `next-env.d.ts` path edit (Next auto-regenerates this file; reverting risks churn); `aria-controls` dangling when the popover is closed (low; `aria-expanded` conveys state, widely tolerated); persisted venue re-applies on a fresh visit (by design per epic; already rejected); no existence check on `?venue=<id>` (by design — graceful empty, never 400; already rejected); dead `type`/`city` parity fields on `EventVenueOption` (pre-existing in unchanged `venues.ts`, not rendered); venue skeleton `w-40` vs trigger `min-w-[200px]` (cosmetic CLS; matches sibling skeletons; prior pass rejected an analogous skeleton nit); cmdk `value={documentId}` allowing ID-substring search matches (the unique `documentId` value is the correct key — `value={name}` would break selection for same-named venues; `keywords={[name]}` keeps name searchable).

## Design Notes

**Value encoding:** `venue` is a locale-stable `documentId`, not a localized `slug` — a remembered/shared URL stays valid across FR/EN/AR. Matches `city`/`region`/`search.ts`.

**Backend filter shape (event query) — merged object:**

```
venue only        => filters.venue = { documentId: venue }
city/region only  => filters.venue = { cityRef: { documentId: city, region: { documentId: region } } }   // unchanged from 3.4
venue + location  => filters.venue = { documentId: venue, cityRef: { documentId: city, region: {...} } }  // AND
```

Build one `venue` object and assign `filters.venue` **once** — a naive second `filters.venue = { documentId }` would clobber the 3.4 `cityRef` assignment (or be clobbered by it). A relation filter on the `event` query, never a foreign-UID `strapi.documents()` call, so the architecture's cross-plugin rule holds. When venue and a mismatched city/region are combined, the AND yields an empty slice (graceful 200) — consistent with the I/O matrix's "valid-but-unmatched ⇒ empty".

**Searchable picker:** the AC requires "search venues by name". `getVenuesForSelector` already fetches up to 100 approved venues name-sorted with a 1h cache; a client-side cmdk `CommandInput` filters that set with zero extra round-trips (fast, offline-friendly). This is why the picker is a Popover+Command **combobox**, not the plain `Select` used by `EventLocationFilter`/`VenueSelector`.

**"Popular / nearby at top" — scoped deferral (capability gap, not an omission):** the AC lists "popular/nearby venues appear at the top". _Nearby_ is geolocation, which the binding epic context defers to Story 3.9 / Phase 2 (the same deferral 3.4 applied to its "near me" line). _Popular_ has **no data signal in MVP**: there is no `eventCount`/`popularityScore` field on the venue content-type, no popularity sort on `getVenues`/the public endpoint, and the events endpoint cannot cheaply derive per-venue counts (it is paginated and venue-count-agnostic). Rather than fabricate a hardcoded list or take on out-of-scope venue-schema + sort work in this pass, the venue list ships **name-ordered** (the existing `name:asc`) and true popularity ordering is deferred to a follow-up that adds a backend popularity signal (mirroring the `trending` service's `sum(screening.ticketsSold)` pattern, but per venue). This keeps the story shippable in one pass while the load-bearing ACs (select→filter, search, combine, clear, deep-link, persist) all ship.

**Persistence:** `localStorage` seeds the URL only on an unfiltered fresh visit (`router.replace`), after which the RSC filters from `searchParams` normally — no cookie/SSR default that would fork the single source of truth. Restore is **reconciled**: a saved `venue` absent from the fetched list is dropped and storage purged (mirrors 3.4's stale-location handling).

**jsdom test limitation (inherited):** Radix Popover/Command portal open + option click is not drivable in jsdom (no pointer-capture/positioning), exactly as documented for the 3.3/3.4 Radix Select. Verify the `onChange` contract indirectly via the clear + reconciled-restore tests (which assert the typed payload) plus render/search-filter assertions; shim `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/`scrollIntoView` (and `ResizeObserver` if cmdk needs it) in `beforeAll`, and `vi.mock` lucide icons (incl. `Check`/`ChevronsUpDown`) as in `EventLocationFilter.test.tsx`.

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. new `filterParams`/`EventVenueFilter`/`events-extended` tests.
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in story-changed files (repo has a known pre-existing baseline).
- `yarn workspace @tiween/client lint` — expected: exit 0, no new errors.
- `yarn workspace @tiween/client build` — expected: the `/[locale]/events` route still compiles.
- `cd apps/strapi && yarn type-check && yarn test --testPathPattern events.unit` — expected: PASS incl. the new venue filter tests.

**Manual checks (if no CLI):**

- With Strapi running the 3.1a API (`cd apps/strapi && yarn seed:fresh && yarn develop`), `curl` `/api/events-manager/events?venue=<docId>` and `?region=<r>&venue=<v>` — expected: only events at that venue (and matching the location AND), never a 500 on a blank/bogus `venue`. In the browser, `/fr/events?venue=<docId>` and `/ar/events` — expected: correctly filtered showtime-ordered lists, searchable venue picker, active selection highlighted, RTL on `ar`, empty state on a venue with no events.

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.5 (Venue Filtering) as a cohesive cross-layer slice mirroring the 3.4 conventions. Backend: the events-manager public browse endpoint now accepts an optional `venue` (`documentId`) query param, validated via the existing `optionalDocumentId` preprocess and translated in `buildFilters` into a `venue.documentId` relation filter that **merges into the same `filters.venue` object** the city/region axis populates (built once, so venue + location AND-combine without clobbering) — never a foreign-UID call. Frontend: promoted the already-round-tripped `venue` in `filterParams` from reserved to acted-on, forwarded it through `fetchEvents`, and built a **searchable** `EventVenueFilter` (Popover + Command/cmdk combobox) fed by the existing `getVenuesForSelector` data, with client-side type-to-narrow, active highlight, clear, localStorage persistence + reconciled restore-into-URL, wired into the SSR `/[locale]/events` listing (URL stays the single source of truth). SSR + i18n + RTL. Geolocation "near me" and true popularity ordering are out of scope (epic-context Phase-2 deferral / no MVP popularity signal — the list ships name-ordered).

**Files changed.**

- [apps/strapi/.../events-manager/server/src/services/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/events.ts) — `buildFilters` builds one `filters.venue` object merging `documentId` (venue) with `cityRef` (city/region); `venue?` added to params; `EVENT_POPULATE` unchanged.
- [apps/strapi/.../events-manager/server/src/controllers/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts) — added `venue: optionalDocumentId` to `listQuerySchema`; threaded via `parsed.data`.
- [apps/client/src/features/events/filters/filterParams.ts](../../apps/client/src/features/events/filters/filterParams.ts) — `venue` doc comments flipped to "acted on (Story 3.5)"; parse/serialize already round-trip it.
- [apps/client/src/lib/strapi-api/content/events-extended.ts](../../apps/client/src/lib/strapi-api/content/events-extended.ts) — `venue?` added to `EventQueryParams` and forwarded; stale scope comment updated.
- [apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx](../../apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx) (+ `index.ts`) — NEW `'use client'` searchable Popover+Command venue combobox; localized labels, `onChange(value,{replace?})`, localStorage persist + reconciled restore-on-mount (`tiween.events.venue`), client-side name search, active highlight, `role="group"`, ≥44px, `return null` when empty.
- [apps/client/src/features/events/components/EventsListing/EventsListing.tsx](../../apps/client/src/features/events/components/EventsListing/EventsListing.tsx) — `venues` prop + venue label bundle; renders `EventVenueFilter`; all three filter handlers now compose via a `pushFilters`/`latestFiltersRef` base (review patch — see below).
- [apps/client/src/app/[locale]/events/page.tsx](../../apps/client/src/app/[locale]/events/page.tsx) & [loading.tsx](../../apps/client/src/app/[locale]/events/loading.tsx) — `getVenuesForSelector(locale)` in a fail-soft try/catch; forwards `venue` to `fetchEvents`; venue label bundle; passes `venues`; venue skeleton row.
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — `events.listing` venue labels (`venueFilter`, `allVenues`, `searchVenue`, `noVenueFound`) in all three locales.
- [apps/client/vitest.config.ts](../../apps/client/vitest.config.ts) — added `EventVenueFilter` to `include` and inlined `cmdk`/`@floating-ui` so the Popover+Command combobox renders under the single aliased React copy in jsdom.
- Tests: `filterParams.test.ts` (+4 venue acted-on), `events-extended.test.ts` (+2 venue forward/omit), NEW `EventVenueFilter.test.tsx` (15), backend `events.unit` services+controllers (+6 venue-only/merge/omit/blank-strip).

**Review findings breakdown.** 2 patches applied (1 medium: dual restore-on-mount clobber that silently dropped a remembered filter when both venue and location were saved — fixed by composing all three handlers through a synchronously-updated `latestFiltersRef`; 1 low: RTL chevron `ml-auto`→`ms-auto`). 1 deferred (venue-list completeness — non-cinema/out-of-area/over-cap venues dead-end to graceful empty; logged to `deferred-work.md`). 10 rejected as by-design / graceful / jsdom-precedent / verified-coherent / cosmetic. No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0). `followup_review_recommended: true` — the restore-composition patch reworks all three filter URL-writers on subtle React effect-ordering and has data-correctness stakes without a direct concurrent-restore test.

**Verification performed.**

- `yarn workspace @tiween/client test --run` → PASS (114/114) after the patches.
- `yarn workspace @tiween/client typecheck` → 85 total = repo baseline, **0 net-new** in story-changed files.
- `yarn workspace @tiween/client lint` → exit 0 (no errors in changed files).
- `yarn workspace @tiween/client build` → `/[locale]/events` `✓ Compiled successfully`; the whole-repo TS gate stops only on the pre-existing baseline red file `app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx:147` (not in this diff), exactly as documented for 3.3/3.4/3.11.
- `cd apps/strapi && yarn type-check` → clean; `events.unit` → 42/42 (36 baseline + 6 new; run via a temporary CJS mirror of `jest.config.ts` since `ts-node` is absent in this environment — an env tooling gap, not a code issue; the temp file was removed).

**Residual risks.**

- Not exercised against a live Strapi + seed (not bootable here); the merged cross-plugin relation filter is verified by mocked-service unit tests asserting the exact `filters.venue = { documentId, cityRef: {...} }` shapes. Recommend a `yarn seed:fresh && yarn develop` + `curl '/api/events-manager/events?venue=<docId>'` and `?region=<r>&venue=<v>` smoke check when an instance is available.
- The cmdk `onSelect` option-commit is not driven in jsdom (documented limitation); selection→emit is covered indirectly via the clear + reconciled-restore `onChange` assertions.
- The concurrent restore-composition fix relies on React firing child effects before parent effects (correct in React 18); no direct test drives two simultaneous mount-restores. Flagged for the recommended follow-up review.
- Venue-list completeness (non-cinema/out-of-area/over-cap venues) degrades to a graceful empty listing — an intentional, deferred scoping decision (see `deferred-work.md`), not a correctness defect.

### 2026-07-06 — Follow-up review pass

A fresh adversarial + edge-case review of the final branch surfaced 14 findings (deduped). Triage: **1 patch, 1 defer, 12 reject** (no intent_gap, no bad_spec; `review_loop_iteration` stayed 0).

- **Patch (1, medium).** The `EventVenueFilter` combobox trigger hardcoded `aria-label={labels.groupLabel}`, so assistive tech announced only "Filtrer par salle" and never the _selected_ venue (the sibling location Select announces its value). Fixed by composing the accessible name from the selection — `${groupLabel}: ${selectedVenue.name}` when a venue is active, bare `groupLabel` otherwise — in `EventVenueFilter.tsx`, with `EventVenueFilter.test.tsx` updated to assert the venue name reaches the trigger's accessible name.
- **Defer (1).** Same-named venues are indistinguishable in the picker (rows render only `venue.name`); a proper fix needs `getVenuesForSelector` to return `cityRef` context for a secondary line. Logged as a new `deferred-work.md` entry.
- **Reject (12).** Already-deferred venue-list dead-ends (over-cap purge, out-of-list "All venues" label, region/city scope), already-rejected by-design items (jsdom select-commit coverage, persisted-venue re-apply, no-existence-check 400), the documented concurrent-restore residual risk, the Next-managed `next-env.d.ts` edit, cosmetic skeleton width, dangling `aria-controls`, dead parity fields, and the deliberate `value={documentId}` cmdk key (name-as-value would break same-name selection).

**Verification (follow-up).** `yarn workspace @tiween/client test --run` → PASS (114/114); `yarn workspace @tiween/client typecheck` → 85 errors = repo baseline, **0 net-new**, 0 in changed files; `yarn workspace @tiween/client lint` → 0 errors. The patch is a localized accessibility-label change with no behavior/API/data impact, so `followup_review_recommended` is set to `false`.
