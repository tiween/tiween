---
phase: 01-short-film-catalog-backend
fixed_at: 2026-11-10T00:00:00Z
review_path: .planning/phases/01-short-film-catalog-backend/01-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-11-10
**Source review:** .planning/phases/01-short-film-catalog-backend/01-REVIEW.md
**Iteration:** 1

**Summary:**

- Findings in scope: 4 (WR-05, WR-01, WR-02, WR-04; no Critical findings; Info findings are out of scope for `critical_warning`)
- Fixed: 4
- Skipped: 0

Fixes were made on `main` in the main working tree (no worktree), as the caller directed. Nothing was pushed.

## Fixed Issues

### WR-05: A Film or Play save still clears stored `theatreDetails`

**Files modified:** `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts`, `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts`, `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx`, `apps/strapi/src/plugins/creative-works/server/src/__tests__/work-editor.service.test.ts`
**Commit:** e57fe88
**Status:** fixed: requires human verification (behaviour-rule change decided by the owner on 2026-11-10; the code now matches the rule)
**Applied fix:** `workToApiPayload` omits the `theatreDetails` key for every non-play type instead of sending `null`; plays still send the validated object. The header comment now states the rule for all hidden sections. Both tests that pinned `theatreDetails: null` now assert `not.toHaveProperty("theatreDetails")`. Added a unit case that a play still sends the object, and a boot case ("a save that omits theatreDetails keeps the stored component") that saves a play as a film through the content-manager and reads the theatre record back unchanged.

### WR-01: A re-import silently reverts editor-set `featured` / `featuredRank`

**Files modified:** `apps/strapi/scripts/seeds/utils/short-film-import.ts`, `apps/strapi/scripts/seeds/utils/short-film-import.unit.test.ts`, `apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts`
**Commit:** 91fc06c
**Applied fix:** `buildShortFilmData` writes `featured` and `featuredRank` only when the data file names them (same rule as `poster` and `backdrop`). `payloadDiffers` already compares only the keys present in the payload, so an editor-set value is no longer a difference to write back or republish. Regression tests: a unit test (omitted when the file is silent, written when named, including an explicit `false`) and a boot case that sets `featured: true, featuredRank: 5` on a film the file does not place, re-runs the import, and asserts the film is reported `unchanged`, the draft keeps both values and its `publishedAt` stamp is unchanged. Both new tests fail without the fix.

### WR-02: Replacing or removing the default-language poster leaves a stale poster on every translation

**Files modified:** `apps/strapi/scripts/seeds/utils/short-film-import.ts`, `apps/strapi/scripts/seeds/shorts/import-short-films.ts`, `apps/strapi/scripts/seeds/utils/short-film-import.unit.test.ts`, `apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts`, `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocalizedFieldsForm.tsx`, `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx`, `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormLocales.test.tsx`
**Commit:** 139780f
**Applied fix:** Chose the review's first option (a translation poster is a deliberate override only; an empty one falls back to the default poster, which `overlayLocalizedFields` already does at read time, and the publish guard evaluates the default-locale draft so a posterless translation still publishes).

- Admin: `toLocalizedValues(row)` no longer prefills a new translation from the default poster (the now-unused `defaultRow` parameter and its call-site argument are gone). The two hint strings now say an empty poster uses the default-language poster.
- Importer: `buildLocalizedData(entry, locale)` returns only `title` and `synopsis`. On re-import, a translation draft whose poster id equals the default row's current or incoming poster id is treated as an inherited copy and cleared (`poster: null`) and republished once; a poster that differs (a deliberate override) is left alone.
- Tests: unit tests for `buildLocalizedData`; a boot case that seeds a stale copy in `ar` and a deliberate poster in `en`, re-runs the import, and asserts `ar` is cleared (draft and published), `en` is kept, and the public API serves the default poster for `ar`; the existing "replicates the poster id" boot case now asserts the opposite; the jsdom locale test asserts the new-translation tab shows no copied poster and saves `poster: null`. The two boot cases fail without the fix.

**Residual (not fixed):** an admin-created translation row that copied the poster and whose default poster was replaced afterwards (so its id no longer equals the default's) cannot be told apart from a deliberate override and is left as is. Such rows need a one-off manual clear. `public-api.createWork` and `venue-events` replicate localized fields to other locales on a separate catalog path; they were not touched.

### WR-04: Saving a work whose slug was blank can silently change its public URL

**Files modified:** `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx`, `apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormPublish.test.tsx`
**Commit:** 4ba4792
**Applied fix:** The review's "pass `documentId` to the uid generator" option does nothing: Strapi's content-manager `/uid/generate` ignores a document id and counts every draft with the slug. So `handleSubmit` now skips generation when the loaded work already has a stored slug and re-sends that slug; the generator runs only for a work without one. The refetch after the first save supplies the stored slug to the second save. Regression test: a stand-in content-manager that answers `-1` once the work's own slug exists, two consecutive saves from the same mounted form, asserting the second PUT sends the first slug and the generator was called once. It fails without the fix (received `le-silence-1`). Mounted under `/plugins/events-manager/works/:documentId`, the route the real post-save `navigate` lands on.

## Skipped Issues

None.

## Verification

All gates ran in the main checkout (`/Users/ayoub/projects/tiween-bmad-version/apps/strapi`), after all four commits, so the numbers are reproducible from the tree you are looking at.

- `yarn workspace @tiween/admin lint`: `eslint . --max-warnings=0`, `Done in 8.48s.` (no warnings)
- `yarn workspace @tiween/admin type-check`: `tsc --noEmit && tsc --noEmit -p e2e/tsconfig.json`, `Done in 10.75s.` (no errors)
- Unit and jsdom (`jest src/plugins/events-manager/admin scripts/seeds/utils`): `Test Suites: 21 passed, 21 total`, `Tests: 482 passed, 482 total`
- Boot suites (`jest --selectProjects server --testMatch='**/*.service.test.ts' --runInBand scripts/seeds/shorts src/plugins/creative-works/server/src/__tests__`, after `yarn build:test-dist`): `Test Suites: 6 passed, 6 total`, `Tests: 156 passed, 156 total`
- Each commit also passed the repo's husky pre-commit (lint-staged prettier and eslint, turbo lint) and commitlint.
- Fail-before checks: WR-01, WR-02 and WR-04 regression tests were each run against the unfixed source and failed; WR-05 changed assertions from `toBeNull()` to absent.

Environment note for anyone re-running the boot suites locally: the local `.env` carries ImageKit credentials, which makes `import-short-films.service.test.ts` refuse to start (it requires the local upload provider). Run it with `IMAGEKIT_PUBLIC_KEY= IMAGEKIT_PRIVATE_KEY= IMAGEKIT_URL_ENDPOINT=` set to empty, and refresh `dist/` with `yarn build:test-dist` after editing anything under `src/`. No test image was sent to ImageKit.

---

_Fixed: 2026-11-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
