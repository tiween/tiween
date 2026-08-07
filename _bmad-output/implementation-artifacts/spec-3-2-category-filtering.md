---
title: "Category Filtering (Story 3.2)"
type: "feature"
created: "2026-08-07"
status: "done"
baseline_revision: "c05bfdbc60c1deeeca56642737cba05745c85f00"
review_loop_iteration: 0
followup_review_recommended: false
sprint_key: "3-2-category-filtering"
depends_on:
  [
    "3-1-public-events-browse-api-and-data-foundation",
    "3-3-date-range-filtering",
    "3-4-region-and-city-filtering",
    "3-5-venue-filtering",
  ]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-4-region-and-city-filtering.md"
warnings: ["oversized"]
deferred:
  - summary: >-
      The trending ranking metric (sum of screening.ticketsSold) is obsolete for
      the aggregation-only v1 and structurally biases against non-cinema events.
    evidence: |-
      findTrending was widened to all categories (Story 3.2), but it still ranks
      by sum(screening.ticketsSold). Concerts/exhibitions have no screenings and
      always sum to 0, and in the aggregation-only v1 no tickets are sold at all,
      so every event sums 0 and the ranking degenerates to startDateTime order.
      The metric needs a post-pivot rethink (views, watchlist adds, or editorial
      curation) — related to the existing DW-19 durable-rollup deferral.
    location: >-
      apps/strapi/src/plugins/events-manager/server/src/services/events.ts (findTrending)
    severity: low
  - summary: >-
      The public browse reads (findEvents/findEvent/findTrending) — including the
      new cinema/shorts nested relation filters — have no integration coverage
      against a real Strapi query engine.
    evidence: |-
      Every backend test mocks strapi.documents().findMany and asserts the built
      filter object's shape, which is self-referential: if the Document Service
      does not interpret `screenings: { movie: { type } }` as "has ≥1 matching
      screening" (or a Strapi upgrade changes deep-relation semantics — the repo
      just moved to 5.51.2), the Cinéma/Courts-métrages tabs return wrong rows
      while all suites stay green. The repo's opt-in boot integration suite
      (`yarn test:integration`, `*.controller.test.ts`) covers only the admin
      endpoints — no public-read case exists at all. Distinct from the generic
      "integration suites don't boot in this env" limitation (DW-5/DW-45): the
      fix is adding public findEvents cases (seed a film event, a short-film
      event, a screening-less movie_screening event; assert ?category=cinema and
      ?category=shorts each return exactly their own row) to the existing boot
      suite. Surfaced by the Verification Gap and Edge Case reviewers (2026-08-07
      follow-up pass); a live curl check was not possible in this run (no
      running Strapi).
    location: >-
      apps/strapi/src/plugins/events-manager/server/src/services/events.ts (CATEGORY_FILTERS/buildFilters)
    severity: medium
  - summary: >-
      Non-cinema event detail pages reuse the cinema-shaped "no screenings"
      empty state, which reads wrong for concerts/exhibitions.
    evidence: |-
      The 3.2 widening deliberately makes screening-less concert/exhibition
      events reachable on the detail route, and
      EventDetailPage.noncinema.test.tsx locks in that they render the
      `noShowtimes` copy ("Aucune séance disponible") — semantically wrong for
      events that never have screenings. The 3.2 intent scopes the story to the
      listing and only requires the detail page to render (no cinema-only 404),
      so a category-aware detail treatment (neutral or per-category empty
      state/copy) is follow-up work. Surfaced by the Blind Hunter (2026-08-07
      follow-up pass).
    location: >-
      apps/client/src/features/events/components/EventDetailPage
    severity: low
---

<intent-contract>

## Intent

**Problem:** The 2026-08-06 pivot makes v1 a multi-category aggregation platform, but the public browse API hard-codes `category: "movie_screening"` into every read (list, detail, trending) and the `/[locale]/events` listing has no category control — `category` is parsed from the URL but explicitly "reserved, not filtered on". Visitors cannot see, let alone filter, theater/concert/exhibition content, which is the core of the widened v1.

**Approach (cross-layer):** Backend — replace the hard-coded cinema scope with an optional, allowlisted `category` query param on the list endpoint (absent ⇒ all categories) and drop the cinema-only gate from the detail and trending reads. The five discovery tokens (`cinema|theater|shorts|music|exhibitions`) translate in `buildFilters` to enum/relation filters (see Design Notes; `shorts` needs `screenings.movie.type`). Frontend — promote `category` in `filterParams` from reserved to a validated, acted-on token; wire the existing `CategoryTabs` component into the listing via a new `EventCategoryFilter` wrapper (URL-driven, yellow-highlighted active tab, no full reload — same RSC re-fetch mechanism as date/location/venue) with sessionStorage same-session persistence; un-scope the listing's venue combobox from cinema-only; seed a few concert/exhibition events so every tab is exercisable.

## Boundaries & Constraints

**Always:**

- Backend change is additive on the established Story 3.1a–3.6 pattern: extend `listQuerySchema` with `category: z.enum(["cinema","theater","shorts","music","exhibitions"]).optional()` (present-but-unknown ⇒ existing 400 `INVALID_QUERY`, absent ⇒ no category filter), thread it through `FindEventsParams` into `buildFilters`, keep error CODES and the v5 `data`/`meta.pagination` shape. The `shorts`/`cinema` translation is a relation filter on the event query — never a foreign-UID `strapi.documents()` call.
- Removing the cinema-only scope applies to all three public reads: `buildFilters` (list — default becomes all categories minus the existing `eventStatus != cancelled` rule), `findEvent` (detail — any published event resolves; a theater event reached from the widened list must not 404), `findTrending` (drop `category` from its filter; cache key/TTL untouched). Delete the now-false "MVP is cinema only" comments; update the unit tests that assert cinema-only.
- Frontend follows the fixed URL-state convention: RSC parses validated `searchParams`; the island writes URLs via the existing `pushFilters` (`router.push`, `scroll:false`); `filterParams` validates `category` against the five tokens (anything else dropped ⇒ no filter, like `date`) and keeps round-tripping all other params.
- Reuse the existing `CategoryTabs` component (`features/events/components/CategoryTabs`) — do not rebuild it. Wrap it in a new `EventCategoryFilter` that maps token ↔ `CategoryType` (`"all"` ⇔ no `category` param), passes localized labels via props (no hardcoded strings; add an optional accessible-name prop to `CategoryTabs` so its hardcoded `aria-label="Event categories"` becomes localizable), and owns sessionStorage persistence: save on change; on mount with no URL `category`, restore a valid saved token into the URL (`replace`, like 3.4/3.5), purging invalid/stale values. Session-only (`sessionStorage`, NOT `localStorage`) — the epic requires persistence "during the session", not across sessions.
- The active tab must render highlighted in yellow: the component's active state uses `border-primary text-primary`; verify the listing surface resolves `--primary` to Tiween Yellow (as elsewhere in the app) — do not introduce hardcoded hex values.
- Un-scope the listing's venue combobox: `getVenuesForSelector` accepts `type: null` (⇒ omit the `type` param; backend selector already treats absent as "all types"), and `/[locale]/events/page.tsx` passes it. Homepage callers keep their existing default.
- Extend the dev seed with a handful of standalone `concert` and `exhibition` events (no screenings needed) so Musique/Expositions return data after `yarn seed:fresh`.
- SSR + i18n: FR/EN/AR labels via `getTranslations` under `events.listing`; RTL must keep working (CategoryTabs already handles RTL fades). Fail-soft everywhere: filter errors degrade to the inline empty state, never a whole-page 500.

**Block If:** the nested `screenings.movie.type` relation filter cannot be expressed or returns wrong results against seeded data — that is a backend-capability gap, not a spec choice.

**Never:**

- No geolocation (Story 3.9, deferred) and no purchase-surface changes (Story 3.12 owns the ticketing gate).
- No homepage/StickyFilters/prototype rework — this story touches the `/[locale]/events` listing only (plus the shared backend reads it sits on).
- No new state library (no Zustand/nuqs); the URL stays the single source of truth — sessionStorage only seeds it.
- Do not remove or rename the `MVP_CATEGORY` export's usages in ways that break unrelated modules silently — delete the constant only if nothing else imports it.

## I/O & Edge-Case Matrix

| Scenario            | Input / State                                                                              | Expected Output / Behavior                                                                                | Error Handling                    |
| ------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Tab selected        | Tap "Théâtre" on `/fr/events`                                                              | URL becomes `?category=theater`; list shows only `theater_performance` events; tab highlighted; no reload | 200; inline empty state if none   |
| "Tout" selected     | Tap "Tout" with `?category=theater` active                                                 | `category` removed from URL; all categories listed                                                        | No error expected                 |
| Shorts tab          | `/events?category=shorts`                                                                  | Only `movie_screening` events with ≥1 screening whose movie `type="short-film"`                           | 200; empty state if none          |
| Cinema tab          | `/events?category=cinema`                                                                  | Only `movie_screening` events with ≥1 screening whose movie `type="film"`                                 | 200                               |
| Combined filters    | `?category=theater&date=weekend&region=<docId>`                                            | AND of all filters; every control reflects its state                                                      | 200                               |
| Invalid token (FE)  | `/events?category=bogus`                                                                   | Dropped by `parseEventFilters` ⇒ no category filter; "Tout" active; not forwarded to the API              | Graceful, no crash                |
| Invalid token (BE)  | Direct API call `?category=bogus`                                                          | 400 `INVALID_QUERY` (schema enum), same as an invalid `eventStatus`                                       | Error code, never 500             |
| Session persistence | Pick "Musique", navigate away, return to `/events` (same tab session, no `category` param) | Saved token restored into the URL via `replace`; list filtered                                            | Invalid saved value purged, no-op |
| Non-cinema detail   | Click a theater event card                                                                 | Detail page renders (no cinema-only 404)                                                                  | 404 only for truly missing events |
| `other` category    | Event with `category="other"`                                                              | Visible under "Tout" only (no dedicated tab)                                                              | No error expected                 |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` — `MVP_CATEGORY` (line ~21) hard-coded into `buildFilters` (~176), `findEvent` (~326), `findTrending` (~372). Add `category?: DiscoveryCategory` to `FindEventsParams`; translate tokens in `buildFilters` (see Design Notes); drop the cinema gates in `findEvent`/`findTrending`. `filters.screenings` is a new key — the search `$or` (~227) nests screenings under `$or`, so no clobber.
- `apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts` — `listQuerySchema` (~68): add the `category` enum param, mirroring `eventStatus`; thread to the service.
- `apps/strapi/src/plugins/events-manager/server/src/{services,controllers}/__tests__/events.unit.test.ts` — update cinema-only assertions; add: each token's filter shape, absent ⇒ no category filter, invalid ⇒ 400, non-cinema detail resolves, trending includes non-cinema.
- `apps/strapi/scripts/seeds/index.ts` — event creation (~450): after the works-driven loop, add a small block seeding standalone `concert`/`exhibition` events (title/venue/dates, `eventStatus: "scheduled"`, no screenings), idempotent by slug like existing seeds.
- `apps/client/src/features/events/filters/filterParams.ts` — `category` currently `readReserved` (~158): validate against the five tokens; update the header comment (no longer "deferred Story 3.2").
- `apps/client/src/features/events/components/CategoryTabs/CategoryTabs.tsx` — reuse as-is; add optional `ariaLabel` prop (default "Event categories") for i18n.
- `apps/client/src/features/events/components/EventCategoryFilter/EventCategoryFilter.tsx` — **NEW** `'use client'` wrapper: token ↔ `CategoryType` mapping, localized `CategoryTabsLabels` via props, sessionStorage save/restore-on-mount (mirror `EventLocationFilter`'s reconcile-then-replace pattern), emits `{ category?: string }`.
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — render `EventCategoryFilter` above the date filter row (~189); add `handleCategoryChange` through `pushFilters`/`latestFiltersRef` (~136); update the island doc comment.
- `apps/client/src/lib/strapi-api/content/events-extended.ts` — add `category?` to `EventQueryParams`; forward in `fetchEvents` (~185).
- `apps/client/src/lib/strapi-api/content/venues.ts` — `getVenuesForSelector` (~375): accept `type: VenueType | null` (`null` ⇒ omit param); default `"cinema"` unchanged for other callers.
- `apps/client/src/app/[locale]/events/page.tsx` — forward `filters.category` to `fetchEvents` (~154); pass `type: null` to `getVenuesForSelector` (~131) and drop the stale DW-24 cinema-scope comment; extend `buildLabels` with the category label group; update route doc comment.
- `apps/client/src/app/[locale]/events/loading.tsx` — add a category-tabs skeleton row.
- `apps/client/locales/{fr,en,ar}.json` — add `events.listing` category keys (group label + `all`/`cinema`/`theater`/`shorts`/`music`/`exhibitions`; FR: Tout/Cinéma/Théâtre/Courts-métrages/Musique/Expositions).
- Tests: `filterParams.test.ts` (extend), `EventCategoryFilter.test.tsx` (**NEW**), `events-extended.test.ts` (extend: category forwarded).

## Tasks & Acceptance

**Execution:**

- [x] `events-manager/.../services/events.ts` — add `category` to `FindEventsParams`; translate the five tokens in `buildFilters` per Design Notes (absent ⇒ no category filter); remove the cinema gate from `findEvent` and the `category` filter from `findTrending`; retire the "MVP is cinema only" comments (and `MVP_CATEGORY` itself if unreferenced).
- [x] `events-manager/.../controllers/events.ts` — add `category` enum param to `listQuerySchema`; thread to the service (invalid ⇒ 400 `INVALID_QUERY`).
- [x] `events-manager/.../__tests__/events.unit.test.ts` (services + controllers) — update cinema-only assertions; cover the I/O matrix's backend rows.
- [x] `apps/strapi/scripts/seeds/index.ts` — seed idempotent standalone `concert` + `exhibition` events so all five tabs return data.
- [x] `features/events/filters/filterParams.ts` — validate `category` against the five tokens (invalid ⇒ dropped); refresh comments.
- [x] `features/events/components/CategoryTabs/CategoryTabs.tsx` — add optional `ariaLabel` prop.
- [x] `features/events/components/EventCategoryFilter/EventCategoryFilter.tsx` — build the wrapper (mapping, labels, sessionStorage persist + validated restore via `replace`).
- [x] `features/events/components/EventsListing/EventsListing.tsx` — wire `EventCategoryFilter` through `pushFilters` alongside the other filters.
- [x] `lib/strapi-api/content/events-extended.ts` + `lib/strapi-api/content/venues.ts` — forward `category`; support `type: null` un-scoping in `getVenuesForSelector`.
- [x] `app/[locale]/events/page.tsx` + `loading.tsx` — forward `category` to `fetchEvents`; un-scope the venue selector; category labels; skeleton row.
- [x] `locales/{fr,en,ar}.json` — category label keys in all three locales.
- [x] Tests (Vitest) — `filterParams` category validation round-trip; `EventCategoryFilter` renders tabs, maps active token, emits on change, persists/restores/purges; `events-extended` forwards `category`.

**Acceptance Criteria:**

- Given a visitor on `/[locale]/events`, when they tap a category tab (Cinéma, Théâtre, Courts-métrages, Musique, Expositions), then the list shows only that category's events, the URL reflects it (e.g. `/events?category=cinema`), the active tab is highlighted in yellow, and no full page reload occurs (client navigation + RSC re-fetch).
- Given "Tout" is tapped, when the list re-renders, then events of all categories appear and no `category` param remains in the URL.
- Given a category is active, when the visitor navigates away and returns to `/events` in the same browser session without a `category` param, then the selection is restored into the URL and applied; a new session starts at "Tout".
- Given category + date + location/venue filters together, when the list renders, then all filters AND-combine and each control reflects its state.
- Given a non-cinema event surfaced by the widened list, when its card is clicked, then its detail page renders (no cinema-only 404), and the homepage trending slice may include non-cinema events.
- Given `yarn seed:fresh`, when each tab is selected, then every tab (including Musique and Expositions) returns at least one event.
- Given the `ar` locale, when the listing renders, then the tabs show localized labels with correct RTL behavior.

## Spec Change Log

## Review Triage Log

### 2026-08-07 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 2, low 4)
- defer: 1: (high 0, medium 0, low 1)
- reject: 13: (high 0, medium 0, low 13)
- addressed_findings:
  - `[medium]` `[patch]` The route-level category wiring had no test on either side: deleting `category: filters.category,` from the `page.tsx` `fetchEvents` call broke nothing in the suite. Added `app/[locale]/events/page.test.tsx` (4 tests): valid token forwarded, bogus token ⇒ no category key, absent ⇒ no category, venue selector called with `type: null`.
  - `[medium]` `[patch]` The island's category↔URL merge (`handleCategoryChange` through `latestFiltersRef`) was untested — a one-line regression could wipe sibling filters on tab click. Added `EventsListing.test.tsx` (3 tests): sibling-axis preservation on tab click, sessionStorage restore via `router.replace` (never `push`), "Tout" removes the param while keeping `date`.
  - `[low]` `[patch]` `getVenuesForSelector`'s new `type: null` ⇒ omit-param behavior was asserted nowhere (a `type ?? "cinema"` slip would silently re-scope the picker to cinemas). Added a test asserting `fetchAPI` receives no `type` property.
  - `[low]` `[patch]` The widened `findEvent` surfaces screening-less non-cinema events whose detail rendering was unverified. Added `EventDetailPage.noncinema.test.tsx`: a `concert` event with `screenings: []` and no movie renders through the real mappers and shows the `noShowtimes` empty state.
  - `[low]` `[patch]` The five-token vocabulary was duplicated between the service's `DiscoveryCategory` union and the controller's inline `z.enum`. Service now exports `DISCOVERY_CATEGORIES` (readonly tuple); the union and the controller's `z.enum` derive from it.
  - `[low]` `[patch]` The pre-existing "Parsed, validated filter state" JSDoc in `filterParams.ts` had been orphaned above the inserted `CATEGORY_TOKENS` block; moved the block so the comment sits back on `EventFilters`.
  - Note: applying patch tests exposed that `apps/client/vitest.config.ts` uses an include allowlist that silently excluded the new test locations — the first-pass `EventCategoryFilter.test.tsx` had never run. Three include globs added; the client suite grew 935 → 954 tests, all passing.
  - Rejected (13, all low): `EventQueryParams.category` as a token union (would need a lib→features layering violation; runtime validation exists on both sides); `CategoryTabs` English default labels/aria for other consumers (pre-existing opt-in i18n; the listing passes localized labels); stale sessionStorage token not purged on filtered mounts (never restored while invalid, purged on the next unfiltered mount — zero user consequence); seed realism (concerts at cinema venues — dev-data cosmetics, same pool the theater seeds already use); no aria-live announce on filter change (pre-existing pattern shared by all three sibling filters since 3.3); `venuesTruncated` copy nuance (cosmetic); missing BMad tracking artifacts in the diff (the workflow's finalize step owns spec commit/status); unknown token reaching `buildFilters` from a hypothetical non-controller caller (module-private, type-constrained, and the fallback is the benign all-categories); seed `venueSlugs` empty guard (pre-existing pattern, dev script); `MVP_CATEGORY` external importers (grep-verified none; strapi typecheck green); seed `total` conflating target and actuals (dev-script log cosmetics); mixed-event both-tabs semantics unverified against a live Strapi query engine (documented residual risk, precedent from 3.4's identical limitation); yellow-highlight AC verified only via inherited `border-primary` styling (implementer verified `--primary` resolves to Tiween Yellow globally).

### 2026-08-07 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 2: (high 0, medium 1, low 1)
- reject: 17: (high 0, medium 0, low 17)
- addressed_findings:
  - `[low]` `[patch]` The `loading.tsx` category-tabs skeleton row (six `w-24` skeletons, ~576px) sat in a plain `flex gap-1` and horizontally overflowed the page on mobile, where the loaded tabs scroll inside `no-scrollbar overflow-x-auto`. Wrapped the skeleton row in the same `no-scrollbar -mx-4 overflow-x-auto px-4` treatment.
  - `[low]` `[patch]` Three comments left claiming the pre-3.2 world, against the spec's "delete the now-false cinema-only comments" instruction: `lib/strapi-api/content/search.ts` (`POPULAR_SEARCHES` justified by "MVP is cinema-only … `movie_screening`-scoped browse endpoint"), `lib/strapi-api/content/events.ts` (wrapper header said the endpoint "supports flat date/featured/pagination params only" and category filtering "is not implemented"), and `app/[locale]/page.tsx` ("filtering itself is Story 3.2" — now shipped, and homepage wiring was deliberately out of 3.2's scope). All three rewritten to describe the post-3.2 state; no runtime changes.
  - Deferred (2): public browse reads' relation filters never executed against a real query engine (medium — added to frontmatter `deferred`); non-cinema detail pages reuse the cinema "no screenings" empty-state copy (low — added to frontmatter `deferred`).
  - Rejected (17, all low): sprint-status/spec/epic-context state disagreement (workflow artifacts owned by finalize/orchestrator; epic context is a regenerable cache); empty Spec Change Log heading (template section, legitimately empty — no bad_spec loopback has occurred); homepage trending untested with screening-less events (refuted — `eventMappers.test.ts` covers screening-less defensiveness on the card path); no automated RTL/AR test (manual check listed in spec; same coverage posture as all sibling filters); `CategoryTabs` English defaults for other consumers (re-reject from first pass — opt-in i18n, listing passes localized labels); `EventQueryParams.category` typed `string` (re-reject — layering; runtime validation on both sides); FE/BE invalid-token asymmetry seam test (same root as previous — `parseEventFilters` is the tested seam); seed `venueSlugs` empty-modulo guard (re-reject — dev script, pre-existing pattern); seed `total` conflation (re-reject — log cosmetics); exhibition `endDateTime` seed realism (dev-data cosmetics); no aria-live on filter change (re-reject — pre-existing shared pattern across all filter axes, epic-wide a11y concern); OpenAPI/documented-types drift for the new param (already ledgered as stale docs — orchestrator-owned); mount-restore ref race between category/location restores (refuted — `pushFilters` updates `latestFiltersRef.current` synchronously, and the code comments document exactly this design); duplicate `router.push` when re-clicking the active tab (pre-existing sibling-filter pattern, benign no-op refetch); unknown token spread `{}` in `buildFilters` (re-reject — module-private, type-constrained, benign fallback); StrictMode double restore (dev-only and idempotent — same URL via `replace`); `yarn build` fails at the TS gate on `desktop-prototypes/ticketing-quantity/page.tsx` (pre-existing baseline, untouched since epic 1, already ledgered as DW-185).

## Design Notes

**Token → filter translation (`buildFilters`):**

```
cinema      => { category: "movie_screening", screenings: { movie: { type: "film" } } }
shorts      => { category: "movie_screening", screenings: { movie: { type: "short-film" } } }
theater     => { category: "theater_performance" }
music       => { category: "concert" }
exhibitions => { category: "exhibition" }
absent      => (no category filter — "Tout")
```

**Why URL/UI tokens, mapped in the backend:** the epic AC fixes the URL vocabulary (`?category=cinema`), and `shorts` has no event-enum equivalent — Cinéma vs Courts-métrages is a `creative-work.type` distinction (`film` vs `short-film`) below the event's `movie_screening` category. Accepting the five discovery tokens at the endpoint keeps the client mapping-free and the translation in one place. The UX content pillars list Cinema and Short Films as separate pillars, so the tabs partition: Cinéma = events with a feature-film screening, Courts-métrages = events with a short-film screening (a mixed event legitimately matches both). This means a screening-less `movie_screening` event appears under "Tout" but neither cinema tab — acceptable: real ingest always attaches screenings. Enum `other` has no tab by design.

**Persistence:** `sessionStorage` (not `localStorage`) because the epic constraint is "persisted for the session (not across sessions)" — deliberately different from 3.4's location, whose epic mandate is "remembered across visits". Restore only seeds the URL (`router.replace`, no-URL-param case only), preserving the URL as the single source of truth; invalid saved tokens are purged (3.4's reconcile precedent).

**Widened reads:** dropping `MVP_CATEGORY` from list/detail/trending is the pivot's core: the cinema-only invariant it encoded is now false planning-wise. Detail must widen with the list (otherwise this story ships clickable cards that 404), and trending stays consistent with what the platform now aggregates.

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. new `EventCategoryFilter` + extended `filterParams`/`events-extended` tests.
- `yarn workspace @tiween/client typecheck` — expected: 0 net-new errors in story-changed files (known pre-existing baseline).
- `yarn workspace @tiween/client lint` — expected: 0 errors in story files.
- `yarn workspace @tiween/client build` — expected: `/[locale]/events` compiles.
- `cd apps/strapi && yarn type-check && yarn test --testPathPattern events.unit` — expected: PASS incl. category filter shapes, widened detail/trending.

**Manual checks (if no CLI):**

- With Strapi seeded + running: `curl "/api/events-manager/events?category=theater"` returns only theater events; `?category=bogus` returns 400; no `category` param returns mixed categories. In the browser, `/fr/events` tabs filter without reload, `/ar/events` renders RTL, and a theater event's detail page loads.

## Auto Run Result

Status: done

**Run type:** follow-up review pass (spec entered this run as `done` with `followup_review_recommended: true`; per step-01 a `done` spec gets a fresh review, `review_loop_iteration` reset to 0).

**Summary of implemented change:** No feature changes — this pass re-reviewed the full Story 3.2 diff (baseline `c05bfdbc60c1deeeca56642737cba05745c85f00` → working tree, 30 files) with four parallel reviewers (blind hunter, edge-case hunter, verification-gap, intent-alignment) and applied two low-severity patches.

**Files changed (this pass):**

- `apps/client/src/app/[locale]/events/loading.tsx` — category-tabs skeleton row wrapped in `no-scrollbar -mx-4 overflow-x-auto px-4` so the loading state no longer overflows the viewport on mobile.
- `apps/client/src/lib/strapi-api/content/search.ts` — retired the now-false "MVP is cinema-only" justification on `POPULAR_SEARCHES` (comment only).
- `apps/client/src/lib/strapi-api/content/events.ts` — legacy-wrapper header rewritten: the endpoint now supports category/location filtering; these wrappers still ignore those options by design (comment only).
- `apps/client/src/app/[locale]/page.tsx` — stale "filtering itself is Story 3.2" homepage comment rewritten to reflect that 3.2 shipped on the listing and homepage wiring was out of scope (comment only).
- `_bmad-output/implementation-artifacts/spec-3-2-category-filtering.md` — triage log entry, two new frontmatter `deferred` items, this section.

**Review findings breakdown:** patch 2 (both low, both applied), defer 2 (1 medium: public browse relation filters never executed against a real query engine; 1 low: non-cinema detail reuses cinema empty-state copy — both appended to frontmatter `deferred`), reject 17 (all low; includes two refuted claims — the mount-restore ref race and the untested homepage card path — plus re-rejects from the first pass and the DW-185-ledgered baseline build failure). No intent_gap, no bad_spec.

**Follow-up review recommendation:** `false`. Patched this pass: high 0, medium 0, low 2 → score = 3×0 + 1×2 = 2 (< 5, no high).

**Verification performed (after patches):**

- `yarn workspace @tiween/client test --run` — PASS, 954/954.
- `yarn workspace @tiween/client typecheck` — exits non-zero on the known pre-existing baseline only; zero errors in story-changed or patched files.
- `yarn workspace @tiween/client lint` — PASS (exit 0).
- `yarn workspace @tiween/client build` — compile phase succeeds ("Compiled successfully", `/[locale]/events` included); the build then fails at the TypeScript gate on `desktop-prototypes/ticketing-quantity/page.tsx:146`, a file untouched since epic 1 — the pre-existing baseline failure already ledgered as DW-185, not caused by this story.
- `cd apps/strapi && yarn type-check` — PASS (exit 0); `yarn test --testPathPattern events.unit` — PASS, 77/77.
- Live curl of the category endpoints was attempted but no Strapi instance was running; the relation-filter runtime semantics remain covered only by mocked unit tests (now tracked in `deferred`).

**Residual risks:** the cinema/shorts nested relation filters (`screenings.movie.type`) are asserted by shape against mocks, never executed against a real query engine (deferred, medium); `yarn build` cannot complete repo-wide until the DW-185 baseline paydown lands; RTL/AR and the yellow active-tab rendering rest on manual verification per the spec's manual-checks list.
