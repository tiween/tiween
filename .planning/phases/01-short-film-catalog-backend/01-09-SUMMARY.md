---
phase: 01-short-film-catalog-backend
plan: 09
subsystem: admin-ui
tags:
  [
    strapi,
    admin,
    content-manager,
    i18n,
    publish,
    react-hook-form,
    design-system,
    jest,
    jsdom,
    events-manager,
    short-film,
  ]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-01 spike A3 (PUT ?locale= creates a missing locale row; uid slug is not copied); 01-03 finding (translating a credited work needs the credited targets in that locale); 01-06 publish guard error shape (SHORT_FILM_PUBLISH_BLOCKED with coded issues); 01-07 routed Works pages and MediaInput; 01-08 short-film fields in the form; 01-14 venue refusal (D-21)"
provides:
  - "PublishBar: Draft/Published/Modified badge plus Publish and Unpublish for one language, with the D-19 pre-check list (advisory) and a non-blocking duration warning"
  - "publishRules.ts: workToRuleInput (feeds the shared evaluateShortFilmPublishRules), extractPublishError, publishIssueMessage and publishErrorMessages (translated sentences from CODES, never raw server text)"
  - "LocaleTabs and LocalizedFieldsForm: locale tabs read from /i18n/locales (default first, never hardcoded); the default tab edits the full form, other tabs edit only title, synopsis and poster and save with params.locale"
  - "Hooks: useLocales, useWork(documentId, locale?) returning meta, generateSlug, publishWork/unpublishWork/updateWork with a locale, ensureTranslationTargets"
  - "Fix: content-manager bodies are sent flat (the { data } wrapper was silently dropped by the server, so Works saves stored nothing)"
  - "Boot suite short-film-locale-save.service.test.ts proving the translate/publish request flow of a credited work on a real Strapi"
  - "Operator guide apps/strapi/docs/short-films-admin.md"
affects: [01-10, 01-11, 01-13, phase-02-shorts-client]

actuals:
  tokens: 28231
  tasks: 2
  commits: 3

plan_head_before: 19269f6772c43a501b6a80c7db63260203f52de7
plan_head_after: 050f5c4ef769c8331b09f2ae91fcac1c87d9d14c

tech-stack:
  added: []
  patterns:
    - "Content-manager collection-types routes take the entity as a FLAT request body; the locale travels as a query param (axios-style config { params: { locale } })"
    - "Server error CODES are translated client-side through useCatalogT keys publish.issue.<CODE> with default strings; server prose is never shown"
    - "A recognised code-less refusal (Strapi 'locale ... not found') is mapped to a client code (TRANSLATION_TARGET_MISSING) so the admin still sees a clear sentence"
    - "useWork keys its result by document+locale: isLoading is true on the render a new locale is asked for, same-key refetch is silent, a superseded response is dropped"
    - "Boot suite replays the exact request sequence the admin hook sends (lookup, create targets, save, publish) so the client logic is proven against a real server"

key-files:
  created:
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/PublishBar.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/publishRules.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/publishRules.unit.test.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocaleTabs.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocalizedFieldsForm.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormPublish.test.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormLocales.test.tsx
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-locale-save.service.test.ts
    - apps/strapi/docs/short-films-admin.md
    - .planning/phases/01-short-film-catalog-backend/deferred-items.md
  modified:
    - apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx

key-decisions:
  - "D-22 branch shipped: LOCALE TABS CREATE ROWS. Spike A3 (01-01) confirmed that a content-manager PUT ?locale= creates a missing locale row, so the native Content Manager fallback is not implemented and the guide says so"
  - "Content-manager request bodies are flat. The plan interface and the old hooks said { data }; the server drops that key, so createWork/updateWork now send the entity itself (boot-proven)"
  - "The first save of a language for a work with credits or cast first creates a row in that language for each credited person, credit-role and cast character that lacks one (lookup with a documentId $in filter, then flat PUTs), then saves the work. Roles and characters start as copies of their default-language name; the role slug is passed explicitly because uid fields are not copied"
  - "The publish pre-check always runs on the saved DEFAULT-language draft, on every tab, because the server guard evaluates that draft whichever language is published; the bar says so on translation tabs"
  - "Publish and Unpublish are per language; there is no publish-all-languages or bulk action, so the 01-06 bulk-publish partial-success finding does not apply to the form (the guide warns about bulk in the native Content Manager)"
  - "A failed slug generation does not block a draft save; the SLUG_REQUIRED rule catches it at publish"
  - "Slug generation and the pre-check live on the default tab only; translation saves never send a slug (01-01 A3: the slug lives on the default-language row)"

patterns-established:
  - "Probe the real server before trusting a plan's request shape: a 10-line supertest probe found that every { data } body in the Works hooks was a silent no-op"
  - "Scope badge text assertions with within(testid) when tab badges and the publish bar both render a status word"

requirements-completed: [SDATA-02]

coverage:
  - id: D1
    description: "From the Work form an admin sees the status (Draft, Published, Modified) and publishes or unpublishes the current language; the request carries params.locale taken from /i18n/locales (never a literal)"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "WorkFormPublish.test.tsx#publishes the default locale; #reads the default locale from /i18n/locales, never a literal; #offers Unpublish for a published work; #shows Modified for a published work edited since"
        status: pass
      - kind: integration
        ref: "short-film-locale-save.service.test.ts#saves, publishes and unpublishes the translation once persons, roles and characters have the locale row (status draft -> published -> modified read from data.status)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The pre-check uses the shared evaluateShortFilmPublishRules: Publish is disabled while D-19 issues remain and each missing item is listed in plain language; a duration over 40 minutes warns without blocking; a film gets no rules"
    requirement: SDATA-02
    verification:
      - kind: unit
        ref: "publishRules.unit.test.ts (29 tests: workToRuleInput, extractPublishError, publishIssueMessage for every code, publishErrorMessages)"
        status: pass
      - kind: automated_ui
        ref: "WorkFormPublish.test.tsx#disables Publish and lists what is missing; #warns about a duration over 40 minutes without blocking; #applies no short-film rules to a film"
        status: pass
    human_judgment: false
  - id: D3
    description: "When the server refuses a publish or a save, the admin sees translated sentences derived from error.details.code and issues (SHORT_FILM_PUBLISH_BLOCKED, POSTER_REQUIRED, DIRECTOR_REQUIRED, DIRECTOR_UNPUBLISHED, WATCH_SOURCE_REQUIRED, SLUG_*, INVALID_COUNTRY_CODES, INVALID_LANGUAGE_CODES, INVALID_STREAMING_URL), never raw prose"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "WorkFormPublish.test.tsx#shows translated sentences when the server refuses the publish; #maps a refusal that has only a code, never raw server text; #maps a coded write refusal to a sentence"
        status: pass
    human_judgment: false
  - id: D4
    description: "Saving a work with a blank slug first calls the content-manager uid generator and sends the result; a generator failure does not block the draft save; the body is flat and carries params.locale"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "WorkFormPublish.test.tsx#asks the uid generator for a slug when it is blank; #keeps an existing slug; #still saves the draft when slug generation fails"
        status: pass
      - kind: integration
        ref: "short-film-locale-save.service.test.ts#generates a slug from a title through uid/generate; #reads the body flat"
        status: pass
    human_judgment: false
  - id: D5
    description: "Locale tabs list the configured locales default first with per-language status; the default tab is the full form; Arabic and English tabs edit only title, synopsis and poster (body keys exactly title, synopsis, poster) with params.locale; the poster is prefilled from the default language and the default title is a hint only; tabs other than the default are disabled for an unsaved work"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "WorkFormLocales.test.tsx (14 tests: tab order and status, full vs localized form, exact body keys, poster prefill and hint, required title, new-translation status, publish with params.locale, rules on the default draft, new-work tabs disabled)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Translating a credited work through PUT ?locale= succeeds: persons, roles and characters get a row in the target locale first, then the work saves, publishes and unpublishes in that locale without touching the default-language row; the code-less 'locale not found' refusal is mapped to a clear sentence"
    requirement: SDATA-02
    verification:
      - kind: integration
        ref: "short-film-locale-save.service.test.ts#is refused with 'locale not found' until the credited targets have a row in that locale; #saves, publishes and unpublishes the translation once ... have the locale row; #still evaluates the default-locale draft when a translation is published"
        status: pass
      - kind: automated_ui
        ref: "WorkFormLocales.test.tsx#gives the credited persons, roles and characters a row in the locale before the first save; #explains a locale-not-found refusal instead of showing the raw text"
        status: pass
    human_judgment: false
  - id: D7
    description: "The public short-film detail follows what the admin publishes: the published Arabic translation is served, the film drops out (404) when the default language is unpublished and returns when republished"
    requirement: SDATA-02
    verification:
      - kind: integration
        ref: "short-film-locale-save.service.test.ts#serves the published translation, drops out when the default language is unpublished and returns when it is republished"
        status: pass
    human_judgment: false
  - id: D8
    description: "Admin UAT in a real browser (visual quality of the tabs and publish bar, media-library poster pick, full create-translate-publish-unpublish walk)"
    verification: []
    human_judgment: true
    rationale: "No browser in this run. The request flow, statuses and public read are proven by the jsdom and boot suites, but layout, the live media-library dialog and the end-to-end walk through a running admin are not. See the Human-check section."

duration: 64min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 09: Locale Tabs, Publish Bar and Publish Pre-check Summary

**The Works form now publishes and unpublishes per language with a D-19 pre-check from the shared evaluator and translated server errors, saves translations from Arabic and English tabs (title, synopsis, poster only) including works with credits, generates a missing slug through the uid endpoint, and ships an operator guide; along the way a boot probe found that every `{ data }` body the Works hooks sent was silently dropped by the content-manager, which is fixed.**

## Performance

- **Duration:** 64 min
- **Started:** 2026-10-18T20:18:20Z
- **Completed:** 2026-10-18T21:22:46Z
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD; 3 task commits)
- **Files modified:** 12 (9 created, 3 modified), 2920 insertions, 56 deletions
- **Machine note:** load average peaked above 100 during the first full admin run; five suites timed out under that load and passed on a focused re-run (see Issues Encountered)

## Accomplishments

- `PublishBar` shows the status badge, Publish and Unpublish for one language, the D-19 missing-item list (Publish disabled while it is not empty) and a non-blocking duration warning. The list comes from `evaluateShortFilmPublishRules(workToRuleInput(work))`, the same evaluator as the server guard (T-01-27: advisory only).
- Server refusals are mapped from CODES (`error.details.code` and `issues[].code`) to sentences under `publish.issue.<CODE>` through `useCatalogT`; unknown codes get a generic "Publishing failed"; server prose is never displayed. `INVALID_STREAMING_URL` is included alongside the D-19, country and language codes.
- Blank slugs are generated by `POST /content-manager/uid/generate` before create/update; the default locale is read from `GET /i18n/locales` (`isDefault`), so `"fr"` appears nowhere in the page.
- `LocaleTabs` + `LocalizedFieldsForm`: default tab = full `WorkForm`; Arabic and English tabs edit title, synopsis, poster and send exactly those three keys with `params.locale` (T-01-28). A missing language starts with the default poster and the default title as a hint.
- Credited works are translatable: the first save of a language creates the missing person, credit-role and character rows, then the work (cross-plan finding 01-03, proven on a real Strapi).
- Boot suite `short-film-locale-save.service.test.ts` (8 tests) pins the content-manager facts the form relies on.
- Operator guide `apps/strapi/docs/short-films-admin.md` (111 lines) covering fields, translation, publish rules with every message and the fix for each, and limits.
- Gates: `yarn workspace @tiween/admin test` 99 suites / 1575 tests passed (was 96 / 1503 after 01-08); `yarn workspace @tiween/admin lint` exits 0; integration (`*.service.test.ts`, `*.controller.test.ts`, `tests/app.test.js`, `--runInBand`) 12 suites passed, 1 skipped (pre-existing), 187 tests passed.

## Task Commits

1. **Task 1: Publish end to end (tracer)** - `a7be154` (feat)
2. **Task 2 RED: failing locale tab tests** - `564daf2` (test)
3. **Task 2 GREEN: locale tabs with per-language save and publish** - `050f5c4` (feat)

No REFACTOR commit (no cleanup needed).

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## D-22 branch taken (A3)

**Locale tabs create the rows.** 01-01 spike A3 was CONFIRMED: a content-manager `PUT ?locale=<code>` creates a missing locale row (for a work without relations). This plan re-tested it with a credited work, as 01-03 asked, and found the real condition: without the credited targets in that locale the route answers `400 ValidationError: Document with id "...", locale "ar" not found` (not a 500, no `details.code`). The form therefore creates those targets first and keeps a mapped sentence as a safety net. The native Content Manager fallback was **not** implemented and the operator guide states which branch shipped.

## Tracer feedback gate

Task 1 is `type="tracer"` with an `<automated>`-only verify under the default `end-of-phase` mode. After its commit both verify commands were re-run green (`publishRules.unit.test.ts` 29 tests, `WorkFormPublish.test.tsx` 15 tests, `WorkFormShortFields.test.tsx` 11 tests) before the expansion task started. "Tracer verified end-to-end, expanding"; no checkpoint.

## TDD Gate Compliance (Task 2)

- **RED** (`564daf2`): `WorkFormLocales.test.tsx`, 14 tests, all failed with `Unable to find role="tab"` from the page helper that waits for the tabs: the planned feature (tabs) does not exist yet, no syntax, import or fixture fault. Semantic assessment: the target tests executed and failed because the behavior is missing. `gsd_run check tdd-red-evidence` has no jest adapter and the repo has no `workflow.tdd_mode`, so RED was assessed from the jest output.
- **GREEN** (`050f5c4`): first run 13 of 14; the one failure was a fixture mistake in the test (the "publish translation" case used a default draft with no director, so Publish was correctly disabled); fixed in the test, 14 of 14.
- **REFACTOR:** none.

## Files Created/Modified

- `.../WorkForm/PublishBar.tsx` - status badge, Publish/Unpublish, missing list and warning
- `.../WorkForm/publishRules.ts` - `workToRuleInput`, `extractPublishError`, `publishIssueMessage`, `publishErrorMessages`, `isKnownIssueCode`
- `.../WorkForm/LocaleTabs.tsx`, `LocalizedFieldsForm.tsx` - tabs and the three-field translation form (`toLocalizedValues`, `toLocalizedPayload`)
- `.../pages/Works/WorkFormPage.tsx` - tabs, publish bar, slug generation, translation save with the ensure step, error mapping
- `.../hooks/useCreativeWorks.ts` - flat bodies, locale params, `useLocales`, `generateSlug`, `ensureTranslationTargets`, `collectTranslationTargets`, `useWork(documentId, locale?)` with `meta`
- `.../__tests__/WorkFormPublish.test.tsx`, `WorkFormLocales.test.tsx`, `WorkForm/publishRules.unit.test.ts` - jsdom and unit suites
- `.../__tests__/WorkFormShortFields.test.tsx` - create body asserted flat; uid/generate stub
- `apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-locale-save.service.test.ts` - boot suite
- `apps/strapi/docs/short-films-admin.md` - operator guide
- `.planning/phases/01-short-film-catalog-backend/deferred-items.md` - out-of-scope findings

## Decisions Made

See `key-decisions` in the frontmatter. In short: locale tabs create rows (A3); bodies are flat; credited targets are created before a first translation save; the pre-check always reads the default-language draft; publish is per language only; slug work stays on the default tab.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The Works hooks wrapped every content-manager body in `{ data }`, which the server silently drops**

- **Found during:** Task 1 (boot probe of the translate flow: the Arabic row was created with a null title)
- **Issue:** The plan interface and the existing `createWork`/`updateWork` send `{ data }`. The content-manager collection-types controller reads `ctx.request.body` flat; the unknown `data` key is stripped. A real create stored an empty draft (null title and type) and an update changed nothing. The Works form was unreachable until 01-07, and its jest tests asserted the wrapped shape against a mock, so nothing caught it. Without the fix none of this plan's saves (default or translation) would persist.
- **Fix:** `createWork`, `updateWork` and the ensure step send the entity as the body; locale and publish actions use `{ params: { locale } }`. `WorkFormShortFields.test.tsx` now asserts the body has no `data` key.
- **Files modified:** `useCreativeWorks.ts`, `WorkFormShortFields.test.tsx`
- **Verification:** boot test "reads the body flat" (wrapped body saves nothing, flat body persists); jsdom tests assert flat bodies.
- **Committed in:** `a7be154`

**2. [Rule 2 - Missing critical] Translating a credited work failed with 400 "locale not found" (01-03 finding)**

- **Found during:** Task 1 probe, resolved in Task 2
- **Issue:** `PUT ?locale=ar` of a work with credits/cast answers 400 `Document ... locale "ar" not found` unless each credited person, credit-role and character has a row in that locale. The AR/EN tabs would have been unusable for every real film.
- **Fix:** `ensureTranslationTargets` (lookup with a `documentId $in` filter, then flat PUTs for the missing ones) runs before the first save of a language; `extractPublishError` also maps the code-less refusal to `TRANSLATION_TARGET_MISSING` so any residual failure shows a clear sentence.
- **Files modified:** `useCreativeWorks.ts`, `publishRules.ts`, `WorkFormPage.tsx`
- **Verification:** boot suite (refusal without targets, success with the exact sequence the hook sends, second save needs no ensure) and `WorkFormLocales.test.tsx` (request order p1, r1, c1, work with the locale on each).
- **Committed in:** `a7be154` (hook and mapping), `050f5c4` (page wiring)

**3. [Rule 2 - Missing critical] `generateSlug` could put a non-string into the payload**

- **Found during:** Task 1 (existing create tests returned an object for every POST)
- **Fix:** `generateSlug` throws `SLUG_GENERATION_FAILED` unless the response is a non-empty string; the page then saves without a slug.
- **Committed in:** `a7be154`

**4. [Rule 3 - Blocking] Plan verify command swallows the test path (same as 01-07/01-08)**

- **Fix:** focused runs used `--selectProjects admin --testPathPattern '<pattern>'`; the full gate was run separately. No plan file edited.

**5. [Rule 3 - Blocking] Tab badges and the publish bar render the same status words**

- **Fix:** `WorkFormPublish.test.tsx` scopes status assertions with `within(getByTestId("publish-bar"))`.
- **Committed in:** `050f5c4`

### Plan interpretations (not defects)

- `useLocales` and the locale-aware `useWork`/`updateWork` signatures landed in Task 1 (the page needs the default locale to publish), not Task 2.
- Added two files not in the plan's list: the boot suite `short-film-locale-save.service.test.ts` (the orchestrator required a boot or admin-flow proof of the credited translation) and `deferred-items.md`.
- The plan interface listed `PUT ... with { data }`; the real contract is flat (deviation 1).
- The pre-check on a translation tab shows the default-language draft's issues with an explicit note, because that is what the server evaluates.

---

**Total deviations:** 5 auto-fixed (1 bug, 2 missing critical, 2 blocking) plus 4 interpretations.
**Impact on plan:** Deviation 1 is a pre-existing defect that made the whole Works form a silent no-op against a real server; fixing it was required for the plan's goal. No scope creep beyond the two added files.

## Issues Encountered

- **Pre-existing, same defect elsewhere (not fixed):** `hooks/usePeople.ts` and `components/SubEventModal/index.tsx` also wrap content-manager bodies in `{ data }` and their tests assert that shape against mocks. They are outside this plan; logged in `deferred-items.md` and in the broken-windows ledger. **This likely means people and planning writes also store nothing against a real server and deserves an early check.**
- Switching locale tabs discards unsaved edits of the tab being left (separate form state). The guide says to save first; logged as a deferred item.
- The first full admin run happened under machine load above 100 (other processes on the host): five suites (`WorksRouting`, `VenueFormModal`, `SubEventModal`, venues `Venues/index`, `WorkFormShortFields`) timed out or tripped on timing; all passed on a focused re-run with `--maxWorkers=2`, and the final full run (load about 10) passed 99 of 99 suites. The `WorkFormShortFields` count assertion that also failed was a real consequence of the new slug generation (two POSTs on create), fixed in the test.
- Pre-commit hooks (turbo lint over both workspaces) took 40 s to 2 min per commit; all passed without `--no-verify`.
- A standalone `tsc --noEmit` over the new admin files shows only pre-existing errors (`VenueSelector`, `CastEditor`, `CreditsEditor`) plus the known TS2786 duplicate-React-types noise; the repo type-check excludes admin sources.

## Human-check (NOT executed)

**Admin UAT in a running admin was not run: this run has no browser and no `develop` session.** Nothing below is claimed verified in a browser. What each step has instead:

| UAT step                                                                                       | Real-browser result             | What does cover it                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1 Works, Add a work, short film, fill fields, Save                                             | not run                         | jsdom create-body tests (01-08, flat body); boot test: flat body persists                                                     |
| 2 Publish disabled, lists "Add a poster before publishing"                                     | not run                         | `WorkFormPublish.test.tsx` (disabled, both messages)                                                                          |
| 3 Pick a poster in the media library, Save, Publish, status Published                          | not run                         | live media-library dialog never exercised (also open from 01-07); boot test: publish returns 200 and status reads `published` |
| 4 Arabic tab: title and synopsis, Save, Publish AR                                             | not run                         | `WorkFormLocales.test.tsx`; boot test with a credited work end to end                                                         |
| 5 English tab: same                                                                            | not run                         | same suites (the boot "ruleful" test uses `en`)                                                                               |
| 6 Default tab: change duration, Save, status Modified, Publish                                 | not run                         | boot test reads `modified` after an edit; jsdom shows the Modified badge                                                      |
| 7 Unpublish the default language                                                               | not run                         | boot test unpublishes through the same route                                                                                  |
| 8 `curl .../short-films/<slug>?locale=ar` returns 404 after step 7, AR content after republish | not run against a running admin | boot test "the public read follows what the admin publishes" asserts exactly this sequence on the booted app                  |

To do in a browser (Docker up, `yarn workspace @tiween/admin develop`): walk steps 1-8 and, in addition, check the look of the tab badges and publish bar, that the pre-check list updates after a save, that a failed publish toast reads well, and that switching tabs behaves (unsaved edits are lost).

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. New catalog keys (`publish.*`, `locales.*`, `localized.*`) ship as `useCatalogT` defaults only, like every existing catalog key (no `events-manager.catalog.*` entries exist in the translation files), so the admin shows English text until those files get entries.

## Threat Flags

None new. T-01-27 mitigated (pre-check is advisory; the boot suite shows the server guard still blocks a translation publish when the default-language draft is incomplete). T-01-28 mitigated (translation saves send exactly title, synopsis, poster; asserted in `WorkFormLocales.test.tsx`, and the boot suite shows the default-language row untouched). T-01-29 accepted as planned. T-01-SC: no dependency added, lockfile and manifests untouched. Note: the ensure step creates person/credit-role/character locale rows through the existing authenticated content-manager routes (no new endpoint or permission).

## Next Phase Readiness

- 01-10 (importer): the same finding applies; create person, credit-role and character rows in every locale it writes translations for. This plan's boot suite shows the exact request sequence for the content-manager path.
- 01-13 can drive the real form (it renders, saves and publishes against the real server contract).
- Open: the admin UAT above; the deferred `{ data }` bodies in `usePeople` and `SubEventModal`; the guide links `short-films-api.md`, which plan 01-05 writes (the link resolves once it lands).
- Postgres behaviour is unverified here (SQLite only).

## Self-Check: PASSED

- FOUND: all 9 created files above and `deferred-items.md` (`[ -f ]` checked), plus the three modified files
- FOUND commits a7be154, 564daf2, 050f5c4 (ancestors of HEAD; `git rev-list --count` from the plan base = 3)
- Acceptance greps re-run: `evaluateShortFilmPublishRules` in WorkFormPage.tsx prints 2; `uid/generate` in useCreativeWorks.ts prints 1; `"fr"` in WorkFormPage.tsx prints 0; `/i18n/locales` in useCreativeWorks.ts prints 1; guide matches `D-19|POSTER_REQUIRED|Add a poster` and names the shipped D-22 branch
- Gates re-run: both Task 1 verify commands pass (29 and 15 tests); Task 2 verify command passes (WorkFormLocales + WorkFormPublish + WorkFormShortFields: 40 tests); `yarn workspace @tiween/admin test` 99 suites / 1575 tests; `yarn workspace @tiween/admin lint` exit 0; integration project 12 suites / 187 tests passed, 1 suite skipped (pre-existing)

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
