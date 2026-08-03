---
title: "Rebuild the events-manager admin WorkForm against the reworked catalog model (DW-10)"
type: "bugfix"
created: "2026-08-03"
status: "done"
baseline_revision: "f0814b9bd7d74fdc29256c74959fea416a7929d1"
final_revision: "3d016eb"
review_loop_iteration: 0
followup_review_recommended: true
context:
  - "{project-root}/_bmad-output/project-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** Story 2C.3 reworked `creative-works.credit` from `{person, role(enum), character(string), customRole, billing}` to a relation shape `{person, creditRole(relation, REQUIRED), customRole, billing}` and added a separate `cast[]` component `{person, character(relation), billing}`, but the events-manager admin WorkForm was never rebuilt: `workToApiPayload` still POSTs `role`/`character` (dropped fields) and never sends the required `creditRole`, so saving any work carrying a credit fails validation or silently drops data, and `cast[]` is not editable at all. The admin also writes only the legacy `video.type`, while the client reads `video.videoType` (`eventMappers.ts:390`), so admin-entered trailers never surface.

**Approach:** Rebuild the WorkForm credit surface on the real component shapes — a required credit-role picker backed by the `credit-role` content type, a new cast editor with a character picker — and switch the videos editor to the `videoType` vocabulary consumers actually read, preserving each video's legacy `type` value untouched.

## Boundaries & Constraints

**Always:** Reach content types through the content-manager API with module-level UID constants, mirroring `usePeople.ts`/`useCreativeWorks.ts`. Use `documentId` (never `id`) for relation payloads. TypeScript strict — no `any`. Keep every user-facing string behind `useCatalogT(key, fallback)`. Preserve each video's existing legacy `type` value verbatim through the load→save round trip (never null it out, never write a new one).

**Block If:** the `credit-role` content type or its content-manager list endpoint cannot be read from the admin (there would be no way to satisfy the required relation).

**Never:** Do NOT drop, migrate, or re-default the legacy `video.type` enum — DW-11 was closed 2026-07-13 by human decision "Keep both (document the split)", which supersedes the bundle intent's "converge onto videoType". Do NOT edit `_bmad-output/implementation-artifacts/deferred-work.md`. Do NOT add reverse `person → works` relations (2C.3 guardrail #3). Do NOT add public REST routes for creative-works content types.

## I/O & Edge-Case Matrix

| Scenario            | Input / State                                                                            | Expected Output / Behavior                                                                                                                   | Error Handling             |
| ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Credit saved        | credit row with person + creditRole selected                                             | `workToApiPayload().credits[0]` = `{person: <documentId>, creditRole: <documentId>, customRole: null, billing}` — no `role`/`character` keys | No error expected          |
| Credit missing role | credit row with person but no creditRole                                                 | Zod validation fails on `credits[i].creditRole`; form does not submit                                                                        | Field-level error rendered |
| Custom role         | creditRole = the "other" role record, customRole = "Dramaturg"                           | `customRole` sent as `"Dramaturg"`; blank customRole is sent as `null`                                                                       | No error expected          |
| Cast saved          | cast row with person, no character                                                       | `payload.cast[0]` = `{person: <documentId>, character: null, billing}`                                                                       | No error expected          |
| Video round trip    | loaded video `{url, type: "TEASER", videoType: null}`, editor sets videoType `"trailer"` | payload video = `{url, type: "TEASER", videoType: "trailer"}` — legacy `type` unchanged                                                      | No error expected          |
| New video           | video appended in the editor                                                             | payload video = `{url, type: null, videoType: "trailer"}`                                                                                    | No error expected          |
| Legacy work         | fetched work whose credits carry no `creditRole`                                         | row loads with `creditRole: null`; save is blocked until one is picked                                                                       | Field-level error rendered |

</intent-contract>

## Code Map

- `apps/strapi/src/components/creative-works/credit.json` -- target shape `{person, creditRole(required), customRole, billing}`; do not change
- `apps/strapi/src/components/creative-works/cast.json` -- target shape `{person, character, billing}`; do not change
- `apps/strapi/src/components/common/video.json` -- dual enum `type` (legacy) + `videoType`; only its `info.description` changes (document the split)
- `apps/strapi/src/plugins/creative-works/server/src/content-types/credit-role/schema.json` -- `{name, slug, department}`, draftAndPublish + i18n
- `apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts` -- `Credit`/`VideoItem` interfaces, `WORK_POPULATE`, `usePersonSearch` (pattern to mirror), `WORK_UID`
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts` -- zod schemas + `workToFormValues` / `workToApiPayload` (the runtime break, lines 261-267)
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/CreditsEditor.tsx` -- stale role/character row
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/VideosEditor.tsx` -- writes legacy `type`
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/PersonCombobox.tsx` -- combobox pattern to mirror
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx` -- section layout; must gain a Cast section
- `apps/strapi/src/plugins/events-manager/admin/src/components/Catalog/options.ts` -- stale `CREDIT_ROLES` enum (13-34) and `VIDEO_TYPES` (98)
- `apps/client/src/app/api/contribute/play/route.ts` -- `transformToStrapiFormat` posts the same stale credit shape and an invalid video `type: "trailer"`
- `apps/client/src/features/events/utils/eventMappers.ts:390` -- proves `videoType` is the client-authoritative field

## Tasks & Acceptance

**Execution:**

- [x] `.../admin/src/hooks/useCreativeWorks.ts` -- retype `Credit` to `{person, creditRole, customRole, billing}`, add `CreditRoleRef`/`CharacterRef`/`CastMember` and `cast?: CastMember[]` on `CreativeWork`, add `videoType` to `VideoItem`, add `CREDIT_ROLE_UID`/`CHARACTER_UID`, extend `WORK_POPULATE` with `cast`, `cast.person`, `cast.character`, `credits.creditRole`, and add `useCreditRoles()` (full list, sorted by name) + `useCharacterSearch(term)` mirroring `usePersonSearch` -- the hand-rolled types are what hid the break from the build
- [x] `.../WorkForm/CreditRoleSelect.tsx` (new) -- `SingleSelect` over `useCreditRoles()` records keyed by `documentId`, error state when unset -- creditRole is a required relation, not an enum
- [x] `.../WorkForm/CharacterCombobox.tsx` (new) -- async search combobox over `plugin::creative-works.character`, mirroring `PersonCombobox` -- cast rows link a person to a character record
- [x] `.../WorkForm/schema.ts` -- rewrite `creditFormSchema` (person + `creditRole` ref, both required; `customRole`; `billing`), add `castFormSchema`, add `cast` to `workFormSchema`/`DEFAULT_WORK_VALUES`, add `videoType` to `videoFormSchema` with the legacy `type` carried as an unedited passthrough, and update `workToFormValues`/`workToApiPayload` per the I/O matrix -- the actual runtime fix
- [x] `.../WorkForm/CreditsEditor.tsx` -- rebuild the row as person + `CreditRoleSelect` + customRole + billing, dropping the character field -- character now belongs to cast
- [x] `.../WorkForm/CastEditor.tsx` (new) -- repeatable person + `CharacterCombobox` + billing editor over the `cast` field array -- `cast[]` had no UI at all
- [x] `.../WorkForm/VideosEditor.tsx` -- bind the type select to `videos.${i}.videoType` using the new vocabulary -- the client reads `videoType`
- [x] `.../WorkForm/index.tsx` -- render a Cast section before the crew/credits section and retitle credits to crew -- cast and credits are separate fields
- [x] `.../Catalog/options.ts` -- delete the stale `CREDIT_ROLES` enum and replace `VIDEO_TYPES` with `["trailer","teaser","clip","featurette","interview","behind-the-scenes","full-length"]` -- crew vocabulary now lives in the `credit-role` content type
- [x] `.../WorkForm/schema.unit.test.ts` (new) -- cover every I/O matrix row against `workToApiPayload`/`workToFormValues` and the zod schemas -- jest picks up `*.unit.test.ts`
- [x] `apps/strapi/src/components/common/video.json` -- extend `info.description` to state that `videoType` is authoritative for all consumers and `type` is retained legacy-only -- records the DW-11 decision at the schema
- [x] `apps/client/src/app/api/contribute/play/route.ts` -- map credits to `{person, creditRole, customRole, billing}` by resolving the wizard's role slug to a `credit-role` documentId, and emit `videoType` instead of the invalid legacy `type: "trailer"` -- same stale shape as the WorkForm

**Acceptance Criteria:**

- Given a work with a credit whose `creditRole` is set, when the form is submitted, then the payload contains no `role` or `character` key anywhere under `credits`.
- Given the admin WorkForm, when the Cast section is used, then `cast[]` rows persist and reload with their person and character relations resolved.
- Given `apps/strapi`, when `yarn test` runs, then the unit gate is green including the new `schema.unit.test.ts`.
- Given the repo, when `common.video` is inspected, then both `type` and `videoType` still exist with their enums unchanged and no default added.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 1, medium 6, low 3)
- defer: 6: (high 0, medium 5, low 1)
- reject: 9: (high 0, medium 2, low 7)
- addressed_findings:
  - `[high]` `[patch]` `workToFormValues` defaulted every legacy video with no `videoType` to `"trailer"`, so opening and saving a pre-split work promoted a `CLIP`/`FULL_LENGTH` row into the public trailer slot (`eventMappers.ts:390` reads `videoType === "trailer"`). Added `LEGACY_TYPE_TO_VIDEO_TYPE` to seed `videoType` from the legacy enum, plus three parametrized regression tests.
  - `[medium]` `[patch]` The contribute wizard collected the legacy `FULL_LENGTH/TEASER/CLIP` vocabulary and its "Trailer/Teaser" option mapped to `"teaser"`, so a contributed trailer could never surface. Replaced the wizard's `VIDEO_TYPES` with the `videoType` vocabulary, updated `MediaStep` labels and the new-row default, and deleted the translation map.
  - `[medium]` `[patch]` The contribute route routed `role: "cast"` credits into `credits[]`, where they would fail the required `creditRole` relation, and never built a `cast[]` array. Split cast from crew and added a shared `resolvePersonId` helper.
  - `[medium]` `[patch]` `useCreditRoles()` lived inside `CreditRoleSelect`, issuing one full-vocabulary fetch per credit row. Lifted it to `CreditsEditor` and passed the list down.
  - `[medium]` `[patch]` A failed or empty credit-role fetch rendered an enabled, empty required select with no explanation. Added an explicit danger-toned warning in `CreditsEditor` when the vocabulary resolves empty.
  - `[medium]` `[patch]` `CreditRoleSelect.onChange` fell back to `null` on an unresolvable id, silently clearing a required relation. It now ignores unresolvable selections.
  - `[medium]` `[patch]` `usePersonWorks` filtered filmographies on `credits[].person` only, so actors written through the new `CastEditor` vanished from the person page. Query now `$or`s over `credits.person` and `cast.person` and populates `cast`.
  - `[low]` `[patch]` The contribute route omitted `type` on new videos, letting the legacy enum's `default: "TEASER"` stamp itself onto brand-new rows. Now sends `type: null` explicitly.
  - `[low]` `[patch]` The `credit-role` miss branch was commented as a graceful degradation, which it cannot be (`creditRole` is required, so the whole submission fails). Comment corrected to state the real behavior.
  - `[low]` `[patch]` `video.json`'s `info.description` was a ~400-character paragraph carrying internal ledger IDs into the Strapi editor UI, and the "never exposes the legacy type" test asserted nothing about the vocabulary. Description trimmed to one editor-facing sentence; test now asserts `VIDEO_TYPES` excludes all three legacy values.

### 2026-08-03 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 0, medium 5, low 4)
- defer: 7: (high 0, medium 4, low 3)
- reject: 11: (high 0, medium 2, low 9)
- addressed_findings:
  - `[medium]` `[patch]` The rebuild dropped the pre-2C.3 rule that required `customRole` when the picked role was the generic one, so a credit could save pointing at the catch-all `credit-role` record with no label. `creditRoleRefSchema` now carries `slug`, `workToFormValues` maps it through, and `creditFormSchema` re-adds the rule keyed on `slug === "other"`; `CreditsEditor` renders the field-level error (previously the customRole cell had no error slot at all). Two tests.
  - `[medium]` `[patch]` Swapping the wizard's `VIDEO_TYPES` to the `videoType` vocabulary invalidated every unversioned localStorage draft: a restored draft carrying `TEASER`/`CLIP`/`FULL_LENGTH` fails `videoSchema`'s `z.enum` and renders a blank select, leaving the step unsubmittable. Added `migrateDraftVideoType` and applied it in `ContributeFormContext.loadDraft`.
  - `[medium]` `[patch]` `transformToStrapiFormat` — the cast/crew split, the `creditRole` slug resolution and the `{type: null, videoType}` video shape, i.e. the entire payload contract this story exists to fix — had no test, and `apps/client/vitest.config.ts` uses an `include` allowlist with no `src/app/api/**` entry, so one could not have been collected. Exported the function, added the include entry, added `route.test.ts` (6 tests, node environment).
  - `[medium]` `[patch]` `useCreditRoles()` fetched a single `pageSize: 100` page, so a vocabulary past 100 roles was silently unpickable on new credits. It now pages to `pagination.pageCount` under a hard 20-page ceiling.
  - `[medium]` `[patch]` A failed credit-role fetch and a genuinely empty vocabulary both collapsed to `[]` and produced the same "populate the vocabulary" banner — so a 403 on Credit Role read permission reads as missing data forever. `useCreditRoles()` now returns `error`, and `CreditsEditor` distinguishes the two messages.
  - `[low]` `[patch]` `CreditRoleSelect` stayed enabled with zero options once loading finished, offering an empty required picker. Now inert when there is nothing to pick.
  - `[low]` `[patch]` Neither billing input renders an error slot, so a `0` or four-digit order blocked the whole submit with nothing on screen. Added `clampBilling` (shared, tested) on both editors' `onValueChange` — out-of-range input is now impossible rather than silently fatal. (`minValue`/`maxValue` props were tried first and rejected: this Strapi DS `NumberInput` does not accept them, +2 tsc errors.)
  - `[low]` `[patch]` `WORK_POPULATE` is the only thing keeping `workToApiPayload`'s replace-on-write from nulling `cast[]` on every save, and nothing pinned it — dropping `"cast"` left all 20 tests green while silently deleting cast data. Moved it to `hooks/workPopulate.ts` (importable without `@strapi/strapi/admin`, which the jest gate cannot resolve) and asserted the six relation paths.
  - `[low]` `[patch]` `usePersonWorks` newly matches works via `cast[].person` but populated neither `cast.character` nor `credits.creditRole`, so a matched work came back with unresolved relations. Populate list completed. Two stray/duplicated JSDoc blocks above `LEGACY_TYPE_TO_VIDEO_TYPE` also reordered onto the declarations they describe.

### 2026-08-03 — Review pass (follow-up 2)

- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 0, medium 4, low 5)
- defer: 2: (high 0, medium 2, low 0)
- reject: 12: (high 0, medium 3, low 9)
- addressed_findings:
  - `[medium]` `[patch]` `customRole` was rendered and persisted on every credit row regardless of the picked role, so a credit could save as "Director" carrying customRole "Producer" — two role names on one row with nothing to say which wins. The pre-2C.3 code nulled it outside `role === "other"`; that invariant is restored on both sides: `workToApiPayload` nulls `customRole` for a named role, and `CreditsEditor` disables the input (via `useWatch` on the row's role) unless the generic role is picked. Two tests.
  - `[medium]` `[patch]` The seven-value `videoType` vocabulary is hand-maintained in three places (admin `options.ts`, the client wizard schema, `common/video.json`) with nothing comparing them; Strapi rejects anything outside the schema enum, so drift means every save carrying the drifted value fails. `schema.unit.test.ts` now imports `video.json` and asserts `VIDEO_TYPES` deep-equals `attributes.videoType.enum`, that the legacy enum is unchanged beside it, and that `videoType` has no `default`. This replaced a vacuous assertion (the old "excludes FULL_LENGTH/TEASER/CLIP" check could never fail).
  - `[medium]` `[patch]` `migrateDraftVideoType` — the sole protection for pre-DW-10 contributor drafts, added last pass — was uncollectable: `apps/client/vitest.config.ts` uses an `include` allowlist with no `src/features/contribute/**` entry, so a test placed beside it would not have run. Added the include glob and `play-contribution.test.ts` (12 tests) covering the three legacy values, passthrough, unknown-value fallback, and the round trip through `videoSchema`.
  - `[medium]` `[patch]` `useCreditRoles()` initialised `isLoading` to `false` while the list was `[]`, so `CreditsEditor` painted its red "No credit roles are available — a credit cannot be saved" banner on the first frame of every mount, before the vocabulary had even been requested. Initialised to `true`.
  - `[low]` `[patch]` The 20-page credit-role ceiling truncated silently — the exact condition the loop exists to prevent (an unpickable role blocks a required relation) reintroduced past page 20 with no signal. The hook now sets `error` when the ceiling is hit with pages remaining.
  - `[low]` `[patch]` `GENERIC_CREDIT_ROLE_SLUG = "other"` keyed the customRole rule on a single slug, but Strapi derives the slug from the localized `name` and this project's `defaultLocale` is `fr` — a catch-all created as "Autre" gets slug `autre` and the rule silently never fires. Replaced with an exported `isGenericCreditRole` over a `{other, autre}` set, used by both the schema and the editor. One test.
  - `[low]` `[patch]` `clampBilling(value ?? 99)` snapped a cleared billing input to 99 mid-edit, making it impossible to retype the field. `clampBilling` now takes `number | undefined` and returns `undefined` for an empty/NaN input; both editors keep the previous value in that case. Two tests.
  - `[low]` `[patch]` `loadDraft` called `savedData.videos.map` behind a truthiness check, so a corrupt non-array `videos` threw, was caught by the outer handler, and discarded the contributor's entire draft over one bad field. Switched to `Array.isArray`.
  - `[low]` `[patch]` The `console.log` → `console.warn` swap made last pass reclassified a _success_ message ("Successfully created draft play"), an informational note (external poster URL) and a debug dump inside an unimplemented TODO handler as warnings, so anything watching warn-level output saw a warning on every successful submission. All three removed.

Notable non-finding: the reviewers flagged `resolveCreditRoleId` as memoizing failed lookups, so one transient 502 would poison the cache for the rest of the request. Traced and rejected — credits are mapped under a single `Promise.all`, so every credit sharing a slug already awaits the same in-flight request; evicting on failure would re-issue a request nobody is waiting on and give no one a retry. The eviction was written, shown to be inert by a test that could not pass, and reverted; the reasoning is now recorded in the function's doc comment and pinned by a test asserting that all credits sharing an unresolvable slug degrade identically.

## Design Notes

DW-11 is already `status: done` in the ledger, closed by the 2026-07-13 human decision "Keep both (document the split)". That decision supersedes the bundle intent's "drop the legacy type enum and migrate existing data" — this spec therefore documents the split and points writers at `videoType`, and performs no enum removal and no data migration.

Legacy `type` passthrough in the form values, so an existing value survives an edit without the editor exposing it:

```ts
videos: (work.videos ?? []).map((video) => ({
  url: video.url ?? "",
  legacyType: video.type ?? null, // read-only passthrough, never edited
  videoType: video.videoType ?? "trailer",
}))
```

In the contribute route, resolve the wizard's role slug with a `GET ${STRAPI_URL}/api/credit-roles?filters[slug][$eq]=<slug>` lookup, cached per request, exactly matching the bearer-token fetch style already used by `createPersonInStrapi`. When no matching record is found, fall back to sending the slug as `customRole` with `creditRole` omitted rather than inventing a record.

Known adjacent breakage, deliberately NOT fixed here: `POST /api/creative-works` and `/api/persons` (used by the contribute route) are not registered — `creative-works/server/src/routes/content-api.ts` declares only four custom GET routes. The contribute payload is corrected in shape, but that write path stays non-functional until public write routes and permissions exist. Flag this in the completion notes rather than building routes.

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: unit gate green, including the new `schema.unit.test.ts`
- `cd apps/strapi && rm -rf dist .strapi && yarn generate:types` -- expected: Strapi boots with 0 errors (proves the component/relation shapes resolve)
- `yarn lint` -- expected: no new errors or warnings on touched files
- `cd apps/client && yarn test` -- expected: green (contribute route change introduces no regression)

**Manual checks (if no CLI):**

- `git diff apps/strapi/src/components/common/video.json` shows only an `info.description` change — both enums and the absent default are untouched.

## Auto Run Result

Status: done

**Summary.** Third pass over the DW-10 WorkForm rebuild: a review-only follow-up that made no
behavioural change to the credit/cast/video contract itself. Nine patches landed, all of them
either restoring an invariant the rebuild had dropped (`customRole` belongs to the generic role
only), removing a way for correct code to be _misread_ as broken (the loading-state banner flash,
warn-level success logs), or closing a hole through which the story's own protections could be
deleted with a green pipeline (the vocabulary parity assertion, the uncollectable draft migration).

**Files changed in this pass:**

- `apps/strapi/.../WorkForm/schema.ts` — `isGenericCreditRole` over `{other, autre}` replacing the single-slug constant; `customRole` nulled in the payload for named roles; `clampBilling` now empty-input-safe
- `apps/strapi/.../WorkForm/CreditsEditor.tsx` — `useWatch` on the row's role gates the customRole input and its hint; billing clamp keeps the current value on an empty input
- `apps/strapi/.../WorkForm/CastEditor.tsx` — same billing clamp fix
- `apps/strapi/.../hooks/useCreativeWorks.ts` — `useCreditRoles` starts in the loading state; surfaces the page-ceiling truncation via `error`
- `apps/strapi/.../WorkForm/schema.unit.test.ts` — vocabulary parity against `common/video.json`, generic-role/customRole cases, `clampBilling` suite (34 tests, was 20)
- `apps/client/src/app/api/contribute/play/route.ts` — removed two warn-level non-warnings; documented why credit-role misses are cached
- `apps/client/src/app/api/contribute/play/route.test.ts` — same-slug request dedupe and identical-degradation cases (8 tests, was 6)
- `apps/client/src/features/contribute/context/ContributeFormContext.tsx` — `Array.isArray` guard so a corrupt `videos` cannot discard the whole draft
- `apps/client/src/features/contribute/components/steps/MediaStep.tsx` — dropped the debug dump in the unimplemented upload handler
- `apps/client/src/features/contribute/schemas/play-contribution.test.ts` (new) — 12 tests pinning the vocabulary and `migrateDraftVideoType`
- `apps/client/vitest.config.ts` — include glob so the above is actually collected
- `_bmad-output/implementation-artifacts/deferred-work.md` — DW-144, DW-145 appended

**Review findings:** 9 patches applied, 2 deferred (DW-144 `.tsx` outside the strapi tsconfig;
DW-145 no component/hook test harness for the admin plugin), 12 rejected. Four further findings
were real but already recorded by the previous pass as DW-137/140/141/143 (credit-role seed,
discarded character text, character create-path, person dedupe) and were not re-appended.

**Verification:**

- `apps/strapi` — `npx jest --config jest.config.cjs`: 38 suites, 428 tests, all pass (WorkForm suite 20 → 34)
- `apps/client` — `npx vitest run`: 63 files, 616 tests, all pass (route suite 6 → 8, new schema suite 12)
- `apps/strapi` — `npx tsc --noEmit -p tsconfig.json`: 3 errors, all pre-existing in `plugins/user-engagement/server/src/services/watchlist.ts`, none in touched files
- `apps/client` — `npx eslint src/app/api/contribute src/features/contribute`: 0 errors; 24 warnings, none on a touched file
- The two edited `.tsx` components were typechecked out-of-band (the strapi tsconfig excludes `.tsx` — that gap is now DW-144) and are clean apart from the duplicate-React-types noise that fires uniformly on every pre-existing component

**Residual risks:**

- The contribute write path remains non-functional (DW-138/DW-139: no `POST /api/creative-works`, no `POST /api/persons`, no `GET /api/credit-roles` route). Every client-side change in this story is shape-correct and unreachable until those land.
- No `credit-role` record is seeded anywhere (DW-137). On a fresh environment the admin credits editor is correctly inert with an explanatory banner, but no work carrying a crew credit can be saved until the vocabulary is populated by hand.
- The new and rewritten admin components are still unverified by any automated gate (DW-144, DW-145). This pass narrowed what that blind spot can hide — the generic-role gating and the billing clamp are now pinned at the pure-function layer — but the rendering behaviour itself is inspected, not tested.
