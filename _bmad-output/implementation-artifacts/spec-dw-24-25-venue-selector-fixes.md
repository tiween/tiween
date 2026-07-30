---
title: "Venue selector: scope to matchable venues + disambiguate by city (DW-24, DW-25)"
type: "bugfix"
created: "2026-07-31"
status: "done"
baseline_revision: "aca3337197820e756c26b6e860d81e2cb10af38e"
final_revision: "10a0443"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-5-venue-filtering.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The events venue picker offers venues that can never match an MVP (cinema-only) event. Root cause found during planning: the public venues list endpoint (`GET /api/venues/venues` → `venue.findVenues`) **ignores every query param except `locale`** — it returns _all_ venues (any `type`, any city, and even `pending`/`suspended` ones), never populates `cityRef`, and honours neither `pagination` nor `sort`/`fields`. So `getVenuesForSelector`'s `filters.status`, `fields:["…","city"]` and `pageSize:100` are silently no-ops: DW-24's non-cinema / out-of-region entries all dead-end to an unexplained empty listing, a URL-supplied venue outside the returned window leaves the trigger mislabeled "All venues", and DW-25's `city` is never actually fetched (there is no `city` scalar on the venue schema — only a `cityRef` relation), so two same-named venues are indistinguishable.

**Approach:** Add a dedicated, Zod-validated public route `GET /api/venues/venues/selector` to the venues plugin that serves the picker only: approved-only, optional `type`/`city`/`region` scoping, `cityRef` populated (so a city name can be rendered), real pagination with a reported `total`, and an `include=<documentId>` escape hatch that force-adds one specific venue to the page so a URL-supplied selection is never missing. Point `getVenuesForSelector` at it (cinema by default, region/city forwarded from the active filters, `include` = the URL venue), surface truncation to the UI, and render the venue's city beside its name in the combobox. The existing `/venues` and `/venues/:documentId` routes are left untouched so no other consumer changes behavior.

## Boundaries & Constraints

**Always:**

- New route is **additive**: register `GET /venues/selector` in the venues plugin `content-api` routes **before** `/venues/:documentId` (otherwise `selector` is read as a documentId), `auth: false`, handler `venue.findVenuesForSelector`.
- Validate the selector query with Zod in the controller, mirroring the events-manager precedent (`controllers/events.ts`): non-`.strict()` schema (unknown params stripped, never a 400), `locale` (2–10 chars, optional), `type` (enum of the venue schema's five values, optional), `city`/`region`/`include` as an `optionalDocumentId` preprocess (`trim → undefined`, then `min(1).max(255).optional()`), `page` (int ≥1, default 1), `pageSize` (int ≥1, max 200, default 100). Invalid input ⇒ `ctx.badRequest("INVALID_QUERY")` (an error CODE, never prose, never a 500).
- Service `findVenuesForSelector(params)` always filters `status: { $eq: "approved" }`; adds `type: { $eq: type }` when `type` is present; adds `cityRef: { documentId: { $eq: city } }` when `city` is present and `cityRef: { region: { documentId: { $eq: region } } }` when `region` is present, merged into **one** `cityRef` object so city+region AND-combine (same merge discipline the events service uses for `filters.venue`). Sorts `name:asc`, paginates via `start`/`limit`, and returns `total` from a matching `count()` with the same filters+locale.
- `include`: when present and the venue is **not** already on the returned page, fetch that one venue by documentId (same locale, approved-only) and prepend it to `data`. It is included **even when it falls outside the `type`/`city`/`region` scope** — it is the user's active selection and must be labelable. A missing/unapproved `include` is silently ignored (never a 404, never a 500). `include` never inflates `total`.
- Response is the v5 shape: `{ data: [{ documentId, name, type, city }], meta: { pagination: { page, pageSize, total, pageCount } } }`, where `city` is `cityRef?.name` (a plain string, possibly `undefined`). No other venue fields are exposed by this route.
- `getVenuesForSelector(locale, options)` takes an options object (`{ type?, cityDocumentId?, regionDocumentId?, includeDocumentId?, pageSize? }`), defaults `type` to `"cinema"` (the MVP catalogue), sends **flat** params to the new route, and returns `{ venues, total, truncated }` where `truncated = total > venues.length`. It stays fail-soft: on any error it returns `{ venues: [], total: 0, truncated: false }`. Every existing call site is updated to the new shape.
- The events route forwards the **active** location filters (`filters.region`, `filters.city`) and `includeDocumentId: filters.venue`, so the picker lists only venues that can match under the current scope while still labeling the URL-supplied venue.
- `EventVenueFilter` renders the venue's city next to its name in both the list item and the trigger, only when a city exists, and in a visually-subordinate style (e.g. `text-muted-foreground` suffix). The city is also added to the cmdk `keywords` so typing a city name narrows the list. Venue and city proper nouns render as stored (never translated).
- When `truncated` is true the picker shows a localized hint at the end of the list telling the user to refine their search; copy comes from `labels` (no hardcoded strings) and is added to `fr`/`en`/`ar` locale files.
- The mount-time restore keeps its reconcile guard, but **only purges `localStorage` when the picker list is unscoped**. A new `scoped` prop tells the component the list was narrowed by region/city/type; when `scoped` is true and the saved venue is absent, skip the restore **without** purging (absence means "out of the current scope", not "deleted").
- Follow project rules: TypeScript strict (no `any` in new code — the controller `ctx` may keep the existing `any` convention used by `events.ts`), Zod for all API input, error CODES not messages, co-located tests (Jest for `apps/strapi`, Vitest for `apps/client`).

**Block If:** the Strapi v5 Document Service cannot express the nested `cityRef.region.documentId` filter or `count()` with the same filters against the venue UID — that would be a genuine backend-capability gap, not a guessable workaround.

**Never:**

- Do not modify `venue.findVenues` / `findVenue`, the `/venues` and `/venues/:documentId` routes, or the `public-api` facade — other consumers (`getVenues`, `getVenueBySlug`, `getVenueByDocumentId`, `searchVenues`) must keep their current behavior in this pass. Their pre-existing ignored-filter bugs are out of scope here.
- Do not restyle or restructure the `VenueSelector` component, `EventLocationFilter`, `EventDateFilter`, or `EventCard`; do not touch the events-manager plugin.
- No geolocation, no distance sorting, no popularity ordering, no server-side keyword search for venues (the combobox search stays client-side over the fetched page).
- Do not add an arbitrary `filters`/`populate` passthrough to the new route — only the typed params listed above.
- Do not edit `{implementation_artifacts}/deferred-work.md` (the orchestrator records resolution).

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                                             | Expected Output / Behavior                                                                                            | Error Handling                        |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Default picker fetch         | `GET /venues/selector?locale=fr&type=cinema`              | Approved cinema venues only, `name:asc`, ≤100 rows, each with `city` from `cityRef.name`; `meta.pagination.total` set | 200                                   |
| Region-scoped picker         | `…&region=<r>`                                            | Only venues whose `cityRef.region.documentId` matches; city+region params merge into one `cityRef` filter object      | 200                                   |
| Non-approved / non-cinema    | Seeded `pending` venue, or a `theater`                    | Absent from `data` and from `total`                                                                                   | 200                                   |
| Blank params                 | `?type=&city=%20&include=`                                | Trimmed to `undefined` ⇒ treated as absent (no filter, no include)                                                    | 200, never 400                        |
| Bad params                   | `?pageSize=0`, `?pageSize=abc`, `?type=bogus`, `?page=-1` | `400 INVALID_QUERY`                                                                                                   | Error CODE, no 500                    |
| Venue beyond the page        | `?include=<docId not on page 1>`                          | That venue is prepended to `data` (even if outside `type`/`city`/`region` scope); `total` unchanged                   | 200                                   |
| Unknown / unapproved include | `?include=<bogus or pending id>`                          | Ignored; `data` unchanged                                                                                             | 200, never 404/500                    |
| URL venue on the listing     | `/events?venue=<docId beyond cap>`                        | Trigger shows that venue's name (not "All venues"); clearing it works                                                 | 200                                   |
| Two same-named venues        | Two approved cinemas both named "Pathé", different cities | Each list row and the trigger render `Pathé` + its city; typing a city name narrows the list                          | No error                              |
| Venue with no city           | Approved cinema with `cityRef` unset                      | Row renders the name only, no empty separator/parenthesis                                                             | No error                              |
| Truncated list               | `total` (e.g. 140) > returned rows (100)                  | Picker renders the localized refine hint after the options; list still usable                                         | No error                              |
| Saved venue out of scope     | `localStorage` venue absent from a **scoped** list        | Restore skipped, storage **kept**                                                                                     | No error                              |
| Saved venue deleted          | `localStorage` venue absent from an **unscoped** list     | Restore skipped and storage purged (existing behavior)                                                                | No error                              |
| Selector fetch failure       | Route throws / network error                              | `{ venues: [], total: 0, truncated: false }`; picker hidden; date + location filters still work                       | Caught client-side, no whole-page 500 |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/venues/server/src/routes/index.ts` — add the `GET /venues/selector` content-api route **before** `/venues/:documentId`.
- `apps/strapi/src/plugins/venues/server/src/controllers/index.ts` — add `findVenuesForSelector` to `venueController` with the Zod `selectorQuerySchema`; `findVenues`/`findVenue` untouched.
- `apps/strapi/src/plugins/venues/server/src/services/venue.ts` — add `findVenuesForSelector(params)` (approved-only filters, merged `cityRef` object, `cityRef` populate, `name:asc`, `start`/`limit`, `count()`, `include` merge, projection to `{documentId,name,type,city}`).
- `apps/strapi/src/plugins/venues/server/src/services/__tests__/venue.unit.test.ts` — **NEW** Jest unit tests for the service (filter shape, merge, pagination, include-present/absent/unapproved, city projection). Mirror `events-manager/.../services/__tests__/events.unit.test.ts` for the `strapi.documents` mock style.
- `apps/strapi/src/plugins/venues/server/src/controllers/__tests__/venue.unit.test.ts` — **NEW** Jest unit tests for query validation (blank-trim, bad values ⇒ `INVALID_QUERY`, defaults, body shape).
- `apps/client/src/lib/strapi-api/content/venues.ts` — rewrite `getVenuesForSelector` to the options/result shape against `/venues/selector`; export `VenueSelectorOptions`, `VenueSelectorResult`, `VenueSelectorVenue`.
- `apps/client/src/app/[locale]/events/page.tsx` — pass `{ type: "cinema", regionDocumentId: filters.region, cityDocumentId: filters.city, includeDocumentId: filters.venue }`; forward `venues`, `venuesTruncated`, `venuesScoped` to `EventsListing`.
- `apps/client/src/app/[locale]/page.tsx`, `apps/client/src/app/[locale]/page.venue.tsx` — adapt the two existing call sites to the options/result shape (`getVenuesForSelector(locale, { cityDocumentId })` → `.venues`).
- `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx` — render city beside name (trigger + rows), add city to `keywords`, add `truncated`/`scoped` props + `truncatedHint` label, scope-aware restore purge.
- `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.test.tsx` — extend for city rendering, city-keyword search, truncation hint, scoped-vs-unscoped restore purge.
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — thread `venuesTruncated`/`venuesScoped` props into `EventVenueFilter`.
- `apps/client/locales/{fr,en,ar}.json` — add `events.listing.venuesTruncated` copy.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/.../venues/server/src/services/venue.ts` — add `findVenuesForSelector` — the picker needs approved/type/location-scoped, city-populated, really-paginated data the existing service does not provide.
- [x] `apps/strapi/.../venues/server/src/controllers/index.ts` — add `findVenuesForSelector` + Zod `selectorQuerySchema` — all API input must be validated and rejected with a CODE.
- [x] `apps/strapi/.../venues/server/src/routes/index.ts` — register `GET /venues/selector` before `/venues/:documentId` — otherwise the literal path is swallowed by the id route.
- [x] `apps/strapi/.../venues/server/src/services/__tests__/venue.unit.test.ts` + `.../controllers/__tests__/venue.unit.test.ts` — **NEW** — cover the backend rows of the I/O matrix.
- [x] `apps/client/src/lib/strapi-api/content/venues.ts` — repoint and re-shape `getVenuesForSelector` — the old nested-filter call was a silent no-op.
- [x] `apps/client/src/app/[locale]/events/page.tsx` — pass cinema scope + active region/city + `include` — kills the three DW-24 dead-ends at the source.
- [x] `apps/client/src/app/[locale]/page.tsx`, `apps/client/src/app/[locale]/page.venue.tsx` — adapt to the new signature — keep the homepage selector compiling and cinema-scoped.
- [x] `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx` — city rendering + city keywords + truncation hint + scope-aware restore — resolves DW-25 and the remaining DW-24 UX gaps.
- [x] `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — thread the two new props through the island.
- [x] `apps/client/locales/{fr,en,ar}.json` — add the truncation-hint copy — no hardcoded strings.
- [x] `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.test.tsx` — extend — cover the frontend rows of the I/O matrix.

**Acceptance Criteria:**

- Given a seeded catalogue containing approved cinemas, a `theater`, and a `pending` cinema, when the events picker loads, then only the approved cinemas are offered.
- Given `/events?region=<r>`, when the picker opens, then it lists only venues in that region, and selecting one yields a non-empty listing for a date on which that venue has an event.
- Given `/events?venue=<docId>` where that venue is beyond the fetched page, when the page renders, then the trigger shows that venue's name and the clear affordance removes it from the URL.
- Given two approved cinemas with identical names in different cities, when the picker opens, then each row is distinguishable by its city and selecting either sets the corresponding `documentId`.
- Given the selector route is unreachable, when `/events` renders, then the page still renders with the venue filter hidden and the date/location filters working.

## Spec Change Log

_(empty — no bad_spec loopback was triggered.)_

## Review Triage Log

### 2026-07-31 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 2, low 8)
- defer: 1: (high 0, medium 1, low 0)
- reject: 8: (high 0, medium 1, low 7)
- addressed_findings:
  - `[medium]` `[patch]` `venuesScoped` was derived from `region || city` only, ignoring the always-on `type: "cinema"` scope and the page cap — a saved theater, or a cinema past row 100, was absent from a list reported as unscoped and got purged from `localStorage`. The events feed is always narrowed, so `venuesScoped` is now unconditionally true (absence can never mean "deleted" on this feed).
  - `[medium]` `[patch]` Both homepages filtered out venues with no `type`, silently discarding the very venue the server force-included for the active URL selection (the trigger would read "all venues" while the page stayed filtered). Replaced the filter with a map to `type ?? "other"` — the bucket `VenueSelector` already uses internally.
  - `[low]` `[patch]` `truncated` compared `total` against an `include`-inflated `venues.length`, so a genuinely capped list (total 4, page 3 + 1 include) read as complete. Now compares `total > pageSize`.
  - `[low]` `[patch]` The truncation hint rendered as a `role="note"` child of cmdk's `role="listbox"` (invalid ARIA; assistive tech may drop it) and collided with the "no venue found" empty state. Moved outside `CommandList` as a popover footer.
  - `[low]` `[patch]` The trigger's city span sat inside the `truncate` span, so the DW-25 disambiguator was the first thing clipped. Moved outside with `shrink-0` — the venue name clips first.
  - `[low]` `[patch]` The unauthenticated selector route accepted `page` up to 10 000 against `pageSize` 200, pairing a deep `OFFSET` with a full `count()` per request. Capped `page` at 100.
  - `[low]` `[patch]` `?page=` / `?pageSize=` 400'd instead of falling back to the defaults, breaking the "a blank param means absent" convention every other param follows. Added the blank→undefined preprocess.
  - `[low]` `[patch]` A throwing `include` lookup would 500 the request and discard an already-successful page, contradicting the documented "never a 500". Wrapped in try/catch with a `strapi.log.warn`.
  - `[low]` `[patch]` `EMPTY_SELECTOR_RESULT` was a shared mutable module singleton returned on every error path. Replaced with a per-call factory.
  - `[low]` `[patch]` The load-bearing route ordering (`/venues/selector` before `/venues/:documentId`) was guaranteed by a comment alone; a reorder would silently disable the picker site-wide (both layers are fail-soft). Added `routes/__tests__/routes.unit.test.ts` pinning the order, handler and public auth.

Deferred finding — **not** written to the ledger: this run was invoked with an explicit "do not edit the deferred-work ledger" instruction, so the orchestrator owns that record.

- `[medium]` The homepage `VenueSelector` is a plain grouped `Select` with no search box and no truncation affordance, and both homepages discard `venuesResult.truncated`. Now that the selector route honours pagination for real (the old endpoint ignored it and returned everything), a city with more than 100 approved cinemas would silently render an arbitrary alphabetical first page with no signal. Not reachable at current catalogue volume, and the events picker already has both the search box and the hint.

### 2026-07-31 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 0, low 4)
- defer: 6: (high 0, medium 4, low 2)
- reject: 9: (high 0, medium 0, low 9)
- addressed_findings:
  - `[low]` `[patch]` The restore effect latches `restoredRef` before the scoped-skip branch, and `EventVenueFilter` is not remounted by the island's `router.push`/`replace` — so the saved venue does **not** "come back once the scope is cleared" within a session, as the code comment and the test name both claimed. Kept the once-per-mount latch (re-applying a venue filter mid-session, under a user who just widened their location filter, would be the worse behavior) and corrected the comment and the test name to state what actually holds: the value is preserved so a **later visit** whose list contains it restores it.
  - `[low]` `[patch]` The truncation hint told the user to "refine your search", but the combobox search is client-side over the already-fetched page (server-side venue search is explicitly out of scope), so a venue past row 100 stays unreachable no matter what is typed — the hint asked for an action that cannot work. Reworded fr/en/ar to point at the affordance that does work: narrow the list by region or city.
  - `[low]` `[patch]` The DW-25 city-keyword test passed for the wrong reason: cmdk scores the item `value` (the documentId) alongside `keywords`, and the fixture used `documentId: "pathe-sfax"`, so typing `"sfax"` matched via the id whether or not the city was in `keywords`. Switched the fixture to opaque Strapi-shaped ids sharing no subsequence with the city names; verified by probe that the test now fails when `keywords={[name, city]}` is reverted to `[name]` (it previously passed).
  - `[low]` `[patch]` `truncatedHint` is an optional label rendered only when both `truncated` and the label are set, so a key missing from one locale file — or the `tEvents("listing.venuesTruncated")` wiring dropped from the route — type-checks and keeps every component test green (they pass their own label literal) while shipping the truncation affordance silently disabled. Added `venuesTruncatedI18n.test.tsx`, resolving the key through next-intl's real ICU engine for fr/ar/en (mirrors the `watchlistSyncI18n` precedent).

Deferred findings were appended to the ledger as new entries **DW-131 … DW-136** (homepage `VenueSelector` not brought along; city names not locale-aware; cmdk scoring opaque documentIds; unlabelable/unclearable URL venue when `include` cannot supply it; location change keeping an out-of-scope venue; no route-level test for the selector wiring). Existing ledger entries were not modified.

Notable rejections this pass: the `include` prepend breaking `name:asc` and making `data.length` one past `pageSize` (both spec'd behavior); the now-unreachable `localStorage` purge branch (`venuesScoped` was made unconditionally true by a deliberate prior-pass patch, and a stale key is inert); the homepage losing non-cinema venues (the intent contract defines cinema as the MVP catalogue); `type: undefined` not being able to request all types (same); the stale `truncated = total > venues.length` wording inside the frozen intent contract (the code's `total > pageSize` is the correct form and the divergence is already recorded above); `page.venue.tsx` being dead code (pre-existing); the `include` locale fallback and the `include` re-prepending on `page > 1` (both no-ops for the only caller, which is locale-inert and always sends `page: 1`).

## Design Notes

`include` merge (service), keeping `total` honest:

```ts
const rows = await strapi
  .documents(VENUE_UID)
  .findMany({ locale, filters, sort, start, limit, populate })
const total = await strapi.documents(VENUE_UID).count({ locale, filters })
if (include && !rows.some((v) => v.documentId === include)) {
  const extra = await strapi
    .documents(VENUE_UID)
    .findOne({ documentId: include, locale, populate })
  if (extra?.status === "approved") rows.unshift(extra) // labelable selection; `total` untouched
}
```

Why a new `/venues/selector` route rather than fixing `/venues`: `/venues` currently returns everything unfiltered, and four other client fetchers (`getVenues`, `getVenueBySlug`, `getVenueByDocumentId`, `searchVenues`) already send nested filters it ignores. Making `/venues` honour them in this pass would change all of their behavior at once — a separate, larger correction. The selector route gives the picker a correct contract with zero blast radius.

## Verification

**Commands:**

- `cd apps/strapi && yarn test --testPathPattern "plugins/venues"` — expected: new venue service + controller unit tests pass.
- `cd apps/client && yarn test src/features/events src/lib/strapi-api` — expected: EventVenueFilter and venue fetcher tests pass.
- `cd apps/client && yarn typecheck` — expected: no errors (proves every `getVenuesForSelector` call site was migrated).
- `cd apps/strapi && yarn type-check` — expected: no errors.
- `cd apps/client && yarn lint` — expected: no new warnings/errors.

## Auto Run Result

Status: done

**Summary.** Follow-up review pass over the already-implemented DW-24 / DW-25 venue-selector change (no code was re-derived — the implementation from `253564a` stands). Three reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) ran in parallel against the full `aca3337..working-tree` diff. No intent gaps and no spec defects: the backend selector route, the scoping wiring and the city disambiguation all hold up. Four low-severity patches were applied — three of them corrections to claims the change made about _itself_ (a comment and a test name asserting a restore behavior the component does not implement; a hint telling users to use a search that cannot reach the missing venues; a DW-25 test that passed through the fixture's documentId rather than the feature under test) — plus one new locale guard. Six findings were deferred to the ledger as DW-131 … DW-136; the largest cluster is that the homepage `VenueSelector`, deliberately fenced off by the spec, was left behind by a data contract that changed underneath it.

**Files changed (this pass)**

- `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.tsx` — corrected the restore-reconcile comment to describe the actual latched, once-per-mount behavior.
- `apps/client/src/features/events/components/EventVenueFilter/EventVenueFilter.test.tsx` — same correction on the scoped-restore test name; DW-25 fixture switched to opaque documentIds so the city-keyword test pins `keywords`, not the id.
- `apps/client/src/features/events/components/EventVenueFilter/venuesTruncatedI18n.test.tsx` — **NEW**: real-ICU locale guard for `events.listing.venuesTruncated` across fr/ar/en.
- `apps/client/locales/{fr,en,ar}.json` — truncation hint reworded from "refine your search" (impossible — search is client-side over the fetched page) to "narrow the list by region or city".
- `_bmad-output/implementation-artifacts/deferred-work.md` — six new entries, DW-131 … DW-136. No existing entry touched.

**Review findings.** 4 patched (4 low), 6 deferred (4 medium, 2 low), 9 rejected, 0 intent gaps, 0 spec defects — see the Review Triage Log above.

**Verification performed**

- `cd apps/strapi && yarn test --testPathPattern "plugins/venues"` — PASS (4 suites, 33 tests).
- `cd apps/client && yarn test src/features/events src/lib/strapi-api` — PASS (25 files, 343 tests; +3 from the new locale guard).
- Mutation probe on the DW-25 fix: reverting `keywords={[venue.name, venue.city]}` to `[venue.name]` now fails the city-search test (1 failed / 24 passed); before the fixture change it stayed green. Restored immediately after.
- `cd apps/client && yarn typecheck` — 62 `error TS` lines, identical to the baseline `aca3337` set. No new errors, none in any touched file.
- `cd apps/client && yarn lint` — 0 errors, 257 warnings, same count as baseline; no warning in any touched file.

**Residual risks**

- All six deferred entries remain open; DW-131 (homepage picker silently capped and still name-only) and DW-134 (an unapproved URL venue leaving the filter hidden or mislabeled) are the two that can be reached by a real user today.
- The selector route is still verified by unit tests on both sides of a mock boundary only — nothing exercises it over HTTP against a booted Strapi, and both layers fail soft, so a wire-contract break would hide the venue filter site-wide with a green suite (DW-136, and the pre-existing DW-5 / DW-45).
- The events route itself (`type`/`region`/`city`/`include` wiring, `scoped`/`truncated` props) remains untested — the DW-24 fix can be deleted without a red test (DW-136).
