---
phase: 01-short-film-catalog-backend
plan: 08
subsystem: admin-ui
tags:
  [
    strapi,
    admin,
    react-hook-form,
    zod,
    design-system,
    jest,
    jsdom,
    events-manager,
    short-film,
  ]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-02 shared short-film-rules module (ISO list, curated languages, streaming enums, Zod validators) and the schema delta (streamingLinks, country, language, featured, featuredRank)"
  - phase: 01-short-film-catalog-backend
    provides: "01-07 routed Works pages, real MediaInput, useStrapiApp admin test mock"
provides:
  - "StreamingLinksEditor: repeatable Where-to-watch editor (platform, https URL, access type, label), short films only"
  - "CodeMultiPicker and CountryLanguageFields: searchable Combobox plus removable Tag chips for countries and languages, every work type"
  - "Directory placement section (featured toggle, featured rank >= 1) for short films only"
  - "WorkFormValues gains streamingLinks, country, language, featured, featuredRank with lossless work -> form -> content-manager payload mapping"
  - "WORK_POPULATE includes streamingLinks so load-then-save never drops links"
  - "jsdom setup that lets the Design System Combobox open under test (observer and scrollIntoView stand-ins)"
affects: [01-09, 01-13]

actuals:
  tokens: 14747
  tasks: 2
  commits: 3

plan_head_before: 772470346c9fa0227b595f55c5e63dc385493954
plan_head_after: 833ac97f2ad3ac8f13e4770455811fa43c030ad7

tech-stack:
  added: []
  patterns:
    - "Searchable multi-select composed from DS Combobox (autocomplete none, own filtering, controlled textValue) plus DS Tag chips, because DS 2.0.1 MultiSelect cannot filter 249 countries"
    - "Pure option helpers (buildCodeOptions, filterCodeOptions, addCode, removeCode) carry the picker rules and are unit-tested apart from the widget"
    - "Shared Zod validators reused in the form through a superRefine wrapper that surfaces their single INVALID_*_CODES message while keeping the string[] type"
    - "Key-set contract tests import the real schema.json files and assert every payload key exists on them (DW-13)"

key-files:
  created:
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/StreamingLinksEditor.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/CountryLanguageFields.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/CodeMultiPicker.test.tsx
  modified:
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts
    - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx
    - apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
    - apps/strapi/src/plugins/events-manager/admin/src/hooks/workPopulate.ts
    - apps/strapi/tests/setup-jsdom.ts

key-decisions:
  - "Selected codes are removed from the combobox list instead of being shown again, so 'choose an already-selected code' cannot happen from the UI; addCode still returns the same array for that case as a guard"
  - "featuredRank is sent as null whenever featured is false, so a stale rank never persists on an unfeatured film"
  - "Language labels are upper-cased on the first letter after Intl.DisplayNames (French returns 'francais' lowercase); aeb, ber and none keep explicit catalog defaults"
  - "streamingLinks and the placement fields are not stripped from the payload when the type is switched away from short-film: components are re-sent wholesale, so switching type never silently deletes stored data"

patterns-established:
  - "Drive a DS Combobox in jsdom with keyDown ArrowDown (opens the list), change (filters) and pointerUp on the option (selects); click does not select"
  - "Heavy whole-form jsdom suites set jest.setTimeout(30000); one test is 1-3 s alone and exceeded the 5 s default under the parallel full run"

requirements-completed: [SDATA-02, SDATA-01]

coverage:
  - id: D1
    description: "Admin adds, edits and removes streaming links on a short film; the section is absent for film and play; saving sends the exact component shape (platform, url, accessType, label null when blank)"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx#WorkForm - streaming links (Task 1) (4 tests)"
        status: pass
      - kind: unit
        ref: "apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts#streaming links - form mapping"
        status: pass
    human_judgment: false
  - id: D2
    description: "Streaming-link URLs must be https; javascript:, http:, data: and bare strings, an unknown platform or access type are rejected before any request"
    requirement: SDATA-02
    verification:
      - kind: unit
        ref: "schema.unit.test.ts#rejects http:, javascript: and non-URL streaming urls; #rejects an unknown platform or access type"
        status: pass
      - kind: automated_ui
        ref: "WorkFormShortFields.test.tsx#does not send a request when the streaming url is not https"
        status: pass
    human_judgment: false
  - id: D3
    description: "Load-then-save keeps streaming links (WORK_POPULATE includes streamingLinks) and every payload key exists on the real creative-work and streaming-link schemas"
    requirement: SDATA-02
    verification:
      - kind: unit
        ref: "schema.unit.test.ts#WORK_POPULATE - streamingLinks; #short-film fields - key sets against the real schemas (DW-13)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Country and language pickers for every work type: searchable, Tunisia and Tunisian Arabic pinned first, Intl.DisplayNames labels in the admin locale, explicit labels for aeb, ber, none, none exclusive, removable chips"
    requirement: SDATA-01
    verification:
      - kind: unit
        ref: "apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/CodeMultiPicker.test.tsx (21 tests incl. option helpers, locale labels, type-to-filter and select)"
        status: pass
      - kind: automated_ui
        ref: "WorkFormShortFields.test.tsx#shows the country and language pickers for type Film|Play|Short film"
        status: pass
    human_judgment: false
  - id: D5
    description: "Directory placement (featured toggle, rank >= 1) for short films only; creating a short film sends country [TN], language [aeb], featured true, featuredRank 1; unfeatured sends rank null"
    requirement: SDATA-02
    verification:
      - kind: automated_ui
        ref: "WorkFormShortFields.test.tsx#sends country, language, featured and featuredRank for a short film; #sends featuredRank null when the work is not featured; #shows the directory placement section for a short film only"
        status: pass
      - kind: unit
        ref: "schema.unit.test.ts#country, language and placement - form mapping (Task 2) (10 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The form validators reject unknown country and language codes and none combined with another language with the shared INVALID_COUNTRY_CODES / INVALID_LANGUAGE_CODES messages"
    requirement: SDATA-01
    verification:
      - kind: unit
        ref: "schema.unit.test.ts#rejects an unknown country code with INVALID_COUNTRY_CODES; #rejects an unknown language and none combined with another code"
        status: pass
    human_judgment: false
  - id: D7
    description: "The new form sections look and behave right in a real admin: search feel and keyboard use of the country/language combobox in a 249-item list, chip layout, the placement section, and visual hierarchy of the Where-to-watch rows"
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout and a stand-in for the combobox observers; list virtualization above 100 options, real focus and popover behaviour, and visual quality need a running admin in a browser. Not executed in this run."

duration: 25min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 08: Short-Film Fields in the Works Form Summary

**The Works form now edits every short-film field the directory needs: a Where-to-watch streaming-links editor (https only), searchable country and language pickers with Tunisia and Tunisian Arabic pinned first, and a featured toggle and rank, all mapped losslessly to the content-manager payload and validated by the shared server rules.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-18T19:11:10Z
- **Completed:** 2026-10-18T19:36:48Z
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD; 3 task commits)
- **Files modified:** 10 (4 created, 6 modified), 1607 insertions

## Accomplishments

- `StreamingLinksEditor` (platform, https URL, access type, optional label, add and remove) renders only for short films; `workToApiPayload` re-sends the links wholesale with a blank label as `null`, and `WORK_POPULATE` now includes `streamingLinks` so a load-then-save keeps them (Pitfall 9, T-01-26).
- `CodeMultiPicker` builds a searchable multi-select from DS `Combobox` plus `Tag` chips; `CountryLanguageFields` renders the country picker (249 ISO codes, TN first, `Intl.DisplayNames` region labels) and language picker (curated list, aeb first, explicit labels for aeb/ber/none, `none` exclusive) for every work type.
- Directory placement section (DS `Toggle` and `NumberInput`, rank disabled until featured, min 1) for short films only; rank is sent `null` when not featured.
- The form schema reuses `countryCodesSchema` / `languageCodesSchema` / the streaming enums from `src/shared/short-film-rules.ts` (no duplicated lists); key-set tests pin every payload key to `creative-work/schema.json` and `streaming-link.json`.
- Gates: `yarn workspace @tiween/admin test` 96 suites / 1483 tests passed (was 89 / 1342 after 01-07); `yarn workspace @tiween/admin lint` exits 0.
- Tracer gate (Task 1, `<automated>`-only verify, default end-of-phase mode): both verify commands re-run green before expansion, "Tracer verified end-to-end, expanding"; no checkpoint.

## Task Commits

1. **Task 1: Streaming links end to end (tracer)** - `1b697f4` (feat)
2. **Task 2 RED: failing tests for country, language and placement** - `caed617` (test)
3. **Task 2 GREEN: country, language and placement fields** - `833ac97` (feat)

No REFACTOR commit (no cleanup needed).

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## TDD Gate Compliance

- **RED** (`caed617`): `schema.unit.test.ts` ran 54 tests with 9 failing on the planned behaviours (defaults missing, `undefined` instead of the round-tripped arrays, no INVALID\_\* issue, rank 0 accepted, keys absent from the payload); `WorkFormShortFields.test.tsx` ran 11 with the 4 Task 1 tests passing and the 7 new ones failing on `Unable to find ... role "combobox" name "Countries"`, missing "Directory placement" text and missing `featured`/`country` payload keys. `CodeMultiPicker.test.tsx` failed with `Cannot find module '../WorkForm/CountryLanguageFields'`, a module-not-found load failure (same shape as the 01-02 RED; it is the specified RED for a brand-new module). The repo has no `workflow.tdd_mode` config (`.planning/config.json` absent) and the `check tdd-red-evidence` classifier has no jest adapter, so RED was assessed semantically from the jest output, not machine-classified.
- **GREEN** (`833ac97`): schema file 54 passed; the two jsdom files 32 passed; full admin gate 1483 passed.
- **REFACTOR:** none.
- Test-file edits made in GREEN (DS interaction details that could only be discovered against the real component): open the combobox with `keyDown ArrowDown` before typing, select with `pointerUp` (click does not select), the rank input is a `textbox` not a `spinbutton`, and French language labels are capitalised (`Francais`).

## Files Created/Modified

- `.../WorkForm/StreamingLinksEditor.tsx` - repeatable Where-to-watch rows
- `.../WorkForm/CountryLanguageFields.tsx` - `CodeMultiPicker`, `CountryLanguageFields`, and the pure helpers `buildCodeOptions`, `filterCodeOptions`, `addCode`, `removeCode`
- `.../WorkForm/schema.ts` - `streamingLinkFormSchema`, `EMPTY_STREAMING_LINK`, `country`/`language`/`featured`/`featuredRank`, defaults, load and payload mapping
- `.../WorkForm/index.tsx` - `isShort` sections, pickers in Identity, `Film` icon replaced
- `.../hooks/useCreativeWorks.ts` - `StreamingLinkItem` and the new optional `CreativeWork` fields
- `.../hooks/workPopulate.ts` - `streamingLinks`
- `.../WorkForm/schema.unit.test.ts` - mapping, validator and key-set tests (+44 tests)
- `.../__tests__/WorkFormShortFields.test.tsx`, `.../__tests__/CodeMultiPicker.test.tsx` - jsdom suites
- `apps/strapi/tests/setup-jsdom.ts` - no-op `IntersectionObserver`/`ResizeObserver` and `scrollIntoView`

## Decisions Made

See `key-decisions` in the frontmatter. In short: selected codes drop out of the list; `featuredRank` is null unless featured; language names capitalised after `Intl.DisplayNames`; type switches never strip stored component data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Film` icon does not exist in `@strapi/icons` 2.2.3, so the whole WorkForm crashed**

- **Found during:** Task 1 (first jsdom run: "Element type is invalid ... got: undefined")
- **Issue:** `WorkForm/index.tsx` imported `Film` from `@strapi/icons`; the installed package has no such export, so rendering any non-play type button threw. 01-07 stubbed `WorkForm` in its routing test, which hid it. Without this fix the form that 01-07 routed cannot render in a real admin at all.
- **Fix:** Replaced `Film` with `Play` (exists in 2.2.3, along with `Stack` and `PaperPlane`).
- **Files modified:** `WorkForm/index.tsx`
- **Verification:** all `WorkFormShortFields` tests render the real form and pass.
- **Committed in:** `1b697f4`

**2. [Rule 3 - Blocking] jsdom could not open the DS Combobox**

- **Found during:** Task 2 GREEN
- **Issue:** Opening the combobox needs `IntersectionObserver` and `scrollIntoView`, which jsdom lacks (`ReferenceError`, then `TypeError`).
- **Fix:** Added guarded no-op stand-ins (`IntersectionObserver`, `ResizeObserver`, `Element.prototype.scrollIntoView`) to `tests/setup-jsdom.ts`; only defined when absent.
- **Files modified:** `apps/strapi/tests/setup-jsdom.ts`
- **Verification:** picker tests open the list, filter and select; full admin gate 96 suites green.
- **Committed in:** `833ac97`

**3. [Rule 3 - Blocking] Plan verify command swallows the test path (same as 01-07)**

- **Found during:** Task 1 verification
- **Issue:** `jest --selectProjects admin <path>` treats the path as a second project name.
- **Fix:** Ran `--selectProjects admin --testPathPattern '<pattern>'` for focused runs, plus the full gate. No plan file edited.
- **Verification:** focused runs list exactly the target suite.
- **Committed in:** n/a (command-level only)

**4. [Rule 1 - Bug] Whole-form jsdom tests exceeded Jest's 5 s default under the parallel run**

- **Found during:** Task 2 full-gate run (1 failure in 1483, passing alone)
- **Fix:** `jest.setTimeout(30000)` in `WorkFormShortFields.test.tsx`.
- **Verification:** full gate 96/96 suites green afterwards.
- **Committed in:** `833ac97`

**5. [Rule 3 - Blocking] Strapi-ui-design hook blocks `alert(` in any admin file**

- **Found during:** Task 1 (writing the javascript: URL test)
- **Issue:** the hook pattern-matched `javascript:alert(1)` inside a string literal.
- **Fix:** used `javascript:void(0)` in the tests; same protocol-rejection coverage.
- **Committed in:** `1b697f4`

---

**Total deviations:** 5 auto-fixed (2 bug, 3 blocking)
**Impact on plan:** No scope change. Deviation 1 is a pre-existing crash the plan needed fixed to be exercised at all; the rest are test-environment details. One additional file outside the plan list changed (`tests/setup-jsdom.ts`), and one extra test file was added (`CodeMultiPicker.test.tsx`) so the new module's RED was an honest load failure while the form-level RED stayed assertion-level.

## Issues Encountered

- The `Layouts.Header` jest stand-in returns an array without keys, so every WorkForm render logs "Each child in a list should have a unique key" and a DS "Accessing element.ref" React 19 warning. Both are pre-existing noise from shared test infrastructure and the DS/React pin; not fixed (out of scope).
- A standalone `tsc --noEmit` over the touched admin files shows only environment noise (TS2786 duplicate React types) plus two pre-existing TS2559 errors in `CastEditor.tsx` and `CreditsEditor.tsx` (untouched files). The repo's `type-check` excludes admin sources, so this is not a gate.
- Monorepo pre-commit hooks (turbo lint across workspaces) take about 1 minute per commit; all passed without `--no-verify`. lint-staged reformatted two staged files with prettier; the working tree matched afterwards.

## Human-check (not executed)

**Real-browser behaviour of the new sections: NOT verified in this run.** With `yarn workspace @tiween/admin develop`: open Events Manager, Works, Add a work, choose Short film. Check: (1) Countries and Languages comboboxes open, search (type "tuni", "tun", "ber"), list Tunisia first / Tunisian Arabic first, scroll the full 249-country list (the DS list virtualises above 100 items; jsdom could not exercise that) and pick with keyboard and mouse; (2) chips wrap and remove; choosing "No dialogue" replaces other languages; (3) "Where to watch" rows add, edit and remove, an `http://` URL turns the field red and blocks Save; (4) "Directory placement": rank enables only when Featured is on; (5) save, reload and confirm links, countries, languages and rank persist; labels switch to French/Arabic names under the fr/ar admin locale.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. Catalog keys (`workForm.streamingSection`, `workForm.placementSection`, `streaming.*`, `languages.aeb|ber|none`, `picker.*`) ship as `useCatalogT` defaults only, consistent with every existing catalog key (no `events-manager.catalog.*` entries exist in the translation files).

## Threat Flags

None. No new endpoint, auth path or dependency (T-01-SC: lockfile and manifests untouched). T-01-24 mitigated: the form schema accepts only `https:` URLs (rejects `javascript:`, `http:`, `data:`), covered by unit and jsdom tests; public rendering must still treat the URL as untrusted (Phase 2). T-01-25 mitigated: pickers only offer allowed codes and the form reuses the shared validators; the 01-06 server guard re-validates on every write. T-01-26 mitigated: `streamingLinks` in `WORK_POPULATE`, pinned by a unit test.

## Next Phase Readiness

- 01-09 (locale tabs, publish bar, client-side publish pre-check) can import `StreamingLinkFormValues`, the new `WorkFormValues` fields and the shared rules already wired into `schema.ts`.
- The Works form can now render for real (the `Film` icon crash is gone), so 01-09 and 01-13 can test against the real component.
- Open: the human-check above; a backlog candidate is the keyless `Layouts.Header` test stand-in.

## Self-Check: PASSED

- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/StreamingLinksEditor.tsx
- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/CountryLanguageFields.tsx
- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/**tests**/WorkFormShortFields.test.tsx
- FOUND: apps/strapi/src/plugins/events-manager/admin/src/components/**tests**/CodeMultiPicker.test.tsx
- FOUND commits 1b697f4, caed617, 833ac97 (all ancestors of HEAD; `git rev-list --count` from the plan base = 3)
- Acceptance greps re-run: `"streamingLinks"` in workPopulate prints 1; `isShort &&` prints 2 (streaming and placement sections); `shared/short-film-rules` in schema.ts prints 1; PINNED\_\* in CountryLanguageFields prints 4; `Intl.DisplayNames` prints 3; `<CountryLanguageFields` in index.tsx prints 1
- Gates re-run: both plan verify commands exit 0 (54 and 11 tests); `yarn workspace @tiween/admin test` 96 suites / 1483 passed; `yarn workspace @tiween/admin lint` exit 0

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
