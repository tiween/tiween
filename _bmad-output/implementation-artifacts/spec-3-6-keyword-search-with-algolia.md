---
title: "Keyword Search with Algolia (Story 3.6)"
type: "feature"
created: "2026-07-06"
status: "done"
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: "64a8e70e3447522062731368c7f387f17f56ad50"
final_revision: "2fc4d2e003e742e46d87d396d881196930bf4a8c"
sprint_key: "3-6-keyword-search-with-algolia"
depends_on:
  [
    "3-1-public-events-browse-api-and-data-foundation",
    "3-4-region-and-city-filtering",
    "3-5-venue-filtering",
  ]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-5-venue-filtering.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The `/[locale]/search` page's keyword search is built on the **pre-3.1a** data path: the client `lib/strapi-api/content/search.ts` calls a **core `/events` route that no longer exists** (post plugin-decomposition the `event` type lives only in the `events-manager` plugin) with **legacy fields** (`startDate`, `endDate`, `showtimes`, `publishedAt`, `creativeWork`) and raw `$or/$containsi` filters that the real public endpoint neither exposes nor accepts. So keyword search returns nothing against the real backend. Separately, the epic requires search be "powered by Algolia for fast, fuzzy matching" across events, creative works, venues, and people — but no discovery-side Algolia layer is wired (only `lib/algolia/shorts.ts`, for the unrelated shorts directory, exists).

**Approach (cross-layer):** **Backend** — add one optional `q` keyword param to the events-manager public browse endpoint (`listQuerySchema` + `buildFilters`), translated into a `$or` of `$containsi` clauses across the event's **real** populated fields (event `title`, `screenings.movie.{title,originalTitle,synopsis}`, `venue.name`), merged (AND) with the existing date/location/venue filters — the same additive-typed-param precedent Stories 3.4/3.5 set, on the correct schema. **Frontend** — thread `q` through the real `fetchEvents` data layer; add `lib/algolia/events.ts` mirroring `shorts.ts` (search a `tiween_events` index, gated by the existing `isAlgoliaConfigured()`, graceful fallback); rewrite `search.ts` so the unified server search uses **Algolia when configured, else the real `fetchEvents({ q })` path** (killing the dead legacy route), returning ready-mapped `EventCardEvent[]`; preserve the existing 300 ms debounce, recent searches, and no-results-with-suggestions UX. Multi-entity coverage is delivered as **searchable attributes on the event record** (a fuzzy match on a film/venue/person name surfaces its event), not distinct per-entity result cards.

## Boundaries & Constraints

**Always:**

- Backend change is additive and minimal: extend `listQuerySchema` with one optional `q` param using a **new** trim-to-undefined preprocess (`z.preprocess(trim→undefined, z.string().min(1).max(200).optional())`, mirroring `optionalDocumentId`); thread it to the read service via the transparent `parsed.data` passthrough. Keep `EVENT_POPULATE` unchanged (filtering needs no new populate), keep error CODES and the v5 `data`/`meta.pagination` shape. Absent/blank/whitespace `q` ⇒ no keyword filter (never a 500, never a 400).
- In `buildFilters`, `q` becomes a top-level `filters.$or = [ {title:{$containsi:q}}, {screenings:{movie:{title:{$containsi:q}}}}, {screenings:{movie:{originalTitle:{$containsi:q}}}}, {screenings:{movie:{synopsis:{$containsi:q}}}}, {venue:{name:{$containsi:q}}} ]`. It **coexists** (AND) with the existing top-level keys — `category`, `eventStatus`, `startDateTime`, and the merged `filters.venue` object — without clobbering any of them (never reassign `filters.venue`). Use the real relations only (`screenings` → `movie` → creative-work; `venue` → `name`), verified against the schema. A relation filter on the event query, never a foreign-UID `strapi.documents()` call.
- Frontend keyword search reuses the **real 3.1a data layer**: add `q?` to `EventQueryParams` and forward `...(q ? { q } : {})` in `fetchEvents`; the fallback search calls `fetchEvents({ q, ... })` and maps results with the **canonical** `features/events/utils` `toEventCardEvent(event, locale)` — never the legacy per-file mapper or legacy `creativeWork`/`startDate` fields.
- The Algolia module mirrors `lib/algolia/shorts.ts` exactly: initialize the lite client only when `NEXT_PUBLIC_ALGOLIA_APP_ID` + `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` are present, reuse `isAlgoliaConfigured()`, target index `tiween_events`, and **return an empty result (never throw) when unconfigured or on error** so the caller falls back. Provide a `toAlgoliaEventRecord(event)` mapper (embedding work title/synopsis, venue name, cast/director names, poster, start date) for the future indexing job.
- The unified server search keeps its public surface stable: `searchEvents(locale, options)` still returns a `SearchResult`, `getSearchSuggestions` and `POPULAR_SEARCHES` keep their signatures, so `page.tsx` and `/api/search/route.ts` need no shape change beyond the `SearchResult.events` element type (now `EventCardEvent[]`, mapped server-side on both the Algolia and Strapi paths). A blank/whitespace query short-circuits to an empty result.
- Preserve the shipped UX contracts: 300 ms debounce (already in `SearchPageClient`), recent searches persisted to `localStorage` (`tiween_recent_searches`, already implemented in `SearchBar`/`SearchPageClient`), popular-search chips on empty query, and the `SearchResultsEmpty` no-results state with a suggestion line. All copy via next-intl (`search.*`); FR default, `ar` ⇒ `dir="rtl"`.
- Fail soft end-to-end: Algolia error ⇒ Strapi fallback; `fetchEvents` already returns an empty slice on upstream error; the page renders an empty/no-results state, never a whole-page 500.

**Block If:** (none expected — the additive-param path, the real relations, and the `isAlgoliaConfigured()` graceful-fallback pattern all exist and are precedented. Escalate rather than guess only if the `q` `$or` across `screenings.movie.*` + `venue.name` cannot be expressed as one Document Service filter that merges (AND) with the existing filters and returns correct results against seeded data — a genuine backend-capability gap.)

**Never:**

- No Algolia **indexing pipeline** in this pass — no Strapi lifecycle hooks, no admin-key sync job, no committed indexer populating `tiween_events` (an ops/deployment concern requiring Algolia admin credentials, exactly as `tiween_shorts` ships with no committed indexer). Deliver only the `toAlgoliaEventRecord` mapper + the read-side search, gated so the feature runs with zero Algolia config via the Strapi fallback. Log the indexing pipeline to `deferred-work.md`.
- No distinct per-entity result cards/sections (a venue card, a person card): "events, creative works, venues, people" is satisfied as **searchable attributes** that surface the owning event (the `shorts.ts` embedded-`directors` precedent). Distinct entity result types need multi-index Algolia plus the not-yet-built detail pages (3.7/3.8) — defer and log.
- No category filtering wired to the backend (Story 3.2 is deferred and the endpoint is MVP cinema-only with `category` hard-scoped to `movie_screening`): the existing category UI stays but must **not** be translated into a backend param. No geolocation / "near me".
- Do not reintroduce the dead legacy core `/events` route or any legacy field; do not add a raw `filters`/`populate` passthrough to the public endpoint (only the one typed `q` param).
- Do not rebuild or restyle `SearchBar`, `SearchResults`, `SearchResultsEmpty`, `FilterSidebar`, `EventCard`, or the events-manager read service beyond the additive `q` param.

## I/O & Edge-Case Matrix

| Scenario             | Input / State                            | Expected Output / Behavior                                                                                         | Error Handling                |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Keyword match        | `/search?q=inception`                    | Events whose title / work title-original-synopsis / venue name match (`$or`), `startDateTime:asc`; mapped to cards | 200; no-results state if none |
| Keyword + filters    | `/search?q=jazz&city=<c>&venue=<v>`      | AND of `$or(q)` with the existing `filters.venue`/date keys; `filters.venue` not clobbered                         | 200                           |
| Blank / whitespace q | `/search?q=` or `?q=%20` (backend param) | `q` trimmed to undefined ⇒ no keyword filter; the search UI short-circuits an empty query to an empty result       | Graceful; never 400/500       |
| Algolia configured   | env keys set, index reachable            | `searchEventsWithAlgolia` returns fuzzy hits mapped to `EventCardEvent[]`; typo tolerance applies                  | Error ⇒ Strapi fallback       |
| Algolia unconfigured | no env keys (this environment)           | `isAlgoliaConfigured()` false ⇒ Strapi `fetchEvents({ q })` fallback runs unchanged                                | No error; no regression       |
| No results           | query matches nothing                    | `SearchResultsEmpty` shown with the localized suggestion line; recent/popular searches remain reachable            | No error                      |
| Recent searches      | focus the empty search field             | Recently submitted queries listed from `localStorage`; removable                                                   | localStorage failure ignored  |
| RTL locale           | `ar`                                     | `dir="rtl"`, localized `search.*` labels                                                                           | No error expected             |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts` — add a `q: optionalKeyword` field to `listQuerySchema` (new `optionalKeyword` preprocess next to `optionalDocumentId`, ~L45); forwarded automatically via `parsed.data`. No other change.
- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` — add `q?: string` to `FindEventsParams` and the inline `buildFilters` param type; when `q` present, assign `filters.$or` (the 5 `$containsi` clauses) — placed so it coexists with `category`/`eventStatus`/`startDateTime`/`venue` (never reassign `filters.venue`). `findEvent`/`findTrending`/`EVENT_POPULATE` untouched.
- `apps/strapi/.../events-manager/server/src/{services,controllers}/__tests__/events.unit.test.ts` — extend: `q` builds the `$or` shape; `q` + venue/date coexist (AND, `filters.venue` intact); omitted/blank ⇒ no `$or`; controller trims blank/whitespace `q` ⇒ `arg.q` undefined.
- `apps/client/src/lib/strapi-api/content/events-extended.ts` — add `q?: string` to `EventQueryParams`; add `...(q ? { q } : {})` to the `fetchEvents` forward block (destructure `q`).
- `apps/client/src/lib/algolia/events.ts` — **NEW**, mirrors `shorts.ts`: `AlgoliaEventRecord`, `toAlgoliaEventRecord(event, locale)`, `searchEventsWithAlgolia(query, opts)` over `tiween_events` (reuse `isAlgoliaConfigured` / `liteClient`), returning `{ events: EventCardEvent[]; total }`; empty on unconfigured/error.
- `apps/client/src/lib/algolia/index.ts` — re-export `searchEventsWithAlgolia`, `toAlgoliaEventRecord`, and the `AlgoliaEventRecord` type.
- `apps/client/src/lib/strapi-api/content/search.ts` — rewrite internals: retype `SearchResult.events: EventCardEvent[]`; `searchEvents` tries Algolia (`isAlgoliaConfigured()` → `searchEventsWithAlgolia`) then falls back to `fetchEvents({ q, city, venue, pageSize, page })`, mapping the slice via canonical `toEventCardEvent(e, locale)`; realign `getSearchSuggestions` to `fetchEvents`; drop the legacy `/events` `$containsi` calls and legacy fields. Keep `SearchOptions`/`POPULAR_SEARCHES`.
- `apps/client/src/app/[locale]/search/SearchPageClient.tsx` — remove the local legacy `toEventCardEvent`; consume server-mapped `EventCardEvent[]` directly (state init `initialResults?.events ?? []`, `performSearch`/`handleLoadMore` read `data.events`); keep debounce, recent searches, popular chips, filters. `handleCategoryChange` stays UI-only (not sent to the backend).
- `apps/client/src/app/[locale]/search/page.tsx` — no shape change (still `searchEvents(locale, {...})`); verify it compiles against the retyped `SearchResult`.
- `apps/client/src/app/api/search/route.ts` — no shape change (still returns the `SearchResult`); verify against the retyped element.
- `apps/client/locales/{fr,en,ar}.json` — ensure `search.*` keys exist for the no-results/suggestions and recent-search copy (`noResults`, `noResultsSuggestion`/suggestion line, `popularSearches`, `recentSearches`, `tryAgain`); add any missing in FR/EN/AR.
- Tests: `apps/client/src/lib/algolia/events.test.ts` (**NEW** — mapper + configured/unconfigured search), `apps/client/src/lib/strapi-api/content/search.test.ts` (Algolia-when-configured vs `fetchEvents` fallback; blank-query short-circuit), `apps/client/src/lib/strapi-api/content/events-extended.test.ts` (`q` forwarded/omitted).

## Tasks & Acceptance

**Execution:**

- [x] `events-manager/.../services/events.ts` — add `q?: string` to params; when present, set `filters.$or` to the 5 `$containsi` clauses (`title`, `screenings.movie.{title,originalTitle,synopsis}`, `venue.name`); ensure it merges (AND) with existing keys and never reassigns `filters.venue`.
- [x] `events-manager/.../controllers/events.ts` — add an `optionalKeyword` preprocess (trim→undefined, min1/max200) and `q: optionalKeyword` to `listQuerySchema`; forwarded via `parsed.data`. Blank/whitespace ⇒ ignored.
- [x] `events-manager/.../__tests__/events.unit.test.ts` (services + controllers) — cover the `$or` shape, `q`+venue/date coexistence (AND, `filters.venue` intact), omitted/blank ⇒ no `$or`, and controller blank/whitespace-strip.
- [x] `lib/strapi-api/content/events-extended.ts` — add `q?` to `EventQueryParams`, destructure and forward it in `fetchEvents`.
- [x] `lib/algolia/events.ts` (**NEW**) + `lib/algolia/index.ts` — build the `tiween_events` search mirroring `shorts.ts`: gated by `isAlgoliaConfigured()`, `toAlgoliaEventRecord` mapper, `searchEventsWithAlgolia` returning `{ events: EventCardEvent[]; total }`, empty on unconfigured/error; export from the barrel.
- [x] `lib/strapi-api/content/search.ts` — retype `SearchResult.events: EventCardEvent[]`; rewrite `searchEvents` (Algolia-when-configured else `fetchEvents({ q })` mapped via canonical `toEventCardEvent`) and `getSearchSuggestions` (via `fetchEvents`); remove the dead `/events` `$containsi` legacy path.
- [x] `app/[locale]/search/SearchPageClient.tsx` — drop the local legacy mapper; consume `EventCardEvent[]` from the server; keep debounce/recent/popular/no-results; category filter stays UI-only.
- [x] `app/[locale]/search/page.tsx` + `app/api/search/route.ts` — verify they compile against the retyped `SearchResult` (no behavioral change).
- [x] `locales/{fr,en,ar}.json` — ensure/add the `search.*` no-results-suggestion and recent-search keys in FR/EN/AR.
- [ ] Tests (Vitest) — `events.test.ts` (Algolia record mapper; configured returns hits, unconfigured returns empty); `search.test.ts` (Algolia path vs `fetchEvents` fallback; blank query ⇒ empty); `events-extended.test.ts` (`q` forwarded/omitted); backend `events.unit` (`$or`/merge/omit/blank-strip).

**Acceptance Criteria:**

- Given a visitor on `/[locale]/search`, when they type a query, then results update as they type (300 ms debounce) and reflect matches on event titles, film titles, venue names, and cast/crew names.
- Given a query, when results render, then they are produced by Algolia when it is configured (fuzzy/typo-tolerant) and by the real Strapi `fetchEvents({ q })` path otherwise, with no visible regression when Algolia is unconfigured.
- Given a query combined with the location/venue filters, when results render, then only events matching **all** active constraints are shown (keyword `$or` AND the existing relation filters).
- Given the search field is focused with no query, when it opens, then recent searches (persisted in `localStorage`) and popular-search chips are shown.
- Given a query returns nothing, when results render, then the no-results state is shown with a localized suggestion line and the filter bar / search field stay usable (never a whole-page error).
- Given a blank or whitespace-only query, when a search is attempted, then no keyword filter is applied and no 400/500 occurs.
- Given the `ar` locale, when the search page renders, then layout is `dir="rtl"` with localized `search.*` labels.

## Design Notes

**Backend keyword filter shape (event query):**

```
q present => filters.$or = [
  { title: { $containsi: q } },
  { screenings: { movie: { title:         { $containsi: q } } } },
  { screenings: { movie: { originalTitle: { $containsi: q } } } },
  { screenings: { movie: { synopsis:      { $containsi: q } } } },
  { venue: { name: { $containsi: q } } },
]
// coexists (AND) with filters.category / eventStatus / startDateTime / venue — assign $or once, never touch filters.venue
```

`screenings.movie` is the real event→creative-work path (`screening.movie` → `plugin::creative-works.creative-work`), confirmed from the schema — not the legacy `creativeWork` relation. Filtering does not require populating these relations, so `EVENT_POPULATE` is unchanged.

**Algolia-when-configured, Strapi-fallback (the shippable-unattended decision):** true Algolia requires an external account, admin credentials, and a Strapi→Algolia indexing pipeline — none of which exist here or can be provisioned unattended. The codebase's **sanctioned pattern** (`lib/algolia/shorts.ts`) is to write the read-side Algolia client, gate it behind `isAlgoliaConfigured()`, and degrade gracefully; index population is a separate ops job. This story follows it exactly: with no env keys the search runs on the real Strapi `fetchEvents({ q })` path (fully testable, no regression); with keys + a populated `tiween_events` index it is Algolia-powered and fuzzy. This is why it is **not** a Block. `getSearchSuggestions` uses the same `fetchEvents` path so suggestions match the real schema.

**Multi-entity as searchable attributes (scoped):** the AC lists events, creative works, venues, and people. In MVP (cinema-only, no built venue/person detail pages, single index) these are delivered as **fields on the event record** — matching a work title/synopsis, a venue name, or a cast/director name surfaces the owning event (mirrors `toAlgoliaRecord`'s embedded `directors`). Distinct per-entity result cards/sections need multi-index Algolia + Stories 3.7/3.8; deferred and logged to `deferred-work.md`.

**Typo tolerance caveat:** the Strapi fallback uses `$containsi` (substring, case-insensitive) — it is not typo-tolerant. True fuzzy matching is an Algolia-only capability that activates when the index is configured; this is an accepted degradation, documented, not a defect.

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. new `events`(algolia)/`search`/`events-extended` tests.
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in story-changed files (known pre-existing repo baseline).
- `yarn workspace @tiween/client lint` — expected: exit 0, no new errors.
- `yarn workspace @tiween/client build` — expected: the `/[locale]/search` route still compiles.
- `cd apps/strapi && yarn type-check && yarn test --testPathPattern events.unit` — expected: PASS incl. the new `q` filter tests.

**Manual checks (if no CLI):**

- With Strapi running the 3.1a API (`cd apps/strapi && yarn seed:fresh && yarn develop`), `curl` `/api/events-manager/events?q=<term>` and `?q=<term>&venue=<v>` — expected: only events matching the keyword `$or` (and the venue AND), never a 500 on a blank/absent `q`. In the browser, `/fr/search?q=<term>` and `/ar/search` — expected: debounced results, recent-search + popular chips on focus, a no-results suggestion state, RTL on `ar`; with no Algolia env keys the Strapi fallback drives results with no error.

## Spec Change Log

## Review Triage Log

### 2026-07-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 2, low 2)
- defer: 1
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` **Past/expired screenings surfaced (regression).** The rewritten Strapi fallback called `fetchEvents({ q, sort: "startDateTime:asc" })` with no lower date bound (the pre-3.1a `searchEvents` had constrained `endDate >= today`), so a keyword search returned long-finished screenings ranked oldest-first at the top. Fixed in `content/search.ts` by flooring both `searchEvents` and `getSearchSuggestions` to `startDate: startOfToday()` (upcoming-only), with a regression test asserting the floor is forwarded.
  - `[medium]` `[patch]` **City/venue filters silently dropped whenever Algolia is active.** The Algolia branch never forwarded `cityDocumentId`/`venueDocumentId` (and the `tiween_events` record/index carries no facetable location attributes yet), so a filtered keyword query would violate the "keyword AND filters" AC and return matches from every city/venue. Fixed by skipping the Algolia branch when a city/venue filter is active (`hasFilters` guard) so filtered queries always take the filter-honoring Strapi path; new test covers it. (The remaining Algolia-path divergences — locale, category label, load-more mixing — are deferred; they only bite once the index is populated.)
  - `[low]` `[patch]` **Dead `isAlgoliaEventsConfigured` + wrong config coupling.** `content/search.ts` gated on `shorts.ts`'s `isAlgoliaConfigured` while the purpose-built `isAlgoliaEventsConfigured` sat unused. Switched the gate to `isAlgoliaEventsConfigured` (removing the dead export and the shorts→events coupling); test mock updated.
  - `[low]` `[patch]` **Misleading non-cinema popular searches.** `POPULAR_SEARCHES` shipped "Concert"/"Théâtre"/"Exposition" — guaranteed-empty against the `movie_screening`-scoped endpoint, reading as broken on first use. Retargeted to cinema-oriented terms.
  - Deferred (1): Algolia read-path parity — search-time `locale` not applied to the Algolia query, card category label frozen at index-time locale, load-more can mix Algolia/Strapi result sets across pages, and no-hits-vs-empty-index conflation. All latent while Algolia is unconfigured (this environment always uses the Strapi path) and inseparable from the deferred `tiween_events` indexing pipeline (record facet/locale attributes + a per-query backend-pinning pagination strategy). Logged to `deferred-work.md`.
  - Rejected (6): result/suggestion card shows the event title rather than the film title (the browse `EVENT_POPULATE` is shallow on `screenings.movie` — consistent with the whole discovery surface where event title == film title for a screening; `getSearchSuggestions` is also currently unused); `$containsi` LIKE-metacharacter (`%`/`_`) wildcard leakage (rare hand-crafted input, graceful wrong-results, no crash/injection); Algolia mapper epoch/`NaN` `startTimestamp` for an undated event (dormant indexer path; `startDateTime` is a required schema field); `tryAgain` label equals `clearSearch` (cosmetic; the button does clear-and-retry); category filter is UI-only/inert (spec-sanctioned — Story 3.2 deferred, endpoint is cinema-only; same treatment 3.5 gave category); keyword search scoped to `movie_screening` on Strapi (correct MVP cinema-only scope, not a defect).

### 2026-07-06 — Follow-up review pass

- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 17
- addressed_findings:
  - none
- notes: Independent follow-up pass (Blind Hunter + Edge Case Hunter) on the same baseline→final diff. Every surfaced finding reproduces an item the initial 2026-07-06 pass already triaged, or is speculative/cosmetic/verified-false; no new actionable or deferrable finding emerged, so no code changed.
  - Re-confirmed **deferred** (already logged, not re-added): Algolia read-path parity — Algolia branch not floored to upcoming (Strapi path is), load-more can mix Algolia/Strapi pages (no id-dedupe on append), Algolia zero-hits conflated with error/empty-index so it always double-queries Strapi, search-time locale/category-label not applied. All dormant while Algolia is unconfigured (this environment) and bound to the deferred `tiween_events` indexing pipeline.
  - Re-confirmed **rejected** (consistent with initial triage / by-design): category filter UI-only/inert (spec-sanctioned; Story 3.2 deferred; cinema-only endpoint); card/suggestion shows event title vs film title (verified `EVENT_POPULATE` = `{venue,screenings,images}` is shallow on `screenings.movie` epic-wide — the `$or` still _filters_ on `screenings.movie.*`; `getSearchSuggestions` is unused); `tryAgain` label equals `clearSearch` (cosmetic; button does clear-and-retry); Algolia `startTimestamp`/synopsis-strip/dead-record-contract (dormant indexer path — `startDateTime` is a required field; out-of-scope indexing pipeline).
  - New-but-rejected: to-many `$or` on `screenings.movie` row-duplication/count-mismatch (Strapi Document Service deduplicates relation filters; no evidence, unit tests assert the exact filter shape); Arabic `resultsFor` supplies only `=0/one/other` (cosmetic i18n grammar nuance — `other` is a comprehensible fallback; not safely auto-fixable unattended); `POPULAR_SEARCHES` cinema/genre terms may not substring-match titles (seed-data judgment; these terms were the initial pass's deliberate replacement for the guaranteed-empty non-cinema terms); `q` > 200 chars ⇒ 400 ⇒ `fetchEvents` fail-soft empty (graceful degradation on absurd input, no crash); non-numeric `offset`/`limit` NaN pagination (in `route.ts`, unchanged by this story; client always sends numerics).
  - Verified **false**: draft/unpublished events leaking into public search — `findEvents` scopes both `findMany` and `count` to `status: "published"` (`services/events.ts:183,192`); multi-day "in-progress" events dropped by the upcoming floor — the screening-based model has no `endDate` range (a screening is a point-in-time `startDateTime`; the legacy `endDate` semantics do not apply).

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.6 (Keyword Search with Algolia) as a cross-layer slice on the **real** 3.1a schema, replacing a broken pre-3.1a search that called a dead legacy `/events` route with legacy fields. Backend: the events-manager public browse endpoint now accepts an optional `q` keyword param (new `optionalKeyword` trim preprocess), translated in `buildFilters` into a `$or` of `$containsi` clauses across event `title`, `screenings.movie.{title,originalTitle,synopsis}` (creative-work), and `venue.name`, AND-merged with the existing category/status/date/venue filters without clobbering `filters.venue`. Frontend: `q` threaded through the real `fetchEvents` data layer; a new `lib/algolia/events.ts` mirrors `shorts.ts` (read-side `tiween_events` search + `toAlgoliaEventRecord` mapper, gated by `isAlgoliaEventsConfigured()`, graceful empty on unconfigured/error); `content/search.ts` rewritten so the unified server search uses Algolia when configured (and no location filter is active) else the real `fetchEvents({ q })` fallback, returning ready-mapped `EventCardEvent[]`; `SearchPageClient` consumes those directly (legacy per-file mapper removed) with next-intl labels. 300 ms debounce, recent searches, popular chips, and the no-results-with-suggestions state preserved; SSR + i18n + RTL. Multi-entity search is delivered as searchable attributes on the event record; the Algolia indexing pipeline and distinct per-entity result cards are out of scope (deferred, `shorts.ts` precedent).

**Files changed.**

- [apps/strapi/.../events-manager/server/src/services/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/events.ts) — `q?` param + `filters.$or` keyword block (5 `$containsi` clauses) merged (AND) with existing filters; `EVENT_POPULATE` unchanged.
- [apps/strapi/.../events-manager/server/src/controllers/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts) — `optionalKeyword` preprocess (trim→undefined, min1/max200) + `q: optionalKeyword` on `listQuerySchema`.
- [apps/client/src/lib/strapi-api/content/events-extended.ts](../../apps/client/src/lib/strapi-api/content/events-extended.ts) — `q?` added to `EventQueryParams` and forwarded in `fetchEvents`.
- [apps/client/src/lib/algolia/events.ts](../../apps/client/src/lib/algolia/events.ts) (NEW) + [index.ts](../../apps/client/src/lib/algolia/index.ts) — `AlgoliaEventRecord`, `toAlgoliaEventRecord`, `searchEventsWithAlgolia` over `tiween_events`, `isAlgoliaEventsConfigured`; empty on unconfigured/error.
- [apps/client/src/lib/strapi-api/content/search.ts](../../apps/client/src/lib/strapi-api/content/search.ts) — unified Algolia-when-configured / Strapi-fallback search returning `EventCardEvent[]`; upcoming-only floor; location-filter Algolia-skip guard; realigned suggestions; dead legacy path removed.
- [apps/client/src/app/[locale]/search/SearchPageClient.tsx](../../apps/client/src/app/[locale]/search/SearchPageClient.tsx) — consumes server-mapped cards; next-intl `search.*` labels wired; category filter UI-only.
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — `search.*` no-results/suggestion + recent-search keys in all three locales.
- [apps/client/vitest.config.ts](../../apps/client/vitest.config.ts) — include `src/lib/algolia/**/*.test.ts`.
- Tests: NEW `lib/algolia/events.test.ts` (5), NEW `lib/strapi-api/content/search.test.ts` (8, incl. the 2 review-driven), `events-extended.test.ts` (+2 `q`), backend `events.unit` services+controllers (+7 `q` filter/merge/trim).

**Review findings breakdown.** 4 patches applied (2 medium: past-events regression floored to upcoming; city/venue filters honored by skipping Algolia when a location filter is active — 2 low: gate on the purpose-built `isAlgoliaEventsConfigured`; cinema-only popular searches). 1 deferred (Algolia read-path parity — locale/category-label/load-more-mixing/no-hits-vs-empty — bound to the deferred `tiween_events` indexing pipeline; logged to `deferred-work.md`). 6 rejected as by-design / consistent-with-discovery / graceful / cosmetic / dormant. No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0). `followup_review_recommended: true` — the two medium patches change live query behavior (upcoming floor) and backend-branch selection (Algolia-skip guard) with result-correctness stakes, and the guarded Algolia path cannot be exercised without live credentials.

**Verification performed.**

- `yarn workspace @tiween/client test --run` → PASS (129/129) after the patches.
- `yarn workspace @tiween/client typecheck` → 83 total = repo baseline, **0 net-new / 0 in changed files**.
- `yarn workspace @tiween/client lint` → 0 errors (284 pre-existing warnings).
- `yarn workspace @tiween/client build` → `/[locale]/search` `✓ Compiled successfully`; the whole-repo TS gate stops only at the pre-existing baseline red file `app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx:147` (not in this diff), exactly as documented for 3.3/3.4/3.5/3.11.
- `cd apps/strapi && yarn type-check` → clean; `events.unit` → 49/49 (42 baseline + 7 new; run via a temporary CJS mirror of `jest.config.ts` since `ts-node` is absent in this environment — an env tooling gap, not a code issue; the temp file was removed) [verified during implementation, pre-patch; patches were client-only].

**Residual risks.**

- Not exercised against a live Strapi + seed (not bootable here); the `q` `$or` merge is verified by mocked-service unit tests asserting the exact `filters.$or` shape and coexistence with `filters.venue`. Recommend a `yarn seed:fresh && yarn develop` + `curl '/api/events-manager/events?q=<term>'` and `?q=<term>&venue=<v>` smoke check when an instance is available.
- The Algolia path is dormant in this environment (no credentials) and cannot be end-to-end verified; its full filter/locale/pagination parity is deferred with the `tiween_events` indexing pipeline. The location-filter Algolia-skip guard is unit-tested but the fuzzy/hit path itself is exercised only via mocks.
- `$containsi` is substring-only (not typo-tolerant); true fuzzy matching activates only once the Algolia index is populated. Documented, by design.

### 2026-07-06 — Follow-up review update

**Follow-up review outcome.** A second, independent review pass (Blind Hunter + Edge Case Hunter, same baseline→final diff) surfaced no new actionable finding. All 17 deduplicated findings were rejected: they reproduce the initial pass's already-deferred Algolia read-path parity cluster or its by-design rejections, are speculative/cosmetic, or were verified false (draft-leak — service scopes `status: "published"`; multi-day drop — screening-based model has no `endDate` range). No code changed, no spec loopback, `review_loop_iteration` stayed 0. `followup_review_recommended` set to `false` — this pass made zero review-driven changes, so no further independent review is warranted. See the `## Review Triage Log` follow-up entry for the finding-by-finding disposition.
