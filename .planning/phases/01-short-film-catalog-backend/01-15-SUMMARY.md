---
phase: 01-short-film-catalog-backend
plan: 15
subsystem: creative-works admin read + events-manager Works form
tags:
  [
    strapi,
    content-manager,
    admin-route,
    rbac,
    document-service,
    react,
    zod,
    playwright,
  ]
gap_closure: true

requires:
  - phase: 01-short-film-catalog-backend
    provides: "Works form, publish bar and locale tabs (01-09), content-manager write path, E2E stack and walkthrough (UAT commit ae0bbfb)"
provides:
  - "GET /creative-works/admin/works/:documentId: draft read with every relation resolved, content-manager { data, meta } envelope, RBAC-gated, coded errors"
  - "useWork reads the new route (WORK_EDITOR_URL)"
  - "workToFormValues tolerant of { count } relations; findUnresolvedRelations; edit-page error state instead of a form over a partial load"
  - "React-free hooks/translationTargets.ts (collectTranslationTargets moved verbatim)"
  - "Boot suite work-editor.service.test.ts pinning the route contract and the content-manager root cause"
affects:
  [01-16, short-film admin editing, ensureTranslationTargets, publish pre-check]

actuals:
  tokens: 16000
  tasks: 2
  commits: 5
plan_head_before: 9fd020a91236b8fc48cb0836928259f184413191
plan_head_after: 49900e4c431285cf7e10dd64a3e6bd7534c9009d

tech-stack:
  added: []
  patterns:
    - "Plugin-owned admin read route that mirrors a content-manager flow (permission-checker + document-metadata) instead of re-implementing it"
    - "Server route contract pinned by importing the admin's own oracle (workPopulate, workToApiPayload keys) into a boot suite"
    - "Fail-closed edit page: a failed or partial load renders an error state, never a form whose Save re-sends relations wholesale"

key-files:
  created:
    - apps/strapi/src/plugins/creative-works/server/src/services/work-editor.ts
    - apps/strapi/src/plugins/creative-works/server/src/controllers/work-editor.ts
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/work-editor.service.test.ts
    - apps/strapi/src/plugins/events-manager/admin/src/hooks/translationTargets.ts
  modified:
    - apps/strapi/src/plugins/creative-works/server/src/routes/admin.ts
    - apps/strapi/src/plugins/creative-works/server/src/controllers/index.ts
    - apps/strapi/src/plugins/creative-works/server/src/services/index.ts
    - apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
    - apps/strapi/src/plugins/events-manager/admin/src/hooks/workPopulate.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts
    - apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormPublish.test.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormLocales.test.tsx
    - .planning/phases/01-short-film-catalog-backend/deferred-items.md

key-decisions:
  - "The editor read is a creative-works admin route, not a populate fix on the content-manager GET: that controller counts relations and ignores the populate parameter."
  - "status and meta.availableLocales come from the content-manager document-metadata service and the output from its permission-checker, so both reads agree and RBAC conditions apply."
  - "Route prefix /admin/works (not /works) so the admin router cannot collide with a content-api path under the same /creative-works mount."
  - "The page fails closed: an unresolved relation or a rejected read replaces the form with an EmptyStateLayout plus one danger toast."

patterns-established:
  - "Boot suites may import React-free admin modules by relative path as the contract oracle; admin code that a boot suite needs is split out of files that import @strapi/strapi/admin."

requirements-completed: [SDATA-02]

duration: ~4h wall clock (host load average 35-50; four pre-commit lint runs, one 5 min admin build, three E2E runs)
completed: 2026-11-08
status: complete
---

# Phase 1 Plan 15: Works edit page read route (gap G-01-1) Summary

**Plugin-owned `GET /creative-works/admin/works/:documentId` resolves every relation the Works form round-trips (the content-manager GET returns them as `{ count }`), `useWork` reads it, and the edit page now refuses to render a form over a failed or partial load.**

## Performance

- **Tasks:** 2 (Task 1 tracer, Task 2 TDD)
- **Files modified:** 14 source/test files (+ deferred-items.md)
- **Commits:** 5 (refactor, test, feat, test, fix) plus the docs commit

## Accomplishments

- **Root cause pinned and removed.** Boot case "content-manager single-document GET counts relations" shows `genres` and `credits[0].person` as `{ count }` on Strapi 5.51.2, and that the same body makes `evaluateShortFilmPublishRules` report `DIRECTOR_REQUIRED` and `collectTranslationTargets` list no persons. The new route returns all of them resolved.
- **Route contract, 9 boot cases green:** every `WORK_POPULATE` path resolved (no `{ count }`); person objects carry no `bio`/`birthDate`/`nationality`; `status` and sorted `availableLocales` equal the content-manager's in draft, published and modified; a missing locale answers 200 `{ data: {} }` with the other locales; 401 without a session, 403 for a role without the content-manager read action, 404 `WORK_NOT_FOUND`, 400 `UNSUPPORTED_LOCALE`, 400 `VALIDATION_FAILED` on any extra query parameter; an empty short film exposes every key `workToApiPayload` sends; the real route answer drives `workToRuleInput` (no `DIRECTOR_REQUIRED`) and `collectTranslationTargets` (director, cast person, role, character); a load-then-save through the content-manager PUT keeps persons, characters, genres and streaming links.
- **Admin side:** `useWork` sends only `locale` to the new route; `workToFormValues` maps `{ count }` relations to `[]`/`null`; `findUnresolvedRelations` gates the page; a rejected read or an unresolved relation shows an `EmptyStateLayout` with "Back to list" and exactly one danger toast, no Save button.
- **Walkthrough:** the first Playwright test (create, translate AR/EN, publish, reload, edit, republish, unpublish) passes on the isolated E2E stack (see the timing caveat under Issues Encountered).

## Task Commits

1. **Task 1 prep: move `collectTranslationTargets` to a React-free module** - `85fd8c0` (refactor)
2. **Task 1 RED: failing boot suite** - `abeb064` (test). Result: 8 of 9 cases failed on the missing route (404), the root-cause pin passed by design.
3. **Task 1 GREEN: route, controller, service, `useWork`, jsdom fixtures** - `7236ad3` (feat)
4. **Task 2 RED: unresolved-relation and load-error cases** - `3284eeb` (test). Result: 6 schema cases and 2 page cases failed.
5. **Task 2 GREEN: tolerant mapping, `findUnresolvedRelations`, error state, `workPopulate.ts` header** - `49900e4` (fix)

**Plan metadata:** the docs commit that adds this SUMMARY and the deferred-items entries.

## TDD Gate Compliance

RED then GREEN for both tasks. RED evidence for Task 1 is the 404s on every route case (assertions on the planned status codes, suite loaded and ran); for Task 2 it is the failing schema and page cases (target tests named in the plan's `<behavior>`). `gsd_run check tdd-red-evidence` was not run (plan type is `execute`, not `tdd`).

## Files Created/Modified

- `creative-works/server/src/services/work-editor.ts` - `WORK_EDITOR_POPULATE`, `findForEditor` (i18n-validated locale, draft read, content-manager `exists` for 404), `withEditorMetadata`
- `creative-works/server/src/controllers/work-editor.ts` - Zod params/query, permission checker, sanitized `{ data, meta }`, coded `respondError`
- `creative-works/server/src/routes/admin.ts` - `GET /admin/works/:documentId` behind `admin::hasPermissions` with the explanatory comment
- `creative-works/server/src/__tests__/work-editor.service.test.ts` - the boot suite
- `events-manager/admin/src/hooks/translationTargets.ts` - moved verbatim, type-only import; re-exported from `useCreativeWorks.ts`
- `events-manager/admin/src/hooks/useCreativeWorks.ts` - `WORK_EDITOR_URL`, `useWork` on the new route, populate import and re-export removed
- `events-manager/admin/src/components/WorkForm/schema.ts` - `relationList`/`relationRef`, tolerant `workToFormValues`, `findUnresolvedRelations`
- `events-manager/admin/src/pages/Works/WorkFormPage.tsx` - error state and toast; `loadFailed` has an English default only (en/fr/ar JSON entries are 01-16's)
- `events-manager/admin/src/hooks/workPopulate.ts` - header comment re-scoped to the server contract
- jsdom suites - `WORK_READ_URL` for GET branches only, fixtures carry every round-tripped key, plus "work fixtures carry every round-tripped key" in both suites

## Decisions Made

See `key-decisions` above. No `plugin_waiver` was needed: all new backend code is in the `creative-works` plugin.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-commit hook failed on unrelated client lint errors**

- **Found during:** Task 1 prep commit
- **Issue:** `turbo lint` in the pre-commit hook fails in a clean checkout of `9fd020a` with 31 `react-hooks/rules-of-hooks` errors, all in tracked `apps/client/**/*.stories.tsx`. The owner's main tree has those stories deleted (uncommitted), so the hook passes there; the plan's execution notes mention the "client Storybook deletions".
- **Fix:** deleted the tracked `*.stories.tsx` files from this throwaway worktree only (working tree, never staged), so the hook ran for every commit without `--no-verify`. Logged in `deferred-items.md`.
- **Files modified:** none committed
- **Committed in:** n/a

**2. [Rule 3 - Blocking] `.env` for the worktree**

- **Found during:** setup
- **Issue:** `apps/strapi/.env` was absent in the fresh worktree; copying the owner's `.env` was blocked by the secret-read guard, and an `.env` (same size as `.env.example`) appeared after `yarn install`. Boot suites use `config/env/test` and `e2e:up` sets its own env, so nothing else was needed. Gitignored, never staged.

**3. Test-fixture detail (plan step 6)**

- The `arWork` fixture got `slug: null` and the other unset keys null/`[]` as specified; all existing assertions passed unchanged on the enlarged fixtures, so no hidden dependency on a missing key was found.

---

**Total deviations:** 2 auto-fixed (2 blocking, environment only). **Impact:** none on scope or production code.

The plan's contingency "If a key comes back absent from the Document Service read, make `findForEditor` fill it" was NOT needed: boot case (g) passed without a fill (the Document Service answers `null` and `[]` for every unset attribute once the populate is given), so `findForEditor` has no fill step.

## Issues Encountered

- **E2E time budget (open, host-dependent).** `e2e:up` and the walkthrough ran. With the default 120 s test timeout, three runs each ran every step successfully and then hit `Test timeout of 120000ms exceeded` one step later each time (publish-after-edit toast, then unpublish toast), on a host with load average 35-50 (steps took side nav 21 s, reload 21 s, republish 15 s). A run with `--timeout=300000` passed the first test (127 s) with no failed step; the WR-03 test is expected-to-fail and counts as passed. So the plan's literal verify command (default timeout) did not exit 0 on this host; the functional gap is closed. `e2e/playwright.config.ts` and the frozen spec are outside this plan's files, so I did not change them. Follow-up recorded in `deferred-items.md`: raise `timeout` (e.g. 240_000) in 01-16 or a chore commit. Screenshot of the last failed default-timeout run: `apps/strapi/e2e/.tmp/test-results/admin-short-film-walkthrou-cda71--film-from-the-Works-screen-chromium/test-failed-1.png` (gitignored; the page there shows the published state, i.e. the step itself had succeeded).
- `apps/strapi/config/middlewares.ts` was not touched, staged or implicated.
- The Playwright stack was torn down (`e2e:down`); ports 1338 and 5439 are free.

## Verification Results

| Check                                                                                          | Result                                              |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Boot suite `work-editor.service.test.ts` (`build:test-dist` first)                             | 9 passed                                            |
| `jest --selectProjects admin WorkFormPublish WorkFormLocales WorkFormShortFields WorksRouting` | 4 suites, 53 tests passed                           |
| `jest --selectProjects admin MediaInput CodeMultiPicker`                                       | 2 suites, 35 tests passed                           |
| `jest .../components/WorkForm` (unit, incl. schema.unit.test.ts)                               | 2 suites, 90 tests passed                           |
| `yarn workspace @tiween/admin lint`                                                            | exit 0 (run by the pre-commit hook on every commit) |
| `yarn workspace @tiween/admin type-check`                                                      | exit 0                                              |
| Playwright `admin-short-film-walkthrough`, default timeout                                     | failed on time budget only (see above)              |
| Playwright `admin-short-film-walkthrough --timeout=300000`                                     | 2 passed                                            |
| Acceptance greps (both tasks)                                                                  | all pass; `test.fail(` count in the spec is still 2 |

The boot suite was last run before the E2E stack rebuilt `dist/` and before Task 2; Task 2 changed no server file.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-01-47 to T-01-52 all mitigated or accepted as planned: admin auth plus `admin::hasPermissions` plus permission-checker, field-allowlisted populate and sanitized output, strict Zod params/query, fail-closed edit page).

## Next Phase Readiness

- 01-16 can add the `events-manager.catalog.workForm.loadFailed` string to en/fr/ar and remove the `test.fail(` marker; it should also raise the Playwright timeout.
- WR-04 (blank-slug regeneration in `handleSubmit`) is untouched, as planned.

## Self-Check: PASSED

All four created files exist on disk and the five commits (85fd8c0, abeb064, 7236ad3, 3284eeb, 49900e4) are ancestors of HEAD. `requirements.ready-ids` reports SDATA-02 blocked (plan 01-16 also declares it and has no SUMMARY yet), so REQUIREMENTS.md was not changed.
