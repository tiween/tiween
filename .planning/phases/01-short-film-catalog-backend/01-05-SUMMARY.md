---
phase: 01-short-film-catalog-backend
plan: 05
subsystem: api
tags: [strapi, rate-limit, koa-middleware, content-api, jest, supertest]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-03/01-04 public short-films routes, services and boot suite"
provides:
  - "Named middleware plugin::creative-works.short-films-rate-limit (600 req / 60 s per key) on all four short-films routes"
  - "Legacy featured / by-type / title-search content-API routes, the creative-work controller, findFeatured and findByType removed (D-09)"
  - "apps/strapi/docs/short-films-api.md public read contract, enforced by a unit test"
affects: [02-shorts-pages, 03-search-meilisearch]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3
plan_head_before: db8cedaa003d178ef59cd2dcf444cd4755129b46
plan_head_after: c5c233a4f950e3042c5d165efd29d224511de872

tech-stack:
  added: []
  patterns:
    - "Named plugin middleware wrapping the shared createRateLimit factory, wired per route via config.middlewares"
    - "Doc-consistency unit test reads the Markdown contract and asserts route table, sorts and error codes appear in it"

key-files:
  created:
    - apps/strapi/docs/short-films-api.md
    - apps/strapi/src/plugins/creative-works/server/src/middlewares/__tests__/short-films-rate-limit.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/routes/__tests__/content-api.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/routes/__tests__/short-films-api-doc.unit.test.ts
  modified:
    - apps/strapi/src/plugins/creative-works/server/src/middlewares/index.ts
    - apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts
    - apps/strapi/src/plugins/creative-works/server/src/controllers/index.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/creative-work.ts
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts
    - apps/strapi/docs/plugin-architecture.md
    - apps/strapi/docs/PERMISSIONS.md
  deleted:
    - apps/strapi/src/plugins/creative-works/server/src/controllers/creative-work.ts

key-decisions:
  - "Cap of 600 requests per 60 s per key, identical in route config and factory defaults, so the Next.js SSR caller behind a shared proxy IP is never throttled"
  - "Service methods search, findOneWithDetails and createWork stay on the internal creative-work service because the public-api facade (events-manager venue picker) delegates to them"
  - "RATE_LIMITED is documented in error.message (shared limiter envelope), the other codes in error.details.code"

patterns-established:
  - "Route-table unit test pins order, auth false and middleware name per public route"
  - "Contract document in apps/strapi/docs guarded by a unit test against drift"

requirements-completed: [SDATA-03]

coverage:
  - id: D1
    description: "All four short-films routes run through the short-films-rate-limit middleware (600/60 s); over the cap answers 429 RATE_LIMITED with Retry-After"
    requirement: SDATA-03
    verification:
      - kind: unit
        ref: "middlewares/__tests__/short-films-rate-limit.unit.test.ts#lets requests under the cap through and rejects the one over it with 429"
        status: pass
      - kind: unit
        ref: "routes/__tests__/content-api.unit.test.ts#is a public GET behind the rate limiter"
        status: pass
      - kind: integration
        ref: "short-films.service.test.ts#short-films rate limiting wiring (integration)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Legacy featured / by-type / search routes and controller removed; URLs 404 on a booted Strapi; persons search and facade searchWorks survive"
    requirement: SDATA-03
    verification:
      - kind: unit
        ref: "routes/__tests__/content-api.unit.test.ts#has exactly five routes"
        status: pass
      - kind: integration
        ref: "short-films.service.test.ts#legacy creative-work routes removed (D-09, integration)"
        status: pass
    human_judgment: false
  - id: D3
    description: "short-films-api.md documents routes, parameters with bounds, error codes, shapes, locale rule, ordering and Phase 3 hand-offs, and a unit test keeps it in step with the route table"
    requirement: SDATA-03
    verification:
      - kind: unit
        ref: "routes/__tests__/short-films-api-doc.unit.test.ts"
        status: pass
    human_judgment: true
    rationale: "Test pins routes, sorts and error codes; whether the prose is accurate and sufficient for Phase 2 and 3 authors needs a reader"

duration: 14min
completed: 2026-10-19
status: complete
---

# Phase 1 Plan 05: Rate Limit, Legacy Route Removal and Read Contract Summary

**Shared in-process rate limiter (600/60 s) on the four public short-films routes, the three draft-leaking legacy creative-work routes deleted with their controller, and the read contract published in `apps/strapi/docs/short-films-api.md` with a drift-guard test**

## Performance

- **Duration:** 14 min
- **Started:** 2026-10-19T19:54:00Z
- **Completed:** 2026-10-19T20:09:00Z
- **Tasks:** 3
- **Files modified:** 12 (4 created, 7 modified, 1 deleted)

## Accomplishments

- `plugin::creative-works.short-films-rate-limit` wraps `createRateLimit` from `src/shared/rate-limit.ts`; it is attached to list, featured, `:slug/related` and `:slug` with `max: 600, windowMs: 60000`. A unit test proves 429 + `RATE_LIMITED` + `Retry-After`; the booted-Strapi suite proves the name resolves at boot and ordinary traffic is not throttled.
- D-09: the featured / by-type / title-search routes, `controllers/creative-work.ts` and the `findFeatured` / `findByType` service methods are gone. The route table is pinned to five routes, and the boot suite shows the three URLs answering 404 while `/persons/search` still routes and the facade `searchWorks` still returns an array.
- `short-films-api.md` (196 lines) is the single written read contract; `plugin-architecture.md` now teaches the short-films pattern instead of the removed featured method, and `PERMISSIONS.md` lists the four public URLs.

## Caller Audit (D-09)

Run before deletion: `git grep -n "creative-works/featured\|creative-works/type\|creative-works/search\|findFeatured\|findByType" -- apps/`

```
apps/client/src/features/venues/hooks/useVenueEvents.test.ts:193:      "/events-manager/venue/creative-works/search",
apps/client/src/features/venues/hooks/useVenueEvents.test.ts:342:        "api/events-manager/venue/creative-works/search",
apps/client/src/features/venues/hooks/useVenueEvents.ts:32:const WORK_SEARCH_PATH = "/events-manager/venue/creative-works/search"
apps/client/src/features/venues/hooks/useVenueEvents.ts:113: * Debounced catalog search (`GET /venue/creative-works/search?query=...`),
apps/client/src/lib/strapi-api/request-auth.ts:53:    "api/events-manager/venue/creative-works/search",
apps/strapi/docs/PERMISSIONS.md:138:| `plugin::events-manager.venue-events.searchCreativeWorks` | `GET /api/events-manager/venue/creative-works/search` | ... |
apps/strapi/docs/plugin-architecture.md:314,333,347,352,386   (findFeatured doc examples)
apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts:237:  const featured = await publicApi().findFeaturedShortFilms()
apps/strapi/src/plugins/creative-works/server/src/controllers/creative-work.ts:4,9,14,25   (the legacy controller)
apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts:6,7,14,15,22  (the legacy routes)
apps/strapi/src/plugins/creative-works/server/src/services/__tests__/public-api.unit.test.ts:102,107  (findFeaturedShortFilms, a different facade method)
apps/strapi/src/plugins/creative-works/server/src/services/creative-work.ts:38,48   (the two removed methods)
apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts:50   (findFeaturedShortFilms)
```

Result: no client caller of the legacy URLs. `apps/client` and the events-manager use `/events-manager/venue/creative-works/search`, a different route that stays; the facade `searchWorks` delegates to the internal `search` method, which stays. After the changes, the same grep (excluding `findFeaturedShortFilms`, the venue route and tests) returns nothing.

## Task Commits

1. **Task 1: End-to-end rate limiting on every short-films route (tracer)** - `badadfd` (feat)
2. **Task 2: Remove the legacy draft-leaking creative-work routes, controller and service methods** - `07c52da` (fix)
3. **Task 3: Write the public short-film read contract and keep it in step** - `c5c233a` (docs)

**Plan metadata:** committed with this summary (docs: complete plan)

## Verification

- Unit: `yarn workspace @tiween/admin jest src/plugins/creative-works/server/src` 129 passed before Task 3; full `yarn workspace @tiween/admin test` 104 suites, 1711 tests passed.
- Boot (dist rebuilt with `yarn workspace @tiween/admin build:test-dist`, run serially): `short-films.service.test.ts` 77 tests passed (72 existing plus the rate-limit wiring and legacy-route cases).
- `venue-events.unit.test.ts` 33 passed (facade caller intact). `yarn workspace @tiween/admin lint` exits 0.
- Tracer gate: interactive run, `end-of-phase`, verify is automated-only; both verify commands were re-run green before Task 2 started.

## Decisions Made

- Cap 600 per 60 s per key in both route config and factory defaults (research Pitfall 10).
- Kept `search`, `findOneWithDetails`, `createWork` on the internal service for the facade; `public-api.ts` untouched.
- Doc states `RATE_LIMITED` lives in `error.message` (the shared limiter's envelope), not `error.details.code`.

## Deviations from Plan

None - plan executed exactly as written. Two commit messages were first rejected by commitlint (`body-max-line-length`) and re-committed with shorter lines; no code changed.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The threat register was applied as written: T-01-13 mitigated (routes, controller and two service methods removed; boot suite asserts 404), T-01-14 mitigated (limiter on all four routes, unit-tested 429), T-01-15 accepted, T-01-SC mitigated (no dependency added).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 plan 01-05 is done; the public read surface is rate limited, free of draft leaks and documented.
- Phase 2 can bind to `short-films-api.md`; Phase 3 should keep `findRelatedDeterministic` as the Meilisearch fallback.

## Self-Check: PASSED

- Files created and the deletion verified on disk; commits `badadfd`, `07c52da`, `c5c233a` verified as ancestors of HEAD.

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-19_
