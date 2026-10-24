---
phase: 01-short-film-catalog-backend
verified: 2026-10-25T02:10:00Z
status: human_needed
score: 3/4 must-haves verified
covered_files:
  - ".planning/phases/01-short-film-catalog-backend/01-01-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-01-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-02-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-02-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-03-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-03-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-04-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-04-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-05-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-05-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-06-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-06-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-07-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-07-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-08-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-08-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-09-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-09-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-10-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-10-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-11-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-11-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-12-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-12-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-13-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-13-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-14-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-14-SUMMARY.md"
  - "apps/strapi/scripts/seeds/data/short-films.json"
  - "apps/strapi/scripts/seeds/shorts/import-short-films.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json"
  - "apps/strapi/src/plugins/creative-works/server/src/document-middlewares/short-film-publish-guard.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts"
covered_digest: "v3:sha256:040ef42af261f20741b085d4f46fbf1d63a293f2f3d735dbe4f2b326192d2a31"
behavior_unverified: 1
overrides_applied: 1
overrides:
  - must_have: "The launch catalog exists as published Strapi records with posters, genres, directors/crew, cast, distinctions and streaming links"
    reason: "Owner decisions D-12 and D-20 (01-CONTEXT.md, 2026-10-18): no real 2:3 poster was found for any film; posterless films are published through the logged importer bypass, the 16:9 backdrop is populated, and the client placeholder covers the poster slot in Phase 2/4. The poster clause of SC4 / SDATA-04 is therefore deliberately unmet for all 13 films."
    accepted_by: "owner decision D-12/D-20 recorded in 01-CONTEXT.md (verifier asks the owner to confirm this reading)"
    accepted_at: "2026-10-18T00:00:00Z"
behavior_unverified_items:
  - truth: "SC1: An admin can create a short film in the Strapi admin in FR, AR and EN, publish it, then edit and unpublish it, without touching raw JSON"
    test: "In a running `strapi develop` admin, open Events Manager > Works, create a short film (type Short film), fill the FR tab, pick a poster/backdrop/photos through the media library, add credits with roles, cast, distinctions, a trailer video, a streaming link with access type and the featured flag, save, publish from the publish bar, then switch to the AR and EN tabs, save translated title/synopsis/poster and publish each, edit a field, and unpublish each language."
    expected: "Every step works in the browser: media-library dialog returns real uploads served from ImageKit, the publish bar lists missing D-19 items and enables Publish when they are fixed, FR/AR/EN publish and unpublish independently, and the film appears/disappears in the public list accordingly."
    why_human: "The admin UAT was never run in a real browser (01-09-SUMMARY says so explicitly). The server half is proven by boot suites and the form half by jsdom tests with mocked media library and fetch, but the real Strapi admin shell, the registered `media-library` dialog and ImageKit uploads from the form have not been exercised together."
human_verification:
  - test: "Admin UAT walkthrough in a real browser (SC1)"
    expected: "See behavior_unverified_items above. Also confirm Works is reachable from the Events Manager side nav and the Save button works after toggling work type (review WR-03)."
    why_human: "No E2E suite by project rule; real-browser run never executed."
  - test: "Owner confirms posterless launch catalog satisfies SC4 / SDATA-04"
    expected: "Owner accepts that all 13 launch films are published without a 2:3 poster (backdrop only) per D-12/D-20, or supplies posters and re-runs `seed:shorts`."
    why_human: "The ROADMAP wording says 'with posters'; the deviation is an owner decision recorded in CONTEXT but not in a verification override until now."
  - test: "Owner Arabic review of the AI-drafted AR titles/synopses (24 fields listed in 01-CURATION-SHEET.md)"
    expected: "Owner marks them reviewed or corrects them in the AR tab."
    why_human: "Language quality judgment. Non-blocking for Phase 2 per D-13."
  - test: "Run featured and related reads against Postgres (staging or dev server)"
    expected: "`GET .../short-films/featured` and `.../:slug/related` return the same ordering as on SQLite."
    why_human: "Boot suites run on SQLite only (01-04-SUMMARY human_judgment). The nested credits filter in `related` was confirmed on SQLite only; no Strapi dev server was running to check against the dev Postgres."
---

# Phase 1: Short-Film Catalog Backend Verification Report

**Phase Goal:** An operator can enter, publish and manage short films in the Strapi admin, and anyone can read them through a public API that carries every field the directory needs, with the launch catalog loaded.
**Verified:** 2026-10-25
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| #   | Truth                                                                                                                                                                                                                   | Status                         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Admin can create a short film in FR/AR/EN (all fields, media via ImageKit), publish, edit, unpublish, no raw JSON                                                                                                       | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Present and wired: `schema.json` carries country, language, streamingLinks, featured, featuredRank (all non-localized, additive, `collectionName: creative_works` preserved); Works routes in `pages/App.tsx` (`works`, `works/new`, `works/:documentId`, `works/:documentId/edit`) and SideNav entry; `WorkForm/index.tsx` renders streaming-links editor, country/language pickers, featured/rank for `isShort`, poster/backdrop/photos via `MediaInput` backed by the registered `media-library` dialog; `PublishBar`, `LocaleTabs`, `LocalizedFieldsForm`; `useCreativeWorks` publish/unpublish hit `/content-manager/.../actions/(un)publish` with flat body (fixes the `{data}` drop). Server publish guard registered in `register.ts` via `strapi.documents.use`. Tests: guard boot suite, locale-save boot suite and 6 admin jsdom suites (84 tests) pass. No real-browser run exists (01-09-SUMMARY states it). Routed to human verification. |
| 2   | Unauthenticated request returns only published short films, flat v5 shape, genre filter, sort, pagination, detail by slug, featured, related; unsupported param gives coded error not 500; no ticketing/internal fields | ✓ VERIFIED                     | `routes/content-api.ts` declares list, `featured` (above `:slug`), `:slug/related`, `:slug`, all `auth: false` with the rate-limit middleware. `controllers/short-film.ts` validates strictly, maps `VALIDATION_FAILED`/`UNSUPPORTED_LOCALE` to 400 and `SHORT_FILM_NOT_FOUND` to 404, anything unmapped to a logged `INTERNAL_ERROR` that does not leak. `services/short-films.ts` always passes `status: "published"` plus `type = short-film`, projects through an explicit allowlist. Legacy draft-leaking routes return 404 (boot test `legacy creative-work routes removed`). I re-ran `short-films.service` and `short-film-publish-guard/locale-save/schema` boot suites on SQLite: pass.                                                                                                                                                                                                                                                       |
| 3   | Boot-integration tests against a real booted Strapi prove only the right rows come back for genre filter, each sort, pagination, featured, related, locale fallback                                                     | ✓ VERIFIED                     | `short-films.service.test.ts` (77 tests passed in my run) seeds published shorts, a draft and a non-short work and covers: genre filter (and unknown genre), `it.each` sort cases plus releaseYear tie-break, page walk with no duplicate/gap and past-end page, featured order (rank, newest, unranked last), related (director then genre, no source/draft/non-short), locale fallback (ar served, fr elsewhere, draft ar falls back, page boundaries unchanged), 400/404 cases, internal-key leak scans.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 4   | Launch catalog exists as published records with posters, genres, crew, cast, distinctions, streaming links; running the import twice creates no duplicates                                                              | ✓ PASSED (override)            | DB check on dev Postgres `tiween-db-1`: 13 distinct short-film slugs, each with a published default-locale row, plus published `ar` and `en` rows; 12 backdrops in `files_related_mph`, all stored on `ik.imagekit.io` per 01-13; credits present on every film, cast on 11, distinctions on 7, streaming links on 9 (4 films carry a trailer or no link per data file); genres in data file for all. No poster on any film: override above (D-12/D-20). Idempotency: `import-short-films.service.test.ts` passes 25/25 (ImageKit vars blanked) including "keeps each published row and its publishedAt" and "does not touch the film that did not change"; 01-13 records two dev runs (created 5/updated 7/unchanged 1, then 0/0/13, identical `publishedAt`).                                                                                                                                                                                         |

**Score:** 3/4 truths verified (1 present, behavior-unverified; SC4 counted via override)

### Required Artifacts

| Artifact                                                                                                     | Expected                               | Status              | Details                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `creative-work/schema.json`                                                                                  | additive new fields                    | ✓ VERIFIED          | country/language json, `streamingLinks` repeatable component, `featured`, `featuredRank` (min 1); old attributes intact |
| `routes/content-api.ts`, `controllers/short-film.ts`, `services/short-films.ts`, `validation/short-films.ts` | public read API                        | ✓ VERIFIED          | Wired through plugin `routes/index.ts`; boot-proven                                                                     |
| `document-middlewares/short-film-publish-guard.ts`                                                           | D-19 server guard                      | ✓ VERIFIED          | Registered in `register.ts`; boot suite passes                                                                          |
| `src/shared/short-film-rules.ts`                                                                             | shared evaluator                       | ✓ VERIFIED          | Imported by guard, service and admin `publishRules.ts`                                                                  |
| `events-manager/admin/.../WorkForm/*`, `MediaInput`, `Works/WorkFormPage.tsx`                                | admin entry                            | ✓ VERIFIED (static) | Routed and wired; browser behavior is in human items                                                                    |
| `scripts/seeds/shorts/import-short-films.ts`, `data/short-films.json`                                        | idempotent importer, 13 approved films | ✓ VERIFIED          | 13 films, all `approved: true`; boot suite 25/25                                                                        |
| `apps/strapi/docs/short-films-api.md`, `short-films-admin.md`                                                | contract and operator guide            | ✓ VERIFIED          | Exist; `short-films-api-doc.unit.test.ts` passes                                                                        |

### Key Link Verification

| From                              | To                                                  | Via                                                      | Status                    |
| --------------------------------- | --------------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| `routes/index.ts`                 | `content-api.ts` routes                             | plugin route aggregation                                 | WIRED                     |
| route `short-film.*`              | controller `short-film` -> service `short-films`    | `strapi.plugin("creative-works").service("short-films")` | WIRED                     |
| `register.ts`                     | publish guard                                       | `strapi.documents.use`                                   | WIRED                     |
| `pages/App.tsx`                   | `WorkFormPage` / `WorksListPage`                    | react-router routes                                      | WIRED                     |
| `WorkForm`                        | content-manager publish/unpublish and create/update | `useCreativeWorks`                                       | WIRED                     |
| `WorkForm` poster/backdrop/photos | media-library dialog                                | `useStrapiApp` in `MediaInput`                           | WIRED (jsdom-tested only) |
| importer                          | upload provider / Document Service                  | `findOrUploadImage`, `strapi.documents`                  | WIRED (dev run)           |

### Data-Flow Trace (Level 4)

| Artifact           | Data        | Source                                                         | Real data                                                         | Status  |
| ------------------ | ----------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| public list/detail | items, meta | `strapi.documents(creative-work).findMany` with populate       | yes (boot suites with fixtures; 13 imported rows on dev Postgres) | FLOWING |
| WorkForm           | work values | content-manager reads via `useCreativeWorks` + `WORK_POPULATE` | yes                                                               | FLOWING |

### Behavioral Spot-Checks

| Behavior                    | Command                                                                                                                                  | Result                                                                                                                                              | Status               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Public API boot suite       | `npx jest --selectProjects server --testMatch='**/*.service.test.ts' --runInBand short-films.service` (apps/strapi)                      | short-films.service 77 passed; the 25 failures in the same pattern are the import suite refusing live ImageKit keys, as the orchestrator documented | PASS                 |
| Importer idempotency        | same with `IMAGEKIT_PUBLIC_KEY= IMAGEKIT_PRIVATE_KEY= IMAGEKIT_URL_ENDPOINT=`, `import-short-films.service`                              | 25/25 pass                                                                                                                                          | PASS                 |
| Non-boot server unit suites | `jest --selectProjects server --testPathIgnorePatterns '\.service\.test'`                                                                | 91 suites, 1585 tests pass                                                                                                                          | PASS                 |
| Admin WorkForm suites       | `jest --selectProjects admin --maxWorkers=2 WorkFormShortFields WorkFormPublish WorkFormLocales MediaInput WorksRouting CodeMultiPicker` | 6 suites, 84 tests pass                                                                                                                             | PASS                 |
| Dev DB catalog              | psql on `tiween-db-1`                                                                                                                    | 13 short-film slugs, published fr rows, ar/en rows, 72 backdrop relations, 0 poster relations                                                       | PASS (with override) |
| Live API against dev server | curl localhost:1337                                                                                                                      | no server running                                                                                                                                   | SKIP                 |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

All six IDs in the phase header appear in plan `requirements:` frontmatter and are marked Complete in REQUIREMENTS.md. None is orphaned (REQUIREMENTS.md maps exactly SDATA-01..05 and FR57 to Phase 1).

| Requirement | Source plans                      | Status                                                    | Evidence                                                                                 |
| ----------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| SDATA-01    | 01-02, 01-06, 01-08               | ✓ SATISFIED                                               | Schema delta, shared rules, `short-film-schema.service` boot test                        |
| SDATA-02    | 01-06, 01-07, 01-08, 01-09, 01-14 | ? NEEDS HUMAN                                             | Code, guard and jsdom/boot tests pass; real-browser admin UAT not run                    |
| SDATA-03    | 01-03, 01-04, 01-05               | ✓ SATISFIED                                               | Public routes and boot suite; facets deliberately left to Meilisearch (D-10)             |
| SDATA-04    | 01-10, 01-11, 01-12, 01-13        | ✓ SATISFIED (poster clause by override)                   | 13 published records on dev; idempotency proven; production run is Phase 6               |
| SDATA-05    | 01-01, 01-03, 01-04               | ✓ SATISFIED                                               | Boot suite covers every named case, including a non-short work                           |
| FR57        | 01-07, 01-10, 01-13               | ✓ SATISFIED for ImageKit serving; UI picker in human item | Dev `files` rows on `ik.imagekit.io`; `MediaInput` uses real upload ids, no invented ids |

Note: 01-11 and 01-12 SUMMARYs list `requirements-completed: []` by design (SDATA-04 completes in 01-13); not a gap.

### Anti-Patterns Found

| File                                                              | Pattern                                          | Severity           | Impact                                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (phase source files)                                              | TBD/FIXME/XXX                                    | none found         | No unreferenced debt markers in phase source                                                                                                           |
| `scripts/seeds/utils/short-film-import.ts:376-377` (review WR-01) | importer always writes `featured`/`featuredRank` | ⚠️ Warning         | Re-import reverts editor-set featured flags and re-stamps `publishedAt`. Does not break the "no duplicates" criterion but threatens curated hero data. |
| `WorkFormPage.tsx` / `short-films.ts:462` (WR-02)                 | stale per-locale poster preferred by overlay     | ⚠️ Warning, latent | No poster exists today, so no live impact; will bite once posters are added                                                                            |
| `WorkForm/index.tsx` (WR-03)                                      | save silently blocked by hidden invalid field    | ⚠️ Warning         | Operator-facing trap; belongs in the browser UAT                                                                                                       |
| `WorkFormPage.tsx` (WR-04)                                        | blank slug regenerated on second save            | ⚠️ Warning         | Can change a public URL                                                                                                                                |
| IN-01..IN-05                                                      | info items from 01-REVIEW.md                     | ℹ️ Info            | Open and advisory; not part of any success criterion                                                                                                   |

The 4 warnings and 5 infos are all `open` in 01-REVIEW-DISPOSITION.md. None is a blocker for the stated phase goal, but WR-01 and WR-03 should be triaged before the Phase 6 production import and before the owner starts curating in the admin.

### Human Verification Required

1. **Admin UAT walkthrough in a real browser** (SC1/SDATA-02/FR57): see frontmatter. Also exercise the WR-03 reproduction (add an empty streaming link, switch type to Film, try Save).
2. **Owner confirms posterless catalog** satisfies SC4 (override above), or supplies posters.
3. **Owner Arabic review** of 24 AI-drafted fields.
4. **Postgres check of featured and related** (SQLite only so far).

### Gaps Summary

No blocking gaps. The public API, tests, schema, guard, admin wiring and dev catalog import are real and verified against the code and the databases, not just the SUMMARYs. The phase cannot be marked fully passed because SC1 (operator enters, publishes and manages a film in the admin) was never exercised in a real browser, and the posterless launch catalog departs from the literal ROADMAP wording through an owner decision that this report records as an override for owner confirmation. The 01-09 deferred items (flat-body fix for people and sub-event writes, locale-tab unsaved edits, `.build` distDir in `seed`/`seed:clear`, genre translations, admin jsdom timeouts) are recorded in `deferred-items.md`; none belongs to a Phase 1 success criterion, though the `{ data }` body issue in `usePeople` and `SubEventModal` is a real pre-existing write defect outside this phase's goal.

---

_Verified: 2026-10-25_
_Verifier: Claude (gsd-verifier)_
