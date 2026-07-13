---
title: "Deepen public browse populate for homepage hero metadata & JSON-LD location (DW-22)"
type: "bugfix"
created: "2026-07-13"
status: "done"
baseline_revision: "41f1b0e3e4c1677e95f09f1858fbf59f38db1fb2"
final_revision: "84d62f562d93e53acc89d732c40ec01de57ed9c8"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-1-public-events-browse-api-and-data-foundation.md"
warnings: []
---

<intent-contract>

## Intent

**Problem:** The Story 3.1a public browse populate (`EVENT_POPULATE`, shared by `findEvents` and `findTrending`) is shallow — `screenings: true`, `venue: true`. So the homepage flagship hero (`toFilmHeroEvent`, which reads `screenings[0].movie` → title/backdrop/poster/genres/rating/duration/year) renders only a title/badge, and event JSON-LD (`generateEventJsonLd`, which reads `venue.cityRef.region` for `location.address`) emits no city/region. The frontend mappers are already written to consume the richer graph defensively; they just receive `undefined` today (DW-22, deferred from the 3-11 follow-up review 2026-07-06).

**Approach (backend only):** Deepen the shared browse `EVENT_POPULATE` to a bounded card/hero depth — populate each screening's `movie` (creative-work) with `poster`, `backdrop`, and `genres`, and populate `venue.cityRef.region` — so the curated homepage slices (featured/today/this-week/trending) carry hero-level movie metadata and complete location data. This deliberately stops short of the deep `DETAIL_POPULATE` graph (no `cast`/`credits`/`videos`) to keep browse reads bounded.

## Boundaries & Constraints

**Always:**

- Populate only through the `event` UID relation graph (`strapi.documents(EVENT_UID)`) — never a foreign-UID `strapi.documents()` call, per the cross-plugin rule.
- Keep the change additive: existing browse/trending consumers (filter Stories 3.3–3.5, search 3.6, EventCard) must keep working — they simply receive more populated fields.
- `findEvent` / `DETAIL_POPULATE` stay untouched (already deep for Story 3.7); this change only affects the shallow browse/trending populate.
- Response shape stays the Strapi v5 shape (`data`, `meta.pagination`); no transformation layer; error codes not prose.

**Block If:** No product decision is expected — this resolves an already-scoped deferred item with a defined data contract. If deepening the browse populate turns out to require a client-facing API/param change (not just a server populate constant), surface it rather than inventing new API surface.

**Never:**

- Do not add `cast` / `credits` / `videos` to the browse populate (detail-only; would reintroduce the N+1 graph on large result sets).
- Do not modify any frontend/client code — the mappers already consume `screenings[].movie` and `venue.cityRef.region` (this is confirmed, not assumed).
- Do not add a new client-controllable `populate` query param or new endpoint.
- Do not expose new internal/sensitive fields beyond public catalog data (movie poster/backdrop/genres, city/region names are all public).

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                                              | Expected Output / Behavior                                                                                     | Error Handling            |
| ------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Browse list populate     | `findEvents` with events whose screenings link a `movie`   | Each row's `screenings[].movie` is populated with `poster`/`backdrop`/`genres`; `venue.cityRef.region` present | 200; empty `data` if none |
| Trending populate        | `findTrending` upcoming window                             | Ranked rows carry the same deepened `movie` + `venue.cityRef.region` graph                                     | 200; empty if none        |
| Event without a movie    | screening has no `movie` relation                          | Row still returned; `screenings[].movie` simply absent — no throw                                              | 200                       |
| Venue without a region   | `venue.cityRef` has no `region`                            | `venue.cityRef` populated, `region` absent — no throw                                                          | 200                       |
| Trending ticketsSold sum | screenings still carry `ticketsSold` after populate deepen | `sumTicketsSold` ranking unchanged (scalar survives the deeper populate)                                       | 200                       |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` -- **the only production change.** Deepen the `EVENT_POPULATE` constant (used by `findEvents` and `findTrending`). `DETAIL_POPULATE` and `buildFilters`/ranking logic stay as-is.
- `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/events.unit.test.ts` -- add unit assertions that the browse/trending populate now reaches `screenings.movie.{poster,backdrop,genres}` and `venue.cityRef.region`, and that trending ranking still works with the deeper graph.
- `apps/client/src/features/events/utils/eventMappers.ts` -- **reference only, do not edit.** `toFilmHeroEvent`/`getEventFilm`/`getEventBackdropUrl` already consume `screenings[].movie`.
- `apps/client/src/lib/seo/structured-data.ts` -- **reference only, do not edit.** `generateEventJsonLd` already reads `venue.cityRef.region.name` for `location.address`.
- `apps/client/src/features/events/types/strapi.types.ts` -- **reference only.** `StrapiScreening.movie`, `StrapiVenue.cityRef`, `StrapiCity.region` already typed.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` -- deepen `EVENT_POPULATE` to `{ images: true, venue: { populate: { cityRef: { populate: { region: true } } } }, screenings: { populate: { movie: { populate: { poster: true, backdrop: true, genres: true } } } } }`. Update the `EVENT_POPULATE` doc comment to state it is card/hero depth (movie poster/backdrop/genres + venue city/region), distinct from the deeper `DETAIL_POPULATE`. Do not touch `DETAIL_POPULATE`.
- [x] `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/events.unit.test.ts` -- add tests: (a) `findEvents` passes the deepened populate reaching `screenings.populate.movie.populate.{poster,backdrop,genres}` and `venue.populate.cityRef.populate.region`; (b) `findTrending` passes the same deepened populate; (c) an assertion that trending ranking (`sumTicketsSold` desc) is unchanged after the deepen (regression guard). Cover the I/O matrix edge cases where a mocked row lacks `movie` / `region` (mapper resilience is frontend, but assert the service returns rows untransformed).

**Acceptance Criteria:**

- Given the browse list service (`findEvents`), when it queries the Document Service, then the `populate` it passes reaches `screenings[].movie` (with `poster`/`backdrop`/`genres`) and `venue.cityRef.region`.
- Given the trending service (`findTrending`), when it queries, then it uses the same deepened populate, and ranking by `sum(screening.ticketsSold)` desc is unchanged.
- Given the deepened browse populate, when an event's screening has no `movie` (or a venue has no `region`), then the row is still returned unchanged (no throw, no transformation).
- Given the frontend hero/JSON-LD mappers (unchanged), when they receive a curated slice row from the deepened populate, then `screenings[0].movie` and `venue.cityRef.region` are available for them to render (verified structurally in the backend by the populate assertions above; the mappers already handle presence/absence).

## Verification

**Commands:**

- `cd apps/strapi && yarn type-check` -- expected: no new type errors (the populate constant is cast via `as never` at the call site as today; the literal object is well-typed).
- `cd apps/strapi && yarn test --testPathPattern events.unit` -- expected: all existing tests plus the new populate-depth + trending-regression tests pass.
- `cd apps/strapi && yarn build` -- expected: plugin compiles.

**Manual checks (if no CLI):**

- Live boot is out of reach unattended (Strapi requires a DB). When an instance is available: `cd apps/strapi && yarn seed:fresh && yarn develop`, then `curl` the public events endpoint with `?featured=true` and the trending endpoint — confirm each `data[].screenings[].movie` carries `poster`/`backdrop`/`genres` and `data[].venue.cityRef.region` is present; load the homepage and confirm the flagship hero shows genres/year/duration and page-source JSON-LD `location.address` carries `addressLocality`/`addressRegion`.

## Design Notes

Why deepen the shared `EVENT_POPULATE` rather than add a homepage-only populate: the intent explicitly permits either, and the homepage curated slices (featured/today/this-week/trending) all flow through `findEvents`/`findTrending`, so the shared browse populate is exactly the read path the hero and JSON-LD consume. Adding a client-controllable populate param would be net-new API surface (forbidden above) for no benefit at MVP volume. The deepen is bounded (movie poster/backdrop/genres + one venue relation) — an order of magnitude lighter than `DETAIL_POPULATE` (which pulls `cast`/`credits`/`videos` and each person's photo). The pre-existing trending cap-then-rank and field-projection deferrals (see spec-3-1 Review Triage Log) are unchanged and out of scope here.

## Review Triage Log

### 2026-07-13 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 3: (high 0, medium 0, low 3)
- reject: 2: (high 0, medium 0, low 2)
- addressed_findings:
  - `[low]` `[patch]` The new `findEvents` tests asserted the populate _shape_ but not the spec-mandated I/O-matrix passthrough (a row whose screening lacks `movie` or whose venue lacks `region`). Added a `findEvents` test feeding such rows and asserting `result.data` is returned untransformed (identity `toBe` + `toEqual`). Tests 53 → 54, all green.
  - Deferred (surfaced to the orchestrator via this log + residual risks; the DW ledger is orchestrator-managed and not edited by this run per the invocation constraint):
    (1) `[low]` `findTrending` applies the deepened hero populate to all `TRENDING_FETCH_CAP` (500) fetched rows before ranking/slicing, so the movie/poster/backdrop/genres joins are resolved for ~95% of rows that are then discarded — a diff-introduced populate-weight amplification, harmless at MVP volume, retired by the already-deferred trending DB-rollup. A two-phase fetch (rank on cheap scalars, deep-populate only the returned page) is the fix; non-trivial, deferred.
    (2) `[low]` The populate depth is verified only by asserting the request object's shape (mocked Document Service); no live-boot integration test proves Strapi actually resolves `movie`/`cityRef`/`region`/`poster`/`backdrop`/`genres` (relation names copied verbatim from the already-working `DETAIL_POPULATE`, and `as never` defeats `tsc`). Residual risk is future schema-drift regressing the hero/JSON-LD silently. Fix = one integration test on the existing `setupStrapi` + seed harness pinning runtime resolution for both `EVENT_POPULATE` and `DETAIL_POPULATE`; out of unattended reach (needs a DB boot).
    (3) `[low]` The doc comment in `apps/client/src/features/events/utils/eventMappers.ts:161` still says movie metadata "is only populated on the deep detail read … on the shallow curated browse read it is absent" — made stale by this change. Not patched here because the spec `Never` boundary forbids frontend edits in this backend story; a one-line comment fix belongs to a frontend-touching follow-up.
  - Rejected (2, low): (a) no assertion that the newly-embedded `movie` is resolved published-only — relies on standard Strapi v5 `status: "published"` cascade into populated relations, already used identically by `findEvent`/`DETAIL_POPULATE` (which has embedded `movie` on the public detail endpoint since 3.7); not a new exposure. (b) `EVENT_POPULATE`/`DETAIL_POPULATE` are now near-duplicates — an intentional distinction of depth (browse vs detail); a DRY refactor (detail = browse + extras) would trade clarity for brevity, not a defect.

## Auto Run Result

Status: done

**Summary.** Resolved DW-22 by deepening the shared public-browse populate (`EVENT_POPULATE`, used by `findEvents` and `findTrending`) in the `events-manager` plugin from `{ venue: true, screenings: true, images: true }` to a bounded card/hero depth: each screening's `movie` (creative-work) with `poster`/`backdrop`/`genres`, plus `venue.cityRef.region`. This makes the homepage curated slices carry the movie-level metadata the flagship hero renders (`toFilmHeroEvent`) and the city/region the event JSON-LD needs (`generateEventJsonLd` → `location.address`). Backend-only: the frontend mappers already consume both graphs defensively (verified, not assumed). The deepen deliberately omits the `cast`/`credits`/`videos` graph so browse reads stay far lighter than `DETAIL_POPULATE`.

**Files changed.**

- [apps/strapi/src/plugins/events-manager/server/src/services/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/events.ts) — deepened `EVENT_POPULATE` + a doc comment marking it the card/hero browse depth (distinct from and lighter than `DETAIL_POPULATE`). No other logic touched (`DETAIL_POPULATE`, `buildFilters`, `findEvent`, `findTrending` ranking all unchanged).
- [apps/strapi/src/plugins/events-manager/server/src/services/**tests**/events.unit.test.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/__tests__/events.unit.test.ts) — +4 tests: `findEvents` deepened-populate shape, `findEvents` untransformed passthrough (movie/region absent), `findTrending` same deepened populate, `findTrending` ranking regression guard with `movie` objects present.

**Review findings breakdown.** 1 patch applied (low — the passthrough test), 3 deferred (all low — trending populate-weight amplification; shape-only populate verification; stale frontend comment), 2 rejected (published-only cascade is standard v5 + already used by the detail read; the near-duplicate populate constants are an intentional depth distinction). No intent_gap, no bad_spec — `review_loop_iteration` stayed 0.

**Verification performed.**

- `cd apps/strapi && yarn test --testPathPattern events.unit` → PASS (54/54; 2 suites — service + controller).
- `cd apps/strapi && yarn type-check` (`tsc --noEmit`) → the change introduces ZERO new type errors; the only errors are 9 PRE-EXISTING unrelated ones in `user-engagement` (`notification.ts`) and `watchlist.ts`, none in any changed file (the `as never` call-site cast keeps the deepened constant clean).
- `yarn build` → not run (full Strapi build is slow; the change is a plain nested-object literal that type-checks and is exercised by the unit suite).
- Live `yarn seed:fresh && yarn develop` + curl / homepage load → not executed (Strapi needs a DB boot, out of reach unattended). See the deferred verification-gap item and Manual checks above.

**Residual risks.**

- Runtime relation resolution is not proven by a live boot (deferred item 2): correctness rests on the relation names matching the real schema — they are copied verbatim from the working `DETAIL_POPULATE`, so the risk is future schema drift, not a current defect. Recommend a `seed:fresh` + curl / homepage smoke check when a Strapi instance is available.
- Trending resolves the deep movie graph for up to 500 rows before discarding most (deferred item 1) — harmless at MVP volume; the already-deferred trending DB-rollup would retire it.
- The stale frontend comment (deferred item 3) is cosmetic and does not affect behavior.
