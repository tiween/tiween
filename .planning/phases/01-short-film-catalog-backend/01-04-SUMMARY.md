---
phase: 01-short-film-catalog-backend
plan: 04
subsystem: api
tags:
  [strapi, document-service, zod, i18n, public-api, short-film, jest, supertest]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-03 public list/detail service, allowlist projections, locale overlay, respondError, seedShortFilmFixtures; 01-01 spike A5 (nested credits.person + creditRole.slug filter works on SQLite); 01-02 DIRECTING_ROLE_SLUGS"
provides:
  - "GET /api/creative-works/creative-works/short-films/featured: published featured shorts, rank asc with unranked last, then publishedAt desc, then id desc, capped at 12"
  - "GET /api/creative-works/creative-works/short-films/:slug/related: same-director shorts first, then shared-genre shorts, newest first, self excluded, de-duplicated, capped at 6, coded 404 SHORT_FILM_NOT_FOUND"
  - "Route order list, featured, :slug/related, :slug"
  - "Exported FEATURED_LIMIT, RELATED_LIMIT, sortFeatured, mergeRelated, findRelatedDeterministic (Phase 3 swap point)"
  - "public-api facade findFeaturedShortFilms and findRelatedShortFilms"
affects: [01-05, 01-09, phase-02-shorts-client, phase-03-search]

actuals:
  tokens: 6725
  tasks: 2
  commits: 3

plan_head_before: 77d8a3c277e2a145d0fba5b967a09f39f4ab660c
plan_head_after: ea00eceaa54884e22a79ec8bc2f2971d6c4dab73

tech-stack:
  added: []
  patterns:
    - "Engine-independent ordering: fetch a capped, deterministically sorted set, then order by featuredRank in JavaScript so SQLite and Postgres NULL ordering cannot differ"
    - "Related logic isolated in one exported function over raw rows; the service method only resolves the source, calls it, then localizes and projects"
    - "Pure exported helpers (sortFeatured, mergeRelated) unit-tested without Strapi; HTTP behavior pinned by the boot suite"

key-files:
  created: []
  modified:
    - apps/strapi/src/plugins/creative-works/server/src/validation/short-films.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts
    - apps/strapi/src/plugins/creative-works/server/src/controllers/short-film.ts
    - apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/__tests__/short-films.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/__tests__/public-api.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts

key-decisions:
  - "Featured fetches the newest 100 featured published shorts (publishedAt:desc, id:desc) and orders them in JavaScript; the DB sort is only there so the 100-row safety cap is deterministic and engine-independent, the contract order comes from sortFeatured"
  - "findRelatedDeterministic returns raw default-locale rows (summary populate) and the service localizes and projects, so a Meilisearch implementation can replace only the row source"
  - "Related uses the nested credit filter confirmed by spike A5; no in-memory fallback was added. The second (genre) query excludes self and the director ids with $notIn, and mergeRelated still de-duplicates defensively"
  - "related reuses shortFilmDetailQuerySchema (locale only, strict) so a paging key such as page=1 is a 400 VALIDATION_FAILED"

patterns-established:
  - "New public short-film routes are registered above :slug with auth: false and the same coded error envelope"

requirements-completed: [SDATA-03, SDATA-05]

coverage:
  - id: D1
    description: "Featured route returns only published featured shorts in D-05 order (charlie, bravo, alpha, echo), capped at 12, a featured draft never appears, locale overlay applied, summary shape only"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts#GET short-films/featured (integration)"
        status: pass
      - kind: unit
        ref: "services/__tests__/short-films.unit.test.ts#sortFeatured"
        status: pass
    human_judgment: false
  - id: D2
    description: "Related route returns director matches then genre matches, newest first, self excluded, a director-and-genre match listed once, empty list when nothing overlaps, 404 SHORT_FILM_NOT_FOUND for an unknown slug, a draft-only short and a non-short work"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "short-films.service.test.ts#GET short-films/:slug/related (integration)"
        status: pass
      - kind: unit
        ref: "services/__tests__/short-films.unit.test.ts#mergeRelated"
        status: pass
    human_judgment: false
  - id: D3
    description: "Route order list, featured, :slug/related, :slug: featured and related are never captured as a slug"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "short-films.service.test.ts (is not captured by the :slug detail route, featured and related)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Query validation: unknown key on featured and page=1 on related answer 400 VALIDATION_FAILED, an unlisted locale 400 UNSUPPORTED_LOCALE, never 500"
    requirement: SDATA-05
    verification:
      - kind: integration
        ref: "short-films.service.test.ts (featured and related validation cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "public-api facade exposes findFeaturedShortFilms and findRelatedShortFilms delegating to the short-films service"
    requirement: SDATA-03
    verification:
      - kind: unit
        ref: "services/__tests__/public-api.unit.test.ts#creative-works public-api facade: featured and related (unit)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Featured and related ordering and relation filters behave identically on Postgres (NULL ordering, nested credit filter)"
    requirement: SDATA-05
    verification: []
    human_judgment: true
    rationale: "Boot suites run on SQLite only. Featured order is computed in JavaScript so it is engine-independent by construction, but the nested credits filter used by related was confirmed by spike A5 on SQLite only; a Postgres run needs a human or a staging check"

duration: 15min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 04: Featured and Related Short-Film Routes Summary

**Public `featured` (rank asc, unranked last, ties by newest, ordered in JavaScript) and deterministic `related` (same director first, then shared genre) short-film routes registered ahead of `:slug`, with the related logic isolated in `findRelatedDeterministic` for the Phase 3 Meilisearch swap, plus facade methods.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-10-18T19:55:20Z
- **Completed:** 2026-10-18T20:11Z
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD)
- **Files modified:** 8 (all modified, none created), 3 task commits

## Accomplishments

- `GET .../short-films/featured` answers `{ data }` with exactly charlie, bravo, alpha, echo on the fixtures: rank 1, then the rank-2 pair newest first, then the unranked film; the featured draft `sf-delta-draft` never appears. `?locale=ar` serves the Arabic title for alpha with locale `ar`.
- `GET .../short-films/:slug/related` answers alpha -> [charlie, foxtrot], bravo -> [echo], golf -> `[]` with status 200, and 404 `SHORT_FILM_NOT_FOUND` for the draft-only short, an unknown slug and the non-short work. charlie, which matches alpha by director and by genre, appears once.
- `sortFeatured` and `mergeRelated` are pure exported helpers with unit tests (rank order, nulls last, pg string ranks, publishedAt tie, id tie, empty input, no mutation; director-first, dedupe, self removal, cap, empty).
- `findRelatedDeterministic` carries the Phase 3 JSDoc and is the single place a Meilisearch similar-documents source would replace.
- Facade `findFeaturedShortFilms(locale?)` and `findRelatedShortFilms(slug, locale?)` join `findShortFilms` and `findShortFilm`.

## Task Commits

1. **Task 1: Featured route end to end (tracer)** - `673b95d` (feat)
2. **Task 2 RED: failing related, mergeRelated and facade cases** - `e25900f` (test)
3. **Task 2 GREEN: deterministic related and facade methods** - `ea00ece` (feat)

No REFACTOR commit (no cleanup needed). **Plan metadata:** committed with this SUMMARY (docs: complete plan).

Tracer gate: the tracer `<verify>` (unit suite, rebuilt dist, boot suite) passed before expansion: "Tracer verified end-to-end, expanding". The run is interactive with `end-of-phase` human-verify mode and an automated-only verify, so no checkpoint was raised.

## TDD evidence

**Task 2 RED** (`e25900f`): `yarn workspace @tiween/admin jest src/plugins/creative-works/server/src/services/__tests__` gave `Tests: 8 failed, 38 passed, 46 total`; the 8 failures are `mergeRelated is not a function` (5) and `facade.findFeaturedShortFilms` / `findRelatedShortFilms is not a function` (3), i.e. the symbols did not exist. Boot suite from a rebuilt dist (sentinel deleted, `build:test-dist`, `test -f`, `--runInBand`): `Tests: 12 failed, 55 passed, 67 total`; the 12 failures are exactly the new related cases, failing because `/short-films/:slug/related` was not routed (the 55 earlier cases, including the 7 featured cases, still passed). Semantic assessment: the target tests executed and failed on the planned behavior (missing route and missing exports), not on setup or syntax. The repo has no `workflow.tdd_mode` config, so `check tdd-red-evidence` was not run.

**Task 2 GREEN:** unit `Tests: 46 passed, 46 total` (2 suites), boot `Tests: 67 passed, 67 total` after rebuilding dist.

## Verification run

- Boot suite (sentinel `apps/strapi/dist/src/index.js` deleted, `build:test-dist`, `test -f` asserted, `jest --selectProjects server --testMatch='**/short-films.service.test.ts' --runInBand`): `Test Suites: 1 passed`, `Tests: 67 passed, 67 total` (was 48 after 01-03: 7 featured + 12 related added); zero `500` responses or `unmapped` errors in the captured log.
- `yarn workspace @tiween/admin jest src/plugins/creative-works/server/src/services/__tests__`: 2 suites, 46 passed.
- `yarn workspace @tiween/admin test`: `Test Suites: 96 passed`, `Tests: 1517 passed` (was 92 / 1390 after 01-03; the unit tests of this plan are included).
- `yarn workspace @tiween/admin lint` (`eslint . --max-warnings=0`): clean; the pre-commit turbo lint passed on all three commits. Prettier clean; `tsc --noEmit` reports no error in any touched file (an initial `Row[]` vs `{ documentId: string }[]` type error from `mergeRelated` was fixed with a `RelatedRow` type before the GREEN commit).
- Acceptance greps: `grep -n "short-films" routes/content-api.ts` lists list, `/featured`, `/:slug/related`, `/:slug` in that order; `export function sortFeatured` count 1; `findRelatedDeterministic` count 3 in `services/short-films.ts`; `findFeaturedShortFilms|findRelatedShortFilms` count 2 in `public-api.ts`.

## Files Created/Modified

- `validation/short-films.ts` - `shortFilmFeaturedQuerySchema` (strict, `locale` only) and its type
- `services/short-films.ts` - `FEATURED_LIMIT`, `RELATED_LIMIT`, `sortFeatured`, `mergeRelated`, `findRelatedDeterministic`, service `featured` and `related`
- `controllers/short-film.ts` - `featured` and `related` handlers
- `routes/content-api.ts` - `/short-films/featured` and `/short-films/:slug/related` above `:slug`, `auth: false`
- `services/public-api.ts` - facade `findFeaturedShortFilms`, `findRelatedShortFilms`
- `services/__tests__/short-films.unit.test.ts`, `services/__tests__/public-api.unit.test.ts`, `__tests__/short-films.service.test.ts` - unit and boot cases

## Decisions Made

See `key-decisions` above. The 01-02/01-06/01-08 orchestrator changes (fail-closed publish guard, https-only streaming URLs with `safeStreamingLinks`) were respected: both new routes project through `toShortFilmSummary`, so `availableOnline` keeps coming from the safe link list, and nothing from the removed behavior was reintroduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `mergeRelated` call failed type checking on `Row[]`**

- **Found during:** Task 2 (GREEN, `build:test-dist` output)
- **Issue:** `findRelatedDeterministic` passed `Record<string, any>[]` to the generic `mergeRelated<T extends { documentId: string }>`; an index signature does not satisfy a required property, so `tsc` reported TS2345 (the dist still emitted, so the boot run was green, but the error was real).
- **Fix:** Added a `RelatedRow = Row & { documentId: string }` type for the two query results and the return type.
- **Files modified:** `services/short-films.ts`
- **Verification:** `tsc --noEmit` clean for touched files; boot 67/67 on the rebuilt dist.
- **Committed in:** `ea00ece` (part of the Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** None on scope or behavior.

## Issues Encountered

- Pre-commit hooks (turbo lint of admin and client) take 1 to 1.5 min per commit; no `--no-verify`.
- Boot suites need `dist/` rebuilt after any `src/` edit including tests; done before every boot run (sentinel deleted, rebuilt, `test -f`).
- The Postgres behavior of the nested credit filter and of `$notIn` on relation-filtered queries is unverified (SQLite only), recorded as coverage D6.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. Mitigated in code and tests: T-01-10 (every query passes `status: "published"` and `type: "short-film"`; the featured draft and drafts in related are asserted absent), T-01-11 (featured fetch capped at 100 rows and 12 returned; related output capped at 6; no in-memory fallback fetch exists, so the 200-row cap was not needed), T-01-12 (specific routes registered before `:slug`; the boot suite asserts `featured` and `related` return arrays, not the detail 404), T-01-SC (no dependency added, lockfile untouched). Both routes are unauthenticated and not yet rate limited; the limiter lands in 01-05. `apps/strapi/.env` was neither read nor staged.

## Next Phase Readiness

- 01-05 can now rate limit all four public short-film routes, remove the legacy `/creative-works/featured`, `/type/:type` and `/search` routes (the new featured path is `/creative-works/short-films/featured`, distinct from the legacy `/creative-works/featured`), and document the contract (JSDoc of `services/short-films.ts` plus the exported types).
- Phase 2 can bind its hero to `featured` and its "related" rail to `related`; both answer the `ShortFilmSummary` shape.
- Phase 3 (SRCH-03) can switch the `related` controller path to Meilisearch and keep `findRelatedDeterministic` as the fallback without changing the response.

## Self-Check: PASSED

- FOUND: apps/strapi/src/plugins/creative-works/server/src/validation/short-films.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/controllers/short-film.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/services/**tests**/short-films.unit.test.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/services/**tests**/public-api.unit.test.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/**tests**/short-films.service.test.ts
- FOUND commits 673b95d, e25900f, ea00ece

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
