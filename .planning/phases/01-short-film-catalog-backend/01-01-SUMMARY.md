---
phase: 01-short-film-catalog-backend
plan: 01
subsystem: testing
tags:
  [
    strapi,
    jest,
    sqlite,
    document-service,
    content-manager,
    i18n,
    characterization,
  ]

requires:
  - phase: none
    provides: first plan of the milestone
provides:
  - A correct yarn install (Strapi 5.51.2, qrcode resolvable) and a boot harness proven green on this machine
  - apps/strapi/tests/strapi-semantics.service.test.ts, a kept characterization suite (14 tests) pinning A1, A2, A3, A4, A5 and A13
  - Spike verdicts consumed by plans 01-03, 01-04, 01-06, 01-09, 01-10
affects: [01-03, 01-04, 01-06, 01-09, 01-10]

actuals:
  tokens: 3700
  tasks: 2
  commits: 2

plan_head_before: 0fdcd0fd1d42186b58f439a17ec4931568398d57
plan_head_after: d658e56aeed9696ab8b6d626f8f7c2c2bb4ae012

tech-stack:
  added: []
  patterns:
    - "Boot characterization suite on a suite-specific SQLite file (DATABASE_FILENAME=.tmp/strapi-semantics.db)"
    - "One shared, resettable strapi.documents.use middleware per file (no unregister API exists)"

key-files:
  created:
    - apps/strapi/tests/strapi-semantics.service.test.ts
  modified: []

key-decisions:
  - "A single resettable document middleware is registered once per test file because strapi.documents.use cannot be unregistered"
  - "A13 asserts provider name and option key names only (never values); it accepts local or the ImageKit provider so it holds on machines with credentials configured"

patterns-established:
  - "Characterization probes seed their own data with unique lowercase-ASCII slugs and assert the observed behaviour so a Strapi upgrade fails loudly"

requirements-completed: [SDATA-05]

coverage:
  - id: D1
    description: "node_modules matches the lockfile (Strapi 5.51.2, qrcode resolves) and the existing boot suites tests/app.test.js and venue-admin-crud.service.test.ts pass against a dist/ emitted by this run"
    requirement: SDATA-05
    verification:
      - kind: integration
        ref: "rm -f apps/strapi/dist/src/index.js && (yarn workspace @tiween/admin build:test-dist || true) && test -f apps/strapi/dist/src/index.js && yarn workspace @tiween/admin jest --selectProjects server --testMatch='**/tests/app.test.js' --testMatch='**/venue-admin-crud.service.test.ts' --runInBand"
        status: pass
    human_judgment: false
  - id: D2
    description: "Kept characterization suite strapi-semantics.service.test.ts passes (14 tests, 0 skipped) and pins A1, A2, A3, A4, A5, A13"
    requirement: SDATA-05
    verification:
      - kind: integration
        ref: "apps/strapi/tests/strapi-semantics.service.test.ts (rm sentinel, build:test-dist, jest --selectProjects server --testMatch='**/strapi-semantics.service.test.ts' --runInBand)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Spike verdicts table naming the downstream plan each verdict steers"
    requirement: SDATA-05
    verification: []
    human_judgment: true
    rationale: "The verdicts are design inputs for later plans; whether they steer those plans correctly is a planning judgment, not something a test asserts"

duration: 22min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 01: Boot Harness Proof and Strapi Semantics Spikes Summary

**Strapi boot harness proven green after a lockfile-correct install, plus a kept 14-test characterization suite that pins six Strapi behaviours (document middleware on content-manager publish, republish publishedAt, locale-row creation, localized relation drop, nested credit filter, upload plugin) with a verdict for each assumption.**

## Performance

- **Duration:** 22 min (the frozen-lockfile install alone took about 8 min)
- **Started:** 2026-10-18T16:07:39Z
- **Completed:** 2026-10-18T16:29:24Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- `yarn install --frozen-lockfile` succeeded without touching `yarn.lock` or any `package.json`; installed `@strapi/strapi` went from 5.33.1 to 5.51.2 and `qrcode` now resolves.
- Both pre-existing boot suites pass on a dist/ emitted by this run (sentinel `dist/src/index.js` deleted, rebuilt, re-asserted before jest).
- The new suite boots Strapi on SQLite, uses an admin session against content-manager routes, and passes 14 of 14.
- Spike verdicts for A1, A2, A3, A4, A5 and A13 recorded below; every one is confirmed, and two carry findings the research did not predict (see A3 and A4).

## Task Commits

1. **Task 1: End-to-end boot proof (tracer)** - `6baff25` (test)
2. **Task 2: Characterize Strapi semantics (A1, A2, A3, A4, A5, A13)** - `d658e56` (test)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Boot harness proof

Environment: Node 22, Yarn 1.22.22, `@strapi/strapi` 5.51.2 (matches lockfile), `qrcode` resolves from `apps/strapi`, `apps/strapi/.env` present (gitignored, never read or staged).

Command 1 (sentinel deleted, `build:test-dist` re-emitted it, then the two existing suites):

```
PASS server tests/app.test.js (27.135 s)
PASS server src/plugins/venues/server/src/__tests__/venue-admin-crud.service.test.ts (18.203 s)

Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

Command 2 (new suite skeleton, Task 1; 3 smoke tests):

```
PASS server tests/strapi-semantics.service.test.ts (24.457 s)
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

Command 3 (final suite, Task 2, after a fresh sentinel-checked `build:test-dist`):

```
PASS server tests/strapi-semantics.service.test.ts (23.533 s)
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

Plan-level verification: `yarn workspace @tiween/admin test` (unit + admin gate) still passes with 84 suites and 1244 tests, and does not pick up the new `*.service.test.ts` file. ESLint (`--max-warnings=0`) and Prettier are clean on the new file.

## Spike verdicts

All probes ran on SQLite (Strapi 5.51.2). Postgres behaviour was not exercised.

| Assumption                                                      | Probe                                                                                                                                                                                                                                              | Observed                                                                                                                                                                                                                                                                                                                                                                                                                  | Verdict   | Steers                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1: document middleware sees content-manager publish            | Registered `strapi.documents.use` after boot; `POST /content-manager/collection-types/<uid>/<id>/actions/publish?locale=fr` with admin token; then `create({ status: "published" })`; then a middleware that throws `ValidationError` on `publish` | CM publish returns 200 and the middleware records `findOne`, `findOne(draft)`, `update(draft)`, then `publish` with `locale: "fr"`. `create({ status: "published" })` is seen only as `create` with `params.status === "published"` (no nested `publish`). A `ValidationError` thrown from the middleware reaches the admin as HTTP 400 with `details.code` and `details.issues` intact, and no published row is created. | confirmed | 01-06: Document Service middleware is a valid guard mechanism; it must also inspect `create` and `update` where `params.status === "published"`. Caveat: the probe registered after boot; 01-06 registers from the plugin `register()` and should prove that timing in its own boot test. |
| A2: republish resets `publishedAt`                              | Publish, wait 1100 ms, publish again with no change, read the published row twice                                                                                                                                                                  | `publishedAt` changes (later timestamp) and the published row `id` changes (row deleted and recreated)                                                                                                                                                                                                                                                                                                                    | confirmed | 01-10: skip-if-unchanged is required for importer idempotency, not an optimisation; a re-run that republishes would rewrite `publishedAt` and `id`.                                                                                                                                       |
| A3: content-manager `PUT ?locale=` creates a missing locale row | Created `fr` draft; `PUT .../<id>?locale=ar` with `{ title, synopsis }` and admin token; read `ar` draft via Document Service                                                                                                                      | 200 `{ data, meta }`; the `ar` draft row exists with the sent title and synopsis; non-localized `type` and `duration` are copied. The uid `slug` is NOT copied: it is `null` on the new `ar` row while the `fr` row keeps it.                                                                                                                                                                                             | confirmed | 01-09: locale tabs in the WorkForm are viable, so the D-22 native Content Manager fallback is not needed. Finding for 01-03/01-04: resolve and expose `slug` from the default-locale row only; a non-default row cannot be found by slug.                                                 |
| A4: relations from a non-default locale row                     | `fr` work linked to a genre; `ar` row via `update({ locale: "ar" })`; publish `locale: "*"`; `findOne` both locales published with `populate: { genres: true }`                                                                                    | `ar` row has 0 genres, `fr` row has 1 (genre is localized and has no `ar` row, so the link is dropped)                                                                                                                                                                                                                                                                                                                    | confirmed | 01-03: the locale overlay must take relations (genres, and any other localized-target relation) from the default-locale row.                                                                                                                                                              |
| A5: nested credits filter                                       | Two persons, `director` and `screenwriter` roles, three published shorts; `findMany` with `credits: { person: { documentId: { $in } }, creditRole: { slug: "director" } }`                                                                         | Returns only the short where that person has the `director` credit; the same person as writer and a different person as director are excluded                                                                                                                                                                                                                                                                             | confirmed | 01-04: the `related` query can use the nested Document Service filter; the in-memory fallback is not needed on SQLite. Postgres is unverified by this plan.                                                                                                                               |
| A13: upload plugin enabled, provider resolution                 | `strapi.plugin("upload")` and `strapi.config.get("plugin::upload")`                                                                                                                                                                                | Plugin is defined and `enabled` is `true` although `config/plugins.ts` declares `enabled: false` (internal plugin merge, `enabled: true` wins); provider resolves to `local` because ImageKit credentials are not set in this run                                                                                                                                                                                         | confirmed | 01-10: the importer's provider fail-closed check can rely on `config.provider`; it must refuse non-dev runs when the provider is `local`. Do not "fix" the `enabled` flag.                                                                                                                |

Additional observation: the test database boots with `fr`, `ar` and `en` locales already present (the research listed `en` creation as a possible Wave 0 gap; it is not needed on this Strapi/config).

## Files Created/Modified

- `apps/strapi/tests/strapi-semantics.service.test.ts` - kept boot characterization suite: smoke tests plus one `describe` per assumption (A1, A2, A3, A4, A5, A13), on `DATABASE_FILENAME=.tmp/strapi-semantics.db`

## Decisions Made

- One shared, resettable document middleware per test file (state object toggled per probe), because `strapi.documents.use` has no unregister.
- A13 asserts the provider name and option key names only and accepts either `local` or the ImageKit provider, so it passes on machines with ImageKit credentials and never touches secret values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-commit lint-staged reordered imports above the `DATABASE_FILENAME` assignment**

- **Found during:** Task 1 (commit of the skeleton)
- **Issue:** The repo's pre-commit ESLint `--fix` moved the `import` statements above `process.env.DATABASE_FILENAME = ...`, making the header comment ("set BEFORE the helpers are imported") false.
- **Fix:** Verified `setupStrapi()` reads `DATABASE_FILENAME` when it is called, not at import time, so the order is harmless; corrected the comment in the Task 2 commit.
- **Files modified:** `apps/strapi/tests/strapi-semantics.service.test.ts`
- **Verification:** suite passes; the DB file used is `.tmp/strapi-semantics.db` and is removed by `cleanupStrapi`.
- **Committed in:** `d658e56`

### Plan extensions (not defects)

- Added a `ValidationError` to HTTP 400 probe under A1 (the Assumptions Log states this as part of A1; the task text did not list it).
- Added a slug-not-copied probe under A3 after observing `slug: null` on the new locale row.
- Added a locales smoke test (`fr`, `ar`, `en` present at boot).
- Final test count is 14 (plan minimum 7).

---

**Total deviations:** 1 auto-fixed (1 bug-class comment/ordering issue), 3 additive probe extensions.
**Impact on plan:** No scope creep; the extra probes answer sub-assumptions that 01-06 and 01-03 depend on.

## Issues Encountered

- `yarn install --frozen-lockfile` took about 8 minutes; no lockfile update was requested and no tracked manifest changed (`apps/client/package.json` diff is byte-identical to its pre-task state).
- The research noted a failing boot on the stale install; with the correct install that failure is gone, confirming it was environmental.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. The suite adds no endpoints or trust-boundary surface; it only reads provider and option key names, never values (T-01-01 mitigated, grep for `PRIVATE_KEY|APP_KEYS|JWT_SECRET` on the suite returns no lines). `apps/strapi/.env` is gitignored and was neither read nor staged (T-01-02). No dependency was added and the lockfile is unchanged (T-01-SC).

## Next Phase Readiness

- Boot-integration verification is now available for plans 01-02 onward.
- Carry into 01-03/01-04: slug lives only on the default-locale row, relations must be overlaid from the default-locale row.
- Carry into 01-06: middleware guard works for content-manager publish but must also cover `create`/`update` with `status: "published"`; prove register-time registration in its own boot test.
- Carry into 01-10: republish re-stamps `publishedAt`, so skip-if-unchanged is mandatory.
- Open for later: Postgres behaviour of the nested credit filter and NULL ordering is unverified here.

## Self-Check: PASSED

- FOUND: apps/strapi/tests/strapi-semantics.service.test.ts
- FOUND commit 6baff25, FOUND commit d658e56

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
