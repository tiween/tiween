---
phase: 01-short-film-catalog-backend
plan: 16
subsystem: events-manager Works form (admin authoring) and Phase 1 final verification
tags: [strapi, admin, react, zod, rtl, i18n, playwright]
gap_closure: true

requires:
  - phase: 01-short-film-catalog-backend
    provides: "Works edit-page read route and fail-closed edit page (01-15), Works form, publish bar, locale tabs (01-09), E2E stack and walkthrough"
provides:
  - "workFormSchema validates streaming links and featured rank only for short films and theatreDetails only for plays (superRefine over a loose object shape)"
  - "workToApiPayload omits streamingLinks, featured and featuredRank for Film and Play (SHORT_FILM_ONLY_KEYS), so stored values survive a save"
  - "Translated Field.Error under the Watch URL input and a danger notification on every invalid Save (en, fr)"
  - "Arabic tab title and synopsis render right-to-left (dir and lang); original title uses dir=auto"
  - "WR-03 Playwright test flipped to a passing regression test; full gap-closure verification green on the isolated E2E stack"
affects: [short-film admin editing, phase 1 verification]

actuals:
  tokens: 10800
  tasks: 3
  commits: 4
plan_head_before: d9e3505c55e871475b7e1f6b2397b607c5f018ac
plan_head_after: 5d5dfffe6f2e239ed82006b254831082fc590499

tech-stack:
  added: []
  patterns:
    - "Hidden-field validation: loose draft schemas in the object shape, strict schemas re-applied per type in a superRefine"
    - "Payload omission, not [] / null, for fields of another type, so an update leaves stored data untouched"
    - "Fixed right-to-left language list for text direction (deterministic in jsdom and browsers)"

key-files:
  created: []
  modified:
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/StreamingLinksEditor.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocalizedFieldsForm.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/translations/en.json
    - apps/strapi/src/plugins/events-manager/admin/src/translations/fr.json
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormLocales.test.tsx
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/work-editor.service.test.ts
    - apps/strapi/e2e/specs/admin-short-film-walkthrough.spec.ts

key-decisions:
  - "Omit the short-film-only keys from a Film or Play payload instead of sending []: the boot case showed Strapi leaves an omitted key untouched, so the documented fallback (filtered rows) was not needed."
  - "Notify on every invalid submit, not only for off-screen fields: duration, release year and rating have no error slot."
  - "Admin strings go to en and fr only; no admin ar.json (owner directive 2026-11-10). Arabic stays a content locale, so only the content inputs flip to rtl."
  - "DS v2 TextInput and Textarea forward dir and lang to the native element, so no Box wrapper was needed."

patterns-established:
  - "A hidden section's values stay in form state across a type switch, but are neither validated nor sent."

requirements-completed: [SDATA-02]

duration: ~1h wall clock
completed: 2026-11-10
status: complete
---

# Phase 1 Plan 16: Hidden-field Save and Arabic RTL (gap G-01-2) Summary

**Type-conditional Works form validation and payload (hidden streaming links, featured rank and act count never block or clobber a save), a translated field error plus notification on every invalid Save, and right-to-left Arabic content inputs; the full Playwright suite passes on the isolated stack.**

## Performance

- **Tasks:** 3 (Task 1 tracer, Task 2 and 3 TDD)
- **Files modified:** 12 (7 source, 5 test and spec)
- **Commits:** 4

## Accomplishments

- **G-01-2 closed.** `workFormSchema` is now a loose object shape (`streamingLinkDraftSchema`, `theatreDetailsDraftSchema`, free `featuredRank`) plus a `superRefine`: a short film re-validates each link with `streamingLinkFormSchema` (issues re-added at `streamingLinks.<i>.url`, message `INVALID_HTTPS_URL`) and a featured rank (integer of at least 1 when featured); a play re-validates `theatreDetails` at `theatreDetails.actCount`. A Film or Short film with a hidden act count of 0 or 1.5 saves and sends `theatreDetails: null`.
- **Stored data survives.** `workToApiPayload` spreads `streamingLinks`, `featured`, `featuredRank` (`SHORT_FILM_ONLY_KEYS`) only for `short-film`. The new boot case "a save that omits short-film-only keys keeps them" passes on Strapi: a content-manager PUT of `{ title, type: "film" }` leaves the link, `featured` true and `featuredRank` 2 in place (01-08 rule intact).
- **Visible feedback.** `StreamingLinksEditor` wraps the Watch URL in a `Field.Root` with a translated `Field.Error` ("Enter a valid https:// link", fr "Saisissez un lien https:// valide"); `WorkForm` calls `handleSubmit(onValid, onInvalid)` and raises a danger toast "Some fields need attention" (fr "Certains champs doivent être corrigés"). `workForm.loadFailed` (01-15) is now in en and fr.
- **Arabic RTL.** `LocalizedFieldsForm` takes `locale`, exports `textDirection`, and sets `dir` and `lang` on the title and synopsis; the original title is `dir="auto"`. The walkthrough asserts `dir="rtl"`, `lang="ar"` and computed CSS direction `rtl` on Arabic, `ltr` on English.
- **Walkthrough.** `test.fail` removed; the WR-03 test now captures the create request with `postDataJSON()`, asserts no `streamingLinks`, `featured` or `featuredRank` key, lands on `works/<documentId>` with the publish bar, and finds the work by slug. A sibling test covers the blank-row field error on a short film.

## Task Commits

1. **Task 1 RED:** `4baad62` test(01-16): pin hidden short-film and theatre fields as not validated, not sent. Schema unit cases (i)-(v) failed (5 failed, 65 passed) because `SHORT_FILM_ONLY_KEYS` and the conditional schema did not exist; the two jsdom cases and the boot case were added in the same commit (the boot case documents Strapi's behavior and passed on first run, which also settled the fallback question).
2. **Task 1 GREEN:** `8c95175` fix(01-16): validate and send short-film and theatre fields only for their type (schema, WR-03 spec flip).
3. **Task 2:** `12d45a4` fix(01-16): explain an invalid streaming link on the field and on every invalid Save. RED: 2 of 15 jsdom cases failed (not-https and blank URL) before the change; GREEN 48 of 48 across the three suites.
4. **Task 3:** `5d5dfff` feat(01-16): edit Arabic titles and synopses right-to-left. RED: 5 new cases failed (20 tests, 5 failed) before the change. The RED test commit was rejected by the commit-msg hook (subject case), so tests and implementation landed together in this commit.

## TDD Gate Compliance

Plan type is `execute`, so no plan-level gate. Task 1 has a separate RED commit (`4baad62`) before GREEN (`8c95175`). Task 2's RED cases were run and seen failing, but committed with the implementation (`12d45a4`, one shared test file with Task 1's). Task 3's RED run was seen failing but committed with the implementation (`5d5dfff`) after the commit-msg hook rejected the standalone test commit.

## Verification Results

| Check                                                                                                                                             | Result                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jest src/.../WorkForm/schema.unit.test.ts` (Task 1)                                                                                              | 1 suite, 70 passed                                                                                                                                                                                                          |
| `jest --selectProjects admin --maxWorkers=2 WorkFormShortFields` (Task 1)                                                                         | 1 suite, 13 passed                                                                                                                                                                                                          |
| Boot `work-editor.service.test.ts` after `build:test-dist` (Task 1)                                                                               | 10 passed (incl. 01-15 cases g and i, new omission case)                                                                                                                                                                    |
| `jest --selectProjects admin WorkFormShortFields WorkFormPublish WorkFormLocales` (Task 2)                                                        | 3 suites, 48 passed                                                                                                                                                                                                         |
| Translation keys node check (Task 2)                                                                                                              | `KEYS_OK`                                                                                                                                                                                                                   |
| `jest --selectProjects admin --maxWorkers=2 WorkFormLocales WorkFormPublish WorkFormShortFields WorksRouting MediaInput CodeMultiPicker` (Task 3) | 6 suites, 96 passed                                                                                                                                                                                                         |
| `jest --selectProjects server`                                                                                                                    | 92 suites, 1615 tests passed                                                                                                                                                                                                |
| `build:test-dist`; boot `*.service.test.ts` with empty ImageKit env, `--runInBand`                                                                | run 1: 4 suites passed, 1 failed (`short-films.service.test.ts`, "walks every page of two with no duplicate and no gap", 45 s suite; passed in isolation). run 2 (same command): 5 suites, 128 tests passed                 |
| `yarn workspace @tiween/admin lint`                                                                                                               | exit 0                                                                                                                                                                                                                      |
| `yarn workspace @tiween/admin type-check`                                                                                                         | exit 0 (includes `e2e/tsconfig.json`)                                                                                                                                                                                       |
| `e2e:up`, `test:e2e` (default timeout), `e2e:down`                                                                                                | `12 passed (45.7s)`: walkthrough, WR-03, blank-row field error, and the 9 featured/related tests. No `failed`, `flaky`, `did not run`, "Expected to fail, but passed" or crash message. Ports 1338 and 5439 free afterwards |

Acceptance greps all pass (`SHORT_FILM_ONLY_KEYS` 2, draft schemas 2 each, `theatreDetailsFormSchema.safeParse` 1, `test.fail(` 0 whole-file and code-only, `postDataJSON` 1, `ar-direction` 0, `toHaveAttribute("dir", "rtl")` 2). `apps/strapi/config/middlewares.ts` was not touched or staged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RED test commit for Task 3 rejected by the commit-msg hook**

- **Found during:** Task 3 commit
- **Issue:** `test(01-16): Arabic content renders right-to-left on the Works form` failed commitlint; the staged test file was then swept into the next commit.
- **Fix:** none needed beyond the combined commit (`5d5dfff`); RED was observed before implementing.
- **Files modified:** none beyond plan.

**2. [Instruction precedence] Commit trailer**

- The plan says "no AI trailers"; the invoking orchestrator required `Claude-Session: ...` as the last line of every commit. The orchestrator's instruction was followed.

**3. Task 2 test cases moved between commits**

- The Task 2 jsdom cases were written beside Task 1's and committed with Task 2 so each commit leaves the suite green.

The documented fallback in Task 1 step 4 was not used: the boot case showed an omitted key is not cleared.

**Total deviations:** 0 behavioral. **Impact:** none on scope.

## Issues Encountered

- One boot-suite flake (`short-films.service.test.ts` pagination case failed once at 45 s, passed alone and on the rerun of the whole command). Not caused by this plan (no server file changed). Recorded here; not added to deferred items as it did not recur.
- The 01-15 E2E time-budget item did not reproduce: the walkthrough took 26.9 s at the default 120 s timeout on this run (host load average about 4). `e2e/playwright.config.ts` was left unchanged; the deferred item stays open for loaded hosts.

## Known Stubs

None.

## Threat Flags

None. T-01-53 to T-01-57 are mitigated as planned (conditional client validation plus unchanged server guard; omission pinned by the boot case; notification on every invalid submit; hidden act count cannot block Save; dir and lang are presentational only).

## Self-Check: PASSED

All twelve modified files exist and the four commits (`4baad62`, `8c95175`, `12d45a4`, `5d5dfff`) are ancestors of HEAD. No admin `ar.json` was created.
