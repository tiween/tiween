---
phase: 01-short-film-catalog-backend
plan: 02
subsystem: api
tags: [strapi, schema, i18n, zod, iso-3166, short-film, creative-work]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-01 boot harness and spike verdicts (A3 slug not copied to a new locale row; test DB boots with fr/ar/en)"
provides:
  - "creative-works.streaming-link component (platform, url, accessType, label)"
  - "country, language, streamingLinks, featured, featuredRank attributes on creative-work, all explicitly non-localized"
  - "en locale ensured at bootstrap alongside fr (default) and ar"
  - "src/shared/short-film-rules.ts: vendored 249-code ISO list, curated language list, platform and access enums, Zod country/language validators, D-19 publish-rule evaluator, D-04 derivations"
  - "Regenerated Strapi types (CreativeWorksStreamingLink and the five attributes)"
affects: [01-03, 01-04, 01-05, 01-06, 01-08, 01-09, 01-10]

actuals:
  tokens: 11100
  tasks: 2
  commits: 3

plan_head_before: 07a769d702c3ce6f91aaa48352567b144f49c1a1
plan_head_after: 5df0261f368caced0ce794cc11414bbd21631496

tech-stack:
  added: []
  patterns:
    - "Single browser-safe shared rules module (zod only, no @strapi/*, no node:*) consumed by server guard, admin form and importer"
    - "Schema contract unit test pins pre-existing attribute keys, collectionName and poster localization so schema deltas stay additive"
    - "Validators use z.custom with a single code message so every failure carries one stable error CODE, never prose"

key-files:
  created:
    - apps/strapi/src/components/creative-works/streaming-link.json
    - apps/strapi/src/shared/short-film-rules.ts
    - apps/strapi/src/shared/__tests__/short-film-rules.unit.test.ts
    - apps/strapi/src/bootstrap/i18n-locales.unit.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-schema.service.test.ts
    - apps/strapi/src/plugins/creative-works/server/src/content-types/__tests__/creative-work-schema.unit.test.ts
  modified:
    - apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json
    - apps/strapi/src/bootstrap/i18n-locales.ts
    - apps/strapi/types/generated/components.d.ts
    - apps/strapi/types/generated/contentTypes.d.ts

key-decisions:
  - "Country and language are stored as plain JSON arrays and validated by shared Zod schemas rather than by relation or enum columns, so the DB schema stays additive and the lists can grow without a migration"
  - "evaluateShortFilmPublishRules throws SKIP_NOT_ALLOWED for any skip code other than POSTER_REQUIRED so the D-20 bypass cannot widen"
  - "DIRECTOR_UNPUBLISHED is only evaluated when publishedPersonIds is supplied; callers that cannot resolve person state still get the other rules"
  - "ISO list is a vendored literal, checked against Intl.DisplayNames in a test, because Intl cannot enumerate regions and over-accepts non-countries"

patterns-established:
  - "Component enums asserted equal to shared-module constants (order included) in a contract test, so schema.json and validators cannot drift"
  - "Non-localized attributes always carry an explicit pluginOptions.i18n.localized false"

requirements-completed: [SDATA-01]

coverage:
  - id: D1
    description: "creative-works.streaming-link component and the five non-localized attributes boot on a real Strapi and round-trip identically in the fr and en rows; omitted country/language read back null and [] reads back []"
    requirement: SDATA-01
    verification:
      - kind: integration
        ref: "apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-schema.service.test.ts (4 tests, rebuilt dist/)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The en locale is ensured at bootstrap, idempotently, with fr kept as the default"
    requirement: SDATA-01
    verification:
      - kind: unit
        ref: "apps/strapi/src/bootstrap/i18n-locales.unit.test.ts (4 tests)"
        status: pass
      - kind: integration
        ref: "short-film-schema.service.test.ts#has the en locale after boot alongside fr (default) and ar"
        status: pass
    human_judgment: false
  - id: D3
    description: "Schema delta is strictly additive: all 20 pre-existing creative-work keys, collectionName and poster localization unchanged, new attributes explicitly non-localized, component enums equal the shared constants"
    requirement: SDATA-01
    verification:
      - kind: unit
        ref: "apps/strapi/src/plugins/creative-works/server/src/content-types/__tests__/creative-work-schema.unit.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Shared rules module: ISO list, country/language validators, D-19 publish-rule evaluator, isAvailableOnline and hasAwards"
    requirement: SDATA-01
    verification:
      - kind: unit
        ref: "apps/strapi/src/shared/__tests__/short-film-rules.unit.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Regenerated Strapi types expose CreativeWorksStreamingLink and the five new attributes"
    requirement: SDATA-01
    verification:
      - kind: other
        ref: "grep -c CreativeWorksStreamingLink apps/strapi/types/generated/components.d.ts (prints 2)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-10-18
status: complete
---

# Phase 1 Plan 02: Short-Film Schema Delta and Shared Rules Summary

**Additive creative-work schema delta (country, language, streamingLinks, featured, featuredRank plus a streaming-link component), the `en` locale at bootstrap, and one browser-safe `short-film-rules.ts` owning the ISO and language lists, Zod validators and the D-19 publish-rule evaluator.**

## Performance

- **Duration:** about 20 min (each commit spent roughly 1.5 min in the monorepo pre-commit lint/turbo run)
- **Started:** 2026-10-18T16:33Z (approximate; the start timestamp was not captured at spawn)
- **Completed:** 2026-10-18T16:54Z
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD)
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments

- New `creative-works.streaming-link` component and five attributes on `creative-work`, all with explicit `i18n.localized: false`; nothing existing was renamed or changed.
- Booted round trip on a real Strapi (SQLite): a short film created in `fr` with country `["TN","FR"]`, language `["aeb","fr"]`, one YouTube link, featured true, rank 1 is read back identically from the published `fr` and `en` rows, with the `en` title served on the `en` row.
- `ensureI18nLocales` now ensures `fr`, `ar`, `en`; unit-tested for create order, idempotency, partial state and default restoration.
- `src/shared/short-film-rules.ts` (zod only) exports the 249-code ISO list, language and streaming vocabularies, `countryCodesSchema`/`languageCodesSchema` (single `INVALID_*_CODES` message), `evaluateShortFilmPublishRules`, `isDirectingCredit`, `isAvailableOnline`, `hasAwards`.
- Tracer gate: the tracer `<verify>` (unit plus booted round trip) passed before expansion; "Tracer verified end-to-end, expanding".

## Task Commits

1. **Task 1: Additive schema delta + `en` locale, round-tripped through a booted Strapi (tracer)** - `d59008a` (feat)
2. **Task 2 RED: failing tests for short-film rules and schema contract** - `71f95be` (test)
3. **Task 2 GREEN: shared short-film rules module** - `5df0261` (feat)

No REFACTOR commit (no cleanup needed).

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## RED evidence (Task 2)

- Command: `yarn workspace @tiween/admin jest src/shared/__tests__/short-film-rules.unit.test.ts src/plugins/creative-works/server/src/content-types/__tests__/creative-work-schema.unit.test.ts`
- Result before implementation: `Test Suites: 2 failed, 2 total`, `Cannot find module '../short-film-rules'`.
- Semantic assessment: this is a module-not-found load failure, which is exactly the RED the plan specifies ("confirm they fail because the module does not exist"), not a behavioural assertion failure. The repo has no `workflow.tdd_mode` config, so the `check tdd-red-evidence` classifier was not run. The GREEN run then passed all 71 tests (including 4 behaviours that would fail on a wrong implementation: director matched by slug only, skip allow-list, `none` exclusivity, 40 vs 41 minute boundary).
- GREEN: `Tests: 71 passed, 71 total` across the two files.

## Verification run

- `yarn workspace @tiween/admin jest src/bootstrap/i18n-locales.unit.test.ts`: 4 passed.
- Boot suite from a rebuilt dist/ (sentinel `dist/src/index.js` deleted, `build:test-dist` re-emitted, asserted present, then `jest --selectProjects server --testMatch='**/short-film-schema.service.test.ts' --runInBand`): 4 passed, run twice (before types regeneration and again at the end).
- `yarn workspace @tiween/admin test` (unit gate): `Test Suites: 87 passed, 1319 passed` (was 84 suites / 1244 tests after 01-01; +3 suites).
- `yarn workspace @tiween/admin lint` (`eslint . --max-warnings=0`): clean.
- Acceptance greps: schema node check exits 0, `"English (en)"` count 1, `components_creative_works_streaming_links` count 1, `CreativeWorksStreamingLink` count 2, no `@strapi`/`node:` imports in the rules module (0), `export function evaluateShortFilmPublishRules` count 1, platform enum prints `youtube,vimeo,dailymotion,artify,arte,mubi,netflix,shahid,tv5monde,other`.
- `yarn workspace @tiween/admin generate:types` ran successfully (0 warnings, 0 errors); the diff to the two generated files is additions only (74 lines).

## Files Created/Modified

- `apps/strapi/src/components/creative-works/streaming-link.json` - streaming-link component
- `apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json` - five appended attributes
- `apps/strapi/src/bootstrap/i18n-locales.ts` - `en` added to REQUIRED_LOCALES
- `apps/strapi/src/bootstrap/i18n-locales.unit.test.ts` - bootstrap unit test
- `apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-schema.service.test.ts` - booted round trip (`.tmp/short-film-schema.db`)
- `apps/strapi/src/shared/short-film-rules.ts` - shared constants, validators, evaluator, derivations
- `apps/strapi/src/shared/__tests__/short-film-rules.unit.test.ts` - rules unit tests
- `apps/strapi/src/plugins/creative-works/server/src/content-types/__tests__/creative-work-schema.unit.test.ts` - additive-schema and enum-parity contract
- `apps/strapi/types/generated/components.d.ts`, `contentTypes.d.ts` - regenerated, additions only

## Decisions Made

- JSON arrays validated by shared Zod schemas rather than relation or enum columns: keeps the DB delta additive and the lists extensible without migrations.
- The skip allow-list is enforced inside the evaluator (throws `SKIP_NOT_ALLOWED`), so no caller can widen the D-20 bypass.
- `DIRECTOR_UNPUBLISHED` only runs when `publishedPersonIds` is supplied, so browser-side callers without person state still get the other rules.
- `z.custom` with a fixed `message` is used for the code-list schemas so every rejection (including a non-array) carries exactly one stable error code.

## Observed behaviour worth recording

- JSON defaults: omitted `country`/`language` read back `null`; `[]` reads back `[]`; omitted `featured` reads back `false` and omitted `featuredRank` reads back `null`.
- Strapi creates the `en` locale itself on first boot (the boot log showed `Created i18n locale "fr"`, `Created i18n locale "ar"`, `i18n locale "en" already exists`, then `Changed i18n default locale from "en" to "fr"`). The explicit `en` entry in `REQUIRED_LOCALES` is therefore defensive, not load-bearing on this Strapi version, but it makes the requirement independent of Strapi's built-in default.
- Non-localized fields were synced to the `en` row at publish with `locale: "*"`; the test asserts this for all five new fields.

## Deviations from Plan

None - plan executed exactly as written. Two non-deviation notes: (1) the first attempt to write the boot test failed because `src/__tests__/` did not exist in the creative-works plugin; the directory was created and the file rewritten before any build or commit. (2) The plan allowed `generate:types` to be skipped on failure; it ran cleanly, so the generated files were updated, not left untouched.

**Total deviations:** 0.
**Impact on plan:** None.

## Issues Encountered

- Monorepo pre-commit hooks (turbo lint across workspaces) take about 1.5 min per commit; all three commits passed them without `--no-verify`.
- The lint-staged stale-index quirk did not occur this run; the working tree carries only the user's unrelated edits.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-01-03 mitigated by the additive-only schema delta and `creative-work-schema.unit.test.ts`; T-01-04 and T-01-05 mitigated at the validator level (`countryCodesSchema`/`languageCodesSchema`, max 10, unique, exact membership); enforcement on every write is 01-06's job (Document Service middleware). T-01-SC: no dependency added, lockfile and manifests untouched. `apps/strapi/.env` was neither read nor staged.

## Next Phase Readiness

- 01-03/01-04 can project `country`, `language`, `streamingLinks`, `featured`, `featuredRank`; remember (from 01-01 A3/A4) that `slug` and localized-target relations must come from the default-locale row.
- 01-06 can import `evaluateShortFilmPublishRules`, `countryCodesSchema`, `languageCodesSchema` and `RESERVED_SHORT_FILM_SLUGS` from `src/shared/short-film-rules`; the guard must pass `publishedPersonIds` to enable `DIRECTOR_UNPUBLISHED`.
- 01-08/01-09 can import the same module into the admin bundle (zod only).
- `main` auto-deploys and Strapi syncs the schema at boot: the delta is additive (new nullable columns, one new component table), but the first production boot after a push will run that sync.

## Self-Check: PASSED

- FOUND: apps/strapi/src/components/creative-works/streaming-link.json
- FOUND: apps/strapi/src/shared/short-film-rules.ts
- FOUND: apps/strapi/src/shared/**tests**/short-film-rules.unit.test.ts
- FOUND: apps/strapi/src/bootstrap/i18n-locales.unit.test.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/**tests**/short-film-schema.service.test.ts
- FOUND: apps/strapi/src/plugins/creative-works/server/src/content-types/**tests**/creative-work-schema.unit.test.ts
- FOUND commit d59008a, FOUND commit 71f95be, FOUND commit 5df0261

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-18_
