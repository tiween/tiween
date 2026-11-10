---
phase: 02-strapi-backed-shorts-pages
plan: 01
subsystem: frontend-data-layer
tags: [nextjs, strapi, vitest, zod, production-probe]
status: complete

requires:
  - phase: 01-shorts-data-and-admin
    provides: public short-films API (list, detail, related), strict allowlisted params, coded error envelope
provides:
  - reshaped ShortFilm types (ShortFilmPerson/Genre/CrewCredit/CastMember, 10-value PlatformType, access types, served locale)
  - pure mappers mapShortFilmSummary / mapShortFilmDetail (director from credits[], trailer from videos[])
  - rewritten server fetchers getShortFilm (React cache, 60s Data Cache, tags), getShortFilmsPage, getRelatedShortFilms with typed ShortFilmApiError
  - strict /api/shorts load-more route (400 bad input, 502 upstream failure, pageSize fixed at 24)
  - /[locale]/shorts/[slug] layout guard + page on real Strapi data (no static params, no mock import)
  - vitest include globs for shorts, watchlist, safe-callback-url, helpers
  - production probe (stub Strapi + next build/start matrix) asserting rendered states
affects: [02-02, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, phase-5]

actuals:
  tokens: 120000
  tasks: 3
  commits: 5
plan_head_before: b5420fe7080188e021641e1e0ea040569611e950
plan_head_after: d0d2c3afb11265a561cf4d0b18b59cf68d59c904

tech-stack:
  added: []
  patterns:
    - "Fetchers raise typed errors; the page/layout decides not-found vs error vs omitted shelf"
    - "Layout-level existence guard sharing one request with page and metadata through React cache()"
    - "Pure DTO-to-client mappers kept out of utils/index.ts to avoid a cycle"
    - "Probe asserts rendered state (stream markers + hydrated DOM) because the HTTP status is soft under [locale]/loading.tsx"

key-files:
  created:
    - apps/client/src/lib/strapi-api/content/shorts.errors.ts
    - apps/client/src/lib/strapi-api/content/shorts.test.ts
    - apps/client/src/features/shorts/utils/shortMappers.ts
    - apps/client/src/features/shorts/utils/shortMappers.test.ts
    - apps/client/src/app/[locale]/shorts/[slug]/layout.tsx
    - apps/client/src/app/[locale]/shorts/[slug]/layout.test.tsx
    - apps/client/src/app/[locale]/shorts/rendering-rules.test.ts
    - apps/client/test/fixtures/short-film-api.ts
    - apps/client/scripts/shorts-probe/stub-strapi.mjs
    - apps/client/scripts/shorts-probe/probe.mjs
  modified:
    - apps/client/src/lib/strapi-api/content/shorts.ts
    - apps/client/src/features/shorts/types/shorts.types.ts
    - apps/client/src/features/shorts/index.ts
    - apps/client/src/features/shorts/data/mock-shorts.ts
    - apps/client/src/lib/algolia/shorts.ts
    - apps/client/src/features/shorts/components/SuggestionForm/SuggestionForm.tsx
    - apps/client/src/app/api/shorts/route.ts
    - apps/client/src/app/api/shorts/route.test.ts
    - apps/client/src/app/[locale]/shorts/[slug]/page.tsx
    - apps/client/src/app/[locale]/shorts/[slug]/page.test.tsx
    - apps/client/vitest.config.ts

key-decisions:
  - "D-22 (owner, 2026-11-10): soft status accepted now. Unknown slug / outage render the not-found / error screen with noindex at HTTP 200 because app/[locale]/loading.tsx streams before the [slug] layout decides; the real 404/500 is Phase 5 success criterion 5"
  - "toShortFilmApiError sets code INTERNAL_ERROR for every upstream failure (including 400); the API's own code is kept in apiCode for logs"
  - "Trailer must be https and pass toSafeExternalUrl; streaming links only need toSafeExternalUrl"

patterns-established:
  - "Allowlisted query keys only: locale (detail/related), locale+page+pageSize (list), asserted by parsing the fetched URL in tests"
  - "Source-level rendering-rules test guards no generateStaticParams / no mock import / connection() on shorts routes"

requirements-completed: [SPAGE-01, SPAGE-02, SPAGE-05, FR56]

duration: ~3h (session wall clock, includes the wait for the D-22 owner decision)
completed: 2026-11-10
---

# Phase 2 Plan 01: Strapi-backed shorts detail path and production probe Summary

**Real Strapi short-film detail page through a typed fetcher, pure mapper and layout-level guard, a strict load-more route, and a stub-Strapi production probe that asserts the rendered not-found and error states (HTTP status deferred to Phase 5, D-22).**

## Accomplishments

- **Tracer (`e348965`).** `/{locale}/shorts/<slug>` now renders the real film. The director comes from the directing credit, the trailer from the `trailer` video, and the served locale is preserved for the French fallback (FR56). The `[slug]` layout calls `notFound()` only for the API's `SHORT_FILM_NOT_FOUND` or a slug that fails the API pattern (no Strapi request). Every other failure is rethrown. No `generateStaticParams`, no mock import.
- **Types and mappers.** `ShortFilm` is reshaped (people, genres, crew credits, cast, access types, 10-value platform enum, `country`/`language` arrays). The mapper drops hostile streaming and trailer URLs, never copies `rating`, and falls back to the slug when a title is blank.
- **Fetchers and route.** Only allowlisted query keys are sent, with a 60s Data Cache, cache tags and an 8s timeout. `/api/shorts` is a strict zod route: 400 on bad input, 502 on upstream failure, never a 200 with an empty list.
- **Related shelf (`a5c1179`).** `getRelatedShortFilms` raises typed errors. The page omits the shelf softly on any failure (D-20), excludes the viewed film and caps at six.
- **Probe (`e399b4f`, `d0d2c3a`).** The stub Strapi has ok/down/limited/slow/badjson modes and 400s any phantom query key. The probe builds with Strapi unreachable, then runs `next start` against the stub. It asserts the route is dynamic and not prerendered, the rendered not-found and error states with noindex (stream markers plus hydrated DOM via headless Chrome), no Strapi request for a pattern-failing slug, recovery on the very next request, and the load-more route. HTTP statuses are INFO lines only.
- The measured commit count of 5 includes the coordinator's docs commit `707a87c` (D-22). The plan's own commits are `e348965`, `a5c1179`, `e399b4f`, `d0d2c3a`.

## Verification

| Check                                                                                                    | Result                                   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `yarn workspace @tiween/client vitest run` shorts.test, shortMappers.test, route.test, `[locale]/shorts` | PASS, 6 files, 94 tests (Task 1)         |
| shorts.test.ts + `[slug]` suites after Task 2                                                            | PASS, 66 tests across 4 files            |
| `yarn workspace @tiween/client tsc --noEmit`                                                             | PASS, exit 0                             |
| eslint on scripts/shorts-probe and every changed file; repo-wide lint in each pre-commit hook            | PASS                                     |
| `node apps/client/scripts/shorts-probe/probe.mjs --detail-only` (full build)                             | PASS, last line `PROBE PASS (33 checks)` |
| Existing ShortsDirectory, ShortFilmCard, ShortFilmDetail, SuggestionForm suites                          | PASS                                     |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Probe could not drive default-locale paths.** Found during Task 3. The app redirects http to https unless `x-forwarded-proto: https` is sent, and `next start -H 127.0.0.1` broke the unprefixed `/shorts/...` internal rewrite (`EPROTO`). The probe now starts `next start -H localhost`, sends the header, follows redirects by hand, and forwards Chrome through a tiny local proxy. Commits `e399b4f`, `d0d2c3a`.

**2. [Rule 1 - Bug] Probe polluted by the persisted Data Cache.** Found during the D-22 rework. `.next/cache/fetch-cache` survives across `next start` runs and a stale entry is served when revalidation fails, so an earlier run hid the outage row. The probe deletes that directory before starting the app. Commit `d0d2c3a`.

**3. [Rule 3 - Blocking] Type-reshape fallout.** `SuggestionForm.tsx` platform map retyped from `PlatformType` to the suggestion platform list, `mock-shorts.ts` country/language became code arrays, and `lib/algolia/shorts.ts` joins arrays. Commit `e348965`.

**4. [Rule 2 - Missing] Shared API-contract fixtures** in `apps/client/test/fixtures/short-film-api.ts`, used by mapper, fetcher, route and tracer tests. Commit `e348965`.

**5. [Rule 4 - owner decision] Loading boundary.** The first probe run found that unknown slugs and outages answer HTTP 200 + noindex because `app/[locale]/loading.tsx` wraps the `[slug]` layout. Removing that boundary breaks the build (`useSearchParams()` on `/[locale]/auth/register` needs it), so I stopped. The owner chose "soft status now, fix pre-launch" (D-22): the probe asserts the rendered state and the real 404/500 moved to Phase 5 success criterion 5. The plan's must_haves truths 4 and 5 and related wording were amended to match.

**6. Scope additions.** The probe also covers `/api/shorts` (200, strict 400, 502) and a sparse film. `--skip-build` exists for probe iteration only; the verification above is a full run.

**7. Commit trailer.** The repo policy (`docs/context/commit-and-push-policy.md`) forbids AI attribution trailers, so no `Claude-Session:` line was added to any commit. The coordinator confirmed this.

**Total deviations:** 7 (2 bugs, 3 blocking, 1 missing-critical, 1 owner decision).

## Findings for later plans

- **Not-found copy language.** On the default-locale (fr, unprefixed) path the generic `[locale]/not-found.tsx` renders English copy ("Page not found"); `/ar` renders Arabic. Pre-existing and outside this plan. Plan 06's shorts not-found should set the locale explicitly. The probe accepts any locale's copy for this reason.
- **Error boundary.** The shorts error boundary with `role="alert"` is Plan 06. Today the generic `[locale]/error.tsx` renders, so the probe asserts its copy and not `role="alert"`.
- **Phase 5.** The probe flips back to status assertions once the loading boundary is restructured (Phase 5 success criterion 5).
- **Standalone warning.** `next start` prints "does not work with output: standalone" because the local env enables standalone output; the app still serves correctly.

## Known Stubs

None. `/shorts` (directory) still renders mock data until Plan 08; both pages are `noindex` and unlinked.

## Threat Flags

None beyond the plan's threat model (T-02-01 strict route, T-02-02 slug pre-validation, T-02-03 URL filtering are implemented and tested).

## Self-Check: PASSED

- Created files exist: shorts.errors.ts, shortMappers.ts, layout.tsx, layout.test.tsx, rendering-rules.test.ts, short-film-api.ts, stub-strapi.mjs, probe.mjs.
- Commits `e348965`, `a5c1179`, `e399b4f`, `d0d2c3a` are ancestors of HEAD.
- Full probe run ended with `PROBE PASS (33 checks)`.
