---
phase: 01-short-film-catalog-backend
plan: 03
subsystem: api
tags:
  [strapi, document-service, zod, i18n, public-api, short-film, jest, supertest]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-01 boot harness and spike verdicts (A3 uid slug not copied to a new locale row, A4 relations from the default-locale row, A5 nested credits filter); 01-02 schema delta (country, language, streamingLinks, featured, featuredRank) and src/shared/short-film-rules.ts"
provides:
  - "GET /api/creative-works/creative-works/short-films: published-only, strictly allowlisted list (locale, genre, sort, page, pageSize) with meta.pagination"
  - "GET /api/creative-works/creative-works/short-films/:slug: detail by exact slug with coded 404 SHORT_FILM_NOT_FOUND"
  - "Coded error envelope (VALIDATION_FAILED, UNSUPPORTED_LOCALE, SHORT_FILM_NOT_FOUND, INTERNAL_ERROR) and the ShortFilmSummary / ShortFilmDetail response contract"
  - "French-fallback locale overlay (overlayLocalizedFields, overlayGenreNames) that never touches paging, sorting or counting"
  - "public-api facade methods findShortFilms and findShortFilm"
  - "seedShortFilmFixtures: publish-rule-compliant fixture graph with controllable publishedAt, reused by 01-04"
  - "SDATA-05 boot-integration suite (48 tests) and unit suites (21 validation, 18 service/facade)"
affects:
  [01-04, 01-05, 01-06, 01-09, 01-10, phase-02-shorts-client, phase-03-search]

actuals:
  tokens: 18250
  tasks: 3
  commits: 5

plan_head_before: 9a7ebb74f4e188c4d9659ca92fb4b3aa99169d00
plan_head_after: e96b2642921458b4c16fc3b28fe03c177030c41c

tech-stack:
  added: []
  patterns:
    - "Default-locale base query for filter/sort/page/count, then a one-shot overlay of translated fields for the page's documentIds"
    - "Allowlist projection building fresh objects from explicit keys; one toPublicMedia for every media object"
    - "Deterministic ordering: caller sort followed by id:desc so equal keys never reorder between requests or pages"
    - "Strict Zod query schemas parsed with the shared validate() kit; coded error envelope copied from venue-admin respondError"

key-files:
  created:
    - apps/strapi/src/plugins/creative-works/server/src/validation/short-films.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts
    - apps/strapi/src/plugins/creative-works/server/src/controllers/short-film.ts
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/validation/__tests__/short-films.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/__tests__/short-films.unit.test.ts
    - apps/strapi/tests/fixtures/short-films.ts
  modified:
    - apps/strapi/src/plugins/creative-works/server/src/controllers/index.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/index.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/__tests__/public-api.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts

key-decisions:
  - "A localized row counts as a translation only when its title is non-empty; then title, poster (if present) and synopsis (if present) replace the base values and item.locale becomes the requested locale, otherwise the whole base item is kept with its own locale"
  - "country and language are exposed as arrays ([] when the column is null) so Phase 2 never branches on null"
  - "meta.pagination.pageCount is ceil(total / pageSize), so it is 0 for an empty result, matching the events-manager precedent"
  - "Detail drops a credit or cast entry whose person did not populate (unpublished person) instead of exposing a null person"
  - "shortFilmSlugParamSchema is not .strict(): ctx.params only ever carries the route param, and the strict list/detail query schemas carry the D-10 guarantee"
  - "Genre names are localized independently of the film overlay, so a film with only an ar draft still shows the Arabic genre name while keeping its French title"

patterns-established:
  - "Locale overlay is a pure exported function over already-projected items, unit-testable without Strapi"
  - "Fixtures create the ar row of every credited person and credit-role BEFORE the ar row of a work that has credits (see Issues Encountered)"

requirements-completed: [SDATA-03, SDATA-05]

coverage:
  - id: D1
    description: "Anonymous list returns only published short films in flat Strapi v5 shape with documentId and meta.pagination; the draft short and the published film are excluded"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts#GET short-films list (integration)"
        status: pass
    human_judgment: false
  - id: D2
    description: "List accepts exactly locale, genre, sort, page, pageSize; facet params, unknown keys, bad sorts and out-of-range paging answer 400 VALIDATION_FAILED, an unlisted locale 400 UNSUPPORTED_LOCALE, never 500"
    requirement: SDATA-03
    verification:
      - kind: unit
        ref: "apps/strapi/src/plugins/creative-works/server/src/validation/__tests__/short-films.unit.test.ts (21 tests)"
        status: pass
      - kind: integration
        ref: "short-films.service.test.ts#coded errors"
        status: pass
    human_judgment: false
  - id: D3
    description: "Detail by exact slug with coded 404 for an unknown slug, a draft-only short and a non-short work"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "short-films.service.test.ts#GET short-films/:slug (integration)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No response contains provider_metadata, hash, provider, folderPath, createdBy, updatedBy, createdAt, updatedAt, externalIds, theatreDetails or a numeric id at any depth (list, detail and with the overlay applied)"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "short-films.service.test.ts#never exposes internal keys (list, detail, overlay)"
        status: pass
      - kind: unit
        ref: "services/__tests__/short-films.unit.test.ts#toPublicMedia, toShortFilmSummary"
        status: pass
    human_judgment: false
  - id: D5
    description: "Locale fallback: ar serves the published Arabic title/synopsis with locale ar, French (locale fr) when the ar row is missing or only a draft, identical total and order to the French list, UNSUPPORTED_LOCALE for an unlisted locale"
    requirement: SDATA-03
    verification:
      - kind: integration
        ref: "short-films.service.test.ts#locale fallback (integration)"
        status: pass
      - kind: unit
        ref: "services/__tests__/short-films.unit.test.ts#overlayLocalizedFields, overlayGenreNames"
        status: pass
    human_judgment: false
  - id: D6
    description: "SDATA-05 edge cases against a real booted Strapi: page-boundary walk with no duplicate or gap, unknown genre and past-the-end empty results, releaseYear tie resolved by id descending and identical across requests, each of the eight sorts"
    requirement: SDATA-05
    verification:
      - kind: integration
        ref: "short-films.service.test.ts#sorts, #pagination, #filters by genre slug"
        status: pass
    human_judgment: false
  - id: D7
    description: "public-api facade exposes findShortFilms and findShortFilm delegating to the short-films service (kernel R3)"
    requirement: SDATA-03
    verification:
      - kind: unit
        ref: "services/__tests__/public-api.unit.test.ts#creative-works public-api facade: short films (unit)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Concurrency edge (a public read concurrent with a publish returns the pre- or post-publish state, never a draft row)"
    requirement: SDATA-03
    verification: []
    human_judgment: true
    rationale: "Backstop truth in the plan: guaranteed structurally because every read passes status published; no concurrent-publish race test was written, so a reviewer must accept the structural argument"

duration: 28min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 03: Public Short-Film Read Contract Summary

**Public, unauthenticated short-film list and detail routes in the creative-works plugin: strict Zod allowlisted query, published-only default-locale reads with an `id:desc` tiebreak, explicit allowlist projection, a French-fallback locale overlay that never affects paging, and a 48-test boot suite proving it all on a real Strapi.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-10-18T17:41:57Z
- **Completed:** 2026-10-18T18:10Z
- **Tasks:** 3 (Task 1 tracer, Tasks 2 and 3 TDD)
- **Files modified:** 12 (7 created, 5 modified), 5 task commits

## Accomplishments

- `GET /api/creative-works/creative-works/short-films` and `.../short-films/:slug` are live with `auth: false`; the list answers `{ data, meta: { pagination } }` in flat Strapi v5 shape with `documentId`, the detail answers `{ data }`.
- The query is strict (`locale`, `genre`, `sort`, `page`, `pageSize` only; 8 allowlisted sorts, `pageSize` default 24 and max 48, `page` max 10000); every violation is a coded 400, never a 500.
- Every read passes `status: "published"` and `filters.type = "short-film"` on the default-locale row; the draft short and the published film never appear in list or detail.
- `toShortFilmSummary` / `toShortFilmDetail` / `toPublicMedia` build fresh objects from explicit keys, so `provider_metadata`, `hash`, `provider`, audit columns and numeric ids cannot leak; a recursive key walk in the boot suite proves it for list, detail and the overlay.
- Locale overlay: one extra `findMany` for the page's documentIds plus one genre query; the Arabic fixture title round-trips byte-identical, partial translations fall back to French, and `total` / order / page boundaries equal the French list.
- Facade `findShortFilms` / `findShortFilm` added to `public-api.ts`.

## Task Commits

1. **Task 1: End-to-end list route (tracer)** - `e6ac3c6` (feat)
2. **Task 2 RED: failing detail, sort, genre and pagination cases** - `b3a91f1` (test)
3. **Task 2 GREEN: detail by slug with allowlist projection** - `74608c5` (feat)
4. **Task 3 RED: failing locale overlay and facade cases** - `b7042cd` (test)
5. **Task 3 GREEN: French-fallback locale overlay and facade methods** - `e96b264` (feat)

No REFACTOR commits (no cleanup needed). **Plan metadata:** committed with this SUMMARY (docs: complete plan).

Tracer gate: the tracer `<verify>` (rebuilt dist, boot suite, 5/5) passed before expansion; "Tracer verified end-to-end, expanding". The run is interactive with `end-of-phase` human-verify mode and an automated-only verify, so no checkpoint was raised.

## TDD evidence

**Task 2 RED** (`b3a91f1`): boot suite after the fixtures and detail cases were added, before the detail handler existed. Command: `yarn workspace @tiween/admin jest --selectProjects server --testMatch='**/short-films.service.test.ts' --runInBand` from a rebuilt dist/. Result: `Tests: 8 failed, 27 passed, 35 total`. The 8 failures are exactly the detail cases (detail keys, credits/streaming links/distinctions, five 404 cases, malformed-slug 400): `GET /short-films/:slug` was not routed, so the responses carried no coded error. Semantic assessment: target tests executed and failed on the planned assertions for the intended reason (missing detail route), not on setup. The 27 passing cases are the list-side behaviors already delivered by the Task 1 tracer, now exercised against the fixture graph. The new validation unit file (`validation/__tests__/short-films.unit.test.ts`) passed immediately (21/21) because the schemas were delivered in Task 1 as the plan specified; it is a characterization of that code, not a RED. One earlier RED attempt failed in seeding (see Deviations 1) and was fixed before it counted.
**Task 2 GREEN:** `Tests: 35 passed, 35 total` (boot) and `21 passed` (validation unit).

**Task 3 RED** (`b7042cd`): `yarn workspace @tiween/admin jest src/plugins/creative-works/server/src/services/__tests__` gave `Tests: 12 failed, 18 passed, 30 total` (`overlayLocalizedFields`, `overlayGenreNames`, `findShortFilms`, `findShortFilm` are not functions: the symbols did not exist, which is the failure the plan asks for). Boot suite against the same dist: `Tests: 4 failed, 44 passed, 48 total`; the 4 failures are assertion failures on the overlay (Arabic title missing, Arabic genre name missing, Arabic detail synopsis missing). An earlier run showed 5 failures partly caused by a missing import in the test file (`ReferenceError`), which was corrected so the RED reflects real behavior. The repo has no `workflow.tdd_mode` config, so `check tdd-red-evidence` was not run.
**Task 3 GREEN:** unit `Tests: 30 passed, 30 total` (2 suites), boot `Tests: 48 passed, 48 total`.

## Verification run

- Boot suite (sentinel `apps/strapi/dist/src/index.js` deleted, `build:test-dist` re-emitted, `test -f` asserted, then `jest --selectProjects server --testMatch='**/short-films.service.test.ts' --runInBand`): `Test Suites: 1 passed, 1 total`, `Tests: 48 passed, 48 total`; zero `500` responses or `unmapped` errors in the captured log.
- `yarn workspace @tiween/admin jest src/plugins/creative-works/server/src/validation/__tests__/short-films.unit.test.ts`: 21 passed.
- `yarn workspace @tiween/admin jest src/plugins/creative-works/server/src/services/__tests__`: 2 suites, 30 passed.
- `yarn workspace @tiween/admin test`: `Test Suites: 92 passed`, `Tests: 1390 passed` (was 87 suites / 1319 tests after 01-02).
- `yarn workspace @tiween/admin lint` (`eslint . --max-warnings=0`): clean. Prettier clean on every touched file. `tsc --noEmit` reports no error in any touched file.
- Acceptance greps: `path: "/creative-works/short-films"` count 1 with `auth: false`; `.strict()` appears in the validation file (the two query schemas are strict); `status: "published"` count 3 in the service; `export function overlayLocalizedFields` count 1; `findShortFilms|findShortFilm\b` count 2 in `public-api.ts`; `provider_metadata` count 3 in the fixtures; the suite contains `unknown-genre`, `page=4`, the releaseYear tie, `locale: "ar"` and `locale: "en"` cases; `/short-films/:slug` is the last short-films route in `content-api.ts`.

## Files Created/Modified

- `apps/strapi/src/plugins/creative-works/server/src/validation/short-films.ts` - `SHORT_FILM_SORTS`, strict list/detail query schemas, slug param schema
- `apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts` - `resolveLocale`, `list`, `findBySlug`, projections, overlay helpers, public-contract JSDoc
- `apps/strapi/src/plugins/creative-works/server/src/controllers/short-film.ts` - `list`, `findOne`, exported `STATUS_BY_CODE` and `respondError`
- `apps/strapi/src/plugins/creative-works/server/src/controllers/index.ts`, `services/index.ts` - registration of `short-film` and `short-films`
- `apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts` - the two public routes (existing four routes untouched)
- `apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts` - `findShortFilms`, `findShortFilm`
- `apps/strapi/tests/fixtures/short-films.ts` - `seedShortFilmFixtures`, `SHORT_FILM_SLUGS`, `GENRE_SLUGS`, Arabic string constants
- `apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts` - SDATA-05 boot suite (`.tmp/short-films.db`)
- `apps/strapi/src/plugins/creative-works/server/src/validation/__tests__/short-films.unit.test.ts`, `services/__tests__/short-films.unit.test.ts`, `services/__tests__/public-api.unit.test.ts` - unit suites

## Decisions Made

See `key-decisions` above. The fixture table is exactly the one 01-04 expects (sf-alpha ... sf-golf, sf-delta-draft in drame with person-one, ff-feature), so 01-04 adds cases without changing counts. Extra fixture detail 01-04 can rely on: alpha carries a winning distinction (hasAwards true) and an `ar` published row; charlie carries an `ar` draft only; golf has a trailer video and no streaming link (availableOnline false).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixture could not create an `ar` row for a work that has credits**

- **Found during:** Task 2 (first RED run of the boot suite)
- **Issue:** `strapi.documents(CW).update({ documentId, locale: "ar", data })` threw `Document with id "...", locale "ar" not found`. Strapi's `update` on a missing locale copies the work's non-localized fields (`copyNonLocalizedFields`), including the `credits` component, and then resolves the `person` / `creditRole` relations in the new locale. Both targets are localized content types with no `ar` row. Once those existed, the credit-role `ar` row failed on its own required `slug` (uids are not copied, as 01-01 A3 found).
- **Fix:** `seedShortFilmFixtures` creates and publishes the `ar` row of each credited person (empty data) and of the `director` credit-role (`name` and an explicit `slug`) before the work's `ar` row.
- **Files modified:** `apps/strapi/tests/fixtures/short-films.ts`
- **Verification:** boot suite 48/48.
- **Committed in:** `b3a91f1`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** None on scope. It surfaced a real constraint for later plans (next section). Also noted, not a deviation: the plan listed `shortFilmSlugParamSchema` without a strictness requirement and it is intentionally not `.strict()`.

## Issues Encountered

- **Finding for 01-09 and 01-10 (important):** creating a translation row for a creative-work that already has `credits` (or any non-localized component relation to a localized type) fails with `Document ... locale "ar" not found` unless every referenced person and credit-role already has a row in that locale, and a required uid (credit-role `slug`) must be passed explicitly. This was observed through the Document Service in the fixtures; the root cause was read from `@strapi/core` (`update` falls back to `entries.create` with `copyNonLocalizedFields`). It was not isolated by a dedicated probe, so which of person or credit-role is individually sufficient is unverified, and the content-manager `PUT ?locale=` path (01-09 locale tabs) was not re-tested with credits. 01-01 A3 only probed a work without relations. The existing `createWork` flow is unaffected because it creates works without credits. 01-09 should either test a translated save on a credited work or ensure target `ar` rows exist; 01-10 must create person and credit-role rows in every locale it writes translations for.
- Boot suites refuse to start when any `.ts` under `src/` is newer than `dist/`; editing a test file requires a `build:test-dist` rebuild before the run (a stale dist made every case fail until rebuilt).
- Pre-commit hooks (turbo lint, commitlint) take about 1 min per commit; commitlint rejects body lines over 100 characters (one commit was retried with shorter lines). No `--no-verify`.
- The `yarn build:test-dist` run reports pre-existing TypeScript errors elsewhere (it is `--noEmitOnError false`); none are in files touched by this plan.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. Mitigated in code and tests: T-01-06 (every read passes `status: "published"` and `filters.type`; draft and film asserted absent from list and detail), T-01-07 (allowlist projection; fixtures carry `provider_metadata` and the recursive key walk asserts absence), T-01-08 (strict schemas, enum sorts, `page` max 10000, `pageSize` max 48, coded 400 and zero 500 in the suite), T-01-09 (overlay reads only published rows of the requested locale and only `documentId`, `title`, `synopsis`, `poster`), T-01-SC (no dependency added, lockfile untouched). The two new routes are unauthenticated and not yet rate limited; the limiter lands in 01-05. `apps/strapi/.env` was neither read nor staged.

## Next Phase Readiness

- 01-04 can add `featured` and `:slug/related` above the `:slug` route; the fixture table already carries featured ranks, the related director/genre groups and the draft decoy. It can import `toShortFilmSummary`, `overlayLocalizedFields`, `overlayGenreNames`, `resolveLocale`, the populate constants (module-private today: export `SUMMARY_POPULATE` there if needed) and `respondError` / `STATUS_BY_CODE`.
- 01-05 owns rate limiting, removal of the four legacy routes and the contract document; the contract is the JSDoc at the top of `services/short-films.ts` plus the types exported from it.
- 01-06 merge order is irrelevant: every published fixture satisfies D-19.
- Postgres behaviour (NULL ordering on `duration`/`releaseYear`, text collation, nested relation filters) is still unverified; the fixtures avoid nulls in sort columns and use lowercase ASCII titles.

## Self-Check: PASSED

- FOUND: apps/strapi/src/plugins/creative-works/server/src/validation/short-films.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/controllers/short-film.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/**tests**/short-films.service.test.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/validation/**tests**/short-films.unit.test.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/services/**tests**/short-films.unit.test.ts
- FOUND: apps/strapi/tests/fixtures/short-films.ts
- FOUND commits e6ac3c6, b3a91f1, 74608c5, b7042cd, e96b264

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
