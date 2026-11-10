---
phase: 01-short-film-catalog-backend
verified: 2026-11-10T05:00:00Z
status: passed
score: 8/8 must-haves verified
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
  - ".planning/phases/01-short-film-catalog-backend/01-15-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-15-SUMMARY.md"
  - ".planning/phases/01-short-film-catalog-backend/01-16-PLAN.md"
  - ".planning/phases/01-short-film-catalog-backend/01-16-SUMMARY.md"
  - "apps/strapi/e2e/specs/admin-short-film-walkthrough.spec.ts"
  - "apps/strapi/scripts/seeds/data/short-films.json"
  - "apps/strapi/scripts/seeds/shorts/import-short-films.ts"
  - "apps/strapi/scripts/seeds/utils/short-film-import.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json"
  - "apps/strapi/src/plugins/creative-works/server/src/document-middlewares/short-film-publish-guard.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/routes/admin.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts"
  - "apps/strapi/src/plugins/creative-works/server/src/services/work-editor.ts"
  - "apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocalizedFieldsForm.tsx"
  - "apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx"
  - "apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts"
  - "apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx"
covered_digest: "v4:sha256:e192f6d2ca8871eab9448864e162b2b5516a5bcde97c72efbb2c5a7dc90160f8"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "The launch catalog exists as published Strapi records with posters, genres, directors/crew, cast, distinctions and streaming links"
    reason: "Owner decisions D-12 and D-20 (01-CONTEXT.md): no real 2:3 poster was found for any film; posterless films are published through the logged importer bypass, the 16:9 backdrop is populated, and the client placeholder covers the poster slot. The poster clause of SC4 / SDATA-04 is deliberately unmet for all 13 films. The owner confirmed this reading in UAT test 2."
    accepted_by: "owner (01-UAT.md test 2, result pass)"
    accepted_at: "2026-11-08T00:00:00Z"
re_verification:
  previous_status: human_needed
  previous_score: "3/4"
  gaps_closed:
    - "G-01-1: Works edit page crashed after create with '(e.genres ?? []).map is not a function' (01-15)"
    - "G-01-2: Save silently blocked by a hidden invalid streaming-link row, review WR-03 (01-16)"
    - "Arabic tab had no dir=rtl (01-16)"
    - "Review WR-01, WR-02, WR-04, WR-05 (commits 91fc06c, 139780f, 4ba4792, e57fe88)"
    - "Real-browser admin walkthrough (previously never run): now an automated Playwright run, re-executed by this verifier on HEAD"
    - "Featured and related reads on Postgres (previously SQLite only): Playwright spec on the isolated Postgres stack"
  gaps_remaining: []
  regressions: []
advisory:
  - finding: "Rate limiting keys on ctx.ip and server.proxy is unset (review IN-01, accepted risk T-01-15)"
    category: security
    reason: "Behind the Dokploy proxy every caller shares one bucket per route. Affects production only; resolve when the Phase 6 deploy topology is confirmed."
    evidence_status: "none provided"
  - finding: "Eight further Info items (IN-02..IN-09 in 01-REVIEW.md) are open and advisory"
    category: other
    reason: "Code review status is clean (0 critical, 0 warning). None bears on a success criterion."
    evidence_status: "none provided"
---

# Phase 1: Short-Film Catalog Backend Verification Report

**Phase Goal:** An operator can enter, publish and manage short films in the Strapi admin, and anyone can read them through a public API that carries every field the directory needs, with the launch catalog loaded.
**Verified:** 2026-11-10
**Status:** passed
**Re-verification:** Yes, after gap closure (01-15, 01-16) and the code-review fix loop. The prior verdict (2026-10-25) was `human_needed`; the later UAT (2026-11-08) recorded two gaps (G-01-1 blocker, G-01-2 major), both now closed.

## How the verdict was reached

I did not rely on SUMMARY claims. Evidence I produced on current HEAD (85d4859), in this session:

- `yarn build:test-dist`, then boot suites with `IMAGEKIT_PUBLIC_KEY= IMAGEKIT_PRIVATE_KEY= IMAGEKIT_URL_ENDPOINT=`, `--runInBand`: `work-editor`, `short-film-publish-guard`, `short-film-locale-save`, `import-short-films` = 4 suites, 75 tests passed; `short-films.service` + `short-film-schema` = 3 suites, 108 tests passed. No real upload was triggered.
- Admin jsdom (`WorkForm*`, `MediaInput`, `WorksRouting`): 5 suites, 76 tests passed.
- **Playwright E2E re-run by me** (not relied on from the executor): `yarn e2e:up` (fresh isolated Postgres on 5439, Strapi on 1338, `seed:shorts --allow-local-uploads --verify` as part of boot), `yarn test:e2e`, `yarn e2e:down`: **12 passed (46.6s)**, ports freed afterwards. This matters because the four review-fix commits (WR-01/02/04/05) landed after the executor's E2E run and touch admin code on the walkthrough path (slug, translation poster, payload).
- The orchestrator's independent results (admin/seed jest 482 passed, boot `*.service.test.ts` 215 passed / 4 skipped, type-check clean) are accepted as given; mine are consistent with them.

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                                                  | Status              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC1 | An admin can create a short film in FR/AR/EN with all fields (media via ImageKit), publish, edit, unpublish, without raw JSON                                                                          | ✓ VERIFIED          | Real browser, real admin: Playwright `admin-short-film-walkthrough` test 1 (27.4 s) drives side nav, create with FR fields, media-library picker upload, director credit, streaming link, Save, redirect to `works/:documentId` (previously the crash), AR/EN translation, publish, reload, edit, republish, unpublish. Schema carries country, language, streamingLinks, featured, featuredRank; `collectionName: creative_works` preserved. Server D-19 guard boot suite passes. The ImageKit leg of the picker is covered by jsdom (`MediaInput`) and the dev import (FR57); the E2E stack uses local uploads by design (no real ImageKit upload). |
| SC2 | Unauthenticated reads: only published short films, flat v5 shape, genre filter, sort, pagination, detail by slug, featured, related; unsupported param gives coded error, no ticketing/internal fields | ✓ VERIFIED          | `routes/content-api.ts` declares list, `featured` (above `:slug`), `:slug/related`, `:slug`, all `auth: false` with rate-limit middleware. `short-films.service.test.ts` + schema suites pass (108). `content-api.unit.test.ts` pins that no route reaches the removed legacy controller (D-09). E2E specs hit featured/related over HTTP on Postgres, including `400 VALIDATION_FAILED` for unknown and paging keys and 404 for draft/unknown slugs.                                                                                                                                                                                                 |
| SC3 | Boot-integration tests on a real booted Strapi prove only the right rows come back for genre filter, each sort, pagination, featured, related, locale fallback                                         | ✓ VERIFIED          | `short-films.service.test.ts` seeds published shorts, a draft and a non-short work and asserts those cases against the real query engine (re-run: passes). Postgres parity for featured/related is now also asserted by the 9 E2E tests (closes the earlier SQLite-only caveat, UAT test 4).                                                                                                                                                                                                                                                                                                                                                          |
| SC4 | Launch catalog exists as published records with posters, genres, crew, cast, distinctions, streaming links; running the import twice creates no duplicates                                             | ✓ PASSED (override) | See "How 'launch catalog loaded' was judged". 13 owner-approved films in the data file; importer boot suite (25 tests incl. no-op second run, publishedAt preserved, featured placement preserved) passes; a fresh import of all 13 ran inside `e2e:up` on an empty Postgres. Poster clause by owner override (D-12/D-20, accepted 2026-11-08).                                                                                                                                                                                                                                                                                                       |
| G1  | G-01-1 closed: edit page opens a saved film via `GET /creative-works/admin/works/:documentId` with relations resolved; fails closed on partial load                                                    | ✓ VERIFIED          | `routes/admin.ts` route with `admin::hasPermissions` on `plugin::content-manager.explorer.read`; `services/work-editor.ts`, `controllers/work-editor.ts` exist and are registered; `useWork` reads `WORK_EDITOR_URL = "/creative-works/admin/works"`; `WorkFormPage` gates on `findUnresolvedRelations`. `work-editor.service.test.ts` passes (route contract, status/availableLocales parity, 401/403/404/400, round-trip). E2E test 1 passes through the former crash point.                                                                                                                                                                        |
| G2  | G-01-2 closed: hidden streaming-link/featured/theatre fields neither block nor clobber a save; visible error on an invalid link; stored values survive a type switch                                   | ✓ VERIFIED          | `schema.ts`: `SHORT_FILM_ONLY_KEYS`, loose draft schemas + `superRefine` validating streaming links/featured rank only for `short-film` and `theatreDetails` only for `play`. `workToApiPayload` spreads short-film-only keys only for short films. `StreamingLinksEditor` renders translated `Field.Error`; `index.tsx` `onInvalid` raises the "Some fields need attention" notification; strings in `en.json` and `fr.json`. E2E tests 2 and 3 (WR-03 regression, blank-row field error) pass with no `test.fail`. Boot case "a save that omits short-film-only keys keeps them" passes.                                                            |
| G3  | Non-play saves OMIT `theatreDetails` (owner decision 2026-11-10, WR-05); stored theatre details survive a type switch                                                                                  | ✓ VERIFIED          | `workToApiPayload` includes `theatreDetails` only inside `...(isPlay ? {...} : {})` (schema.ts:673-690). This truth is behaviour-dependent (a state-preservation invariant), so presence was not enough: the boot case "a save that omits theatreDetails keeps the stored component" (saves a play as a film through the content-manager and reads the theatre record back unchanged) is in `work-editor.service.test.ts`, which passes in my run. Unit and jsdom cases assert the key is absent.                                                                                                                                                     |
| G4  | Arabic tab content inputs are right-to-left; admin chrome is en/fr only                                                                                                                                | ✓ VERIFIED          | `LocalizedFieldsForm` exports `textDirection(locale)` and sets `dir`/`lang` on title and synopsis; default-tab original title uses `dir="auto"`. E2E asserts `dir="rtl"`, `lang="ar"` and computed CSS direction rtl on AR, ltr on EN (passes). Per owner decision, no admin `ar.json` exists in any plugin (`translations/` holds en.json and fr.json only; `app.tsx` `locales: ["en","fr"]`); no admin-Arabic gap raised.                                                                                                                                                                                                                           |

**Score:** 8/8 truths verified (one via owner override); 0 present-but-behavior-unverified.

### How "launch catalog loaded" was judged

The roadmap goal says "with the launch catalog loaded", and Phase 6 owns the production import. I judged against that documented split:

- **In scope for Phase 1 (verified):** the catalog data is real and owner-approved (`short-films.json`: 13 films, all `approved: true`, each with genres and a director; cast on 11, distinctions on 9, streaming links or a trailer on every film, AR/EN translation provenance recorded), and the importer is idempotent and publishes through the same Document Service path. The dev Postgres + ImageKit import is recorded in 01-13 (run 1: created 5, updated 7, unchanged 1; run 2: 0/0/13 with identical `publishedAt`; 12 ImageKit backdrops).
- **What I re-observed myself:** a fresh import of all 13 films into an empty Postgres during `e2e:up` (the script aborts if `seed:shorts --verify` fails), and the 25-test importer boot suite. The dev database container (`tiween-db-1`) was not running during this session, so I could **not** re-query dev Postgres; the dev-DB counts rest on 01-13's recorded output and the 2026-10-25 verifier's direct psql check (13 slugs, published fr rows plus ar/en rows, 12 backdrops on `ik.imagekit.io`).
- **Out of scope (Phase 6):** running the import against production. Not counted as a gap.
- **Poster clause:** deliberately unmet for all 13 films (override above, owner-confirmed in UAT test 2).

### Required Artifacts

| Artifact                                                                                                           | Expected                           | Status     | Details                                                   |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------- | --------------------------------------------------------- |
| `creative-work/schema.json`                                                                                        | additive new fields                | ✓ VERIFIED | country, language, streamingLinks, featured, featuredRank |
| `routes/content-api.ts`, `controllers/short-film.ts`, `services/short-films.ts`, `validation/short-films.ts`       | public read API                    | ✓ VERIFIED | Boot-proven and HTTP-proven on Postgres                   |
| `document-middlewares/short-film-publish-guard.ts`                                                                 | D-19 server guard                  | ✓ VERIFIED | Boot suite passes                                         |
| `routes/admin.ts`, `controllers/work-editor.ts`, `services/work-editor.ts`                                         | edit-page read route (01-15)       | ✓ VERIFIED | Registered; boot suite passes; consumed by `useWork`      |
| `WorkForm/schema.ts`, `StreamingLinksEditor.tsx`, `index.tsx`, `LocalizedFieldsForm.tsx`, `Works/WorkFormPage.tsx` | admin authoring (01-08/09/15/16)   | ✓ VERIFIED | Wired; jsdom and E2E pass                                 |
| `scripts/seeds/shorts/import-short-films.ts`, `utils/short-film-import.ts`, `data/short-films.json`                | idempotent importer, 13 films      | ✓ VERIFIED | Boot suite 25 tests; fresh import ran in `e2e:up`         |
| `e2e/specs/admin-short-film-walkthrough.spec.ts`, `short-films-featured-related.spec.ts`                           | real-browser and Postgres coverage | ✓ VERIFIED | 12 passed on HEAD                                         |

### Key Link Verification

| From                 | To                                               | Via                                                | Status |
| -------------------- | ------------------------------------------------ | -------------------------------------------------- | ------ |
| `useWork`            | `routes/admin.ts` -> `work-editor.findOne`       | `WORK_EDITOR_URL` -> controller -> service         | WIRED  |
| `WorkFormPage`       | `WorkForm/schema.ts`                             | `findUnresolvedRelations` gate, `workToFormValues` | WIRED  |
| `WorkForm/index.tsx` | `schema.ts` / `StreamingLinksEditor`             | `zodResolver(workFormSchema)`, `onInvalid` notice  | WIRED  |
| `WorkFormPage`       | `LocalizedFieldsForm`                            | `locale={activeLocale}` drives `dir`/`lang`        | WIRED  |
| public routes        | `short-film` controller -> `short-films` service | `strapi.plugin("creative-works").service(...)`     | WIRED  |
| `register.ts`        | publish guard                                    | `strapi.documents.use`                             | WIRED  |
| importer             | Document Service / upload provider               | `strapi.documents`, `findOrUploadImage`            | WIRED  |

### Data-Flow Trace (Level 4)

| Artifact           | Data        | Source                                                                               | Real data                                              | Status  |
| ------------------ | ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------- |
| public list/detail | items, meta | `strapi.documents(creative-work).findMany` with populate                             | yes (boot fixtures; 13 imported films on E2E Postgres) | FLOWING |
| WorkForm           | work values | `GET /creative-works/admin/works/:documentId` (Document Service, relations resolved) | yes (E2E walkthrough edits a saved film)               | FLOWING |

### Behavioral Spot-Checks

| Behavior                                 | Command                                                                                                                                | Result                | Status |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| Edit route, guard, locale save, importer | `jest --selectProjects server --testMatch='**/*.service.test.ts' --runInBand work-editor ... import-short-films` (ImageKit vars empty) | 4 suites, 75 passed   | PASS   |
| Public API + schema boot suites          | same, `short-films.service short-film-schema`                                                                                          | 3 suites, 108 passed  | PASS   |
| Admin Works form suites                  | `jest --selectProjects admin --maxWorkers=2 WorkForm MediaInput WorksRouting`                                                          | 5 suites, 76 passed   | PASS   |
| Full Playwright suite, isolated stack    | `yarn e2e:up && yarn test:e2e && yarn e2e:down`                                                                                        | 12 passed (46.6 s)    | PASS   |
| Live API against the dev server          | curl localhost:1337                                                                                                                    | no dev server running | SKIP   |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

All six IDs appear in plan `requirements:` frontmatter, are checked in REQUIREMENTS.md and marked Complete in its traceability table. REQUIREMENTS.md maps exactly SDATA-01..05 and FR57 to Phase 1; none is orphaned.

| Requirement | Source plans                                    | Status                                  | Evidence                                                                                         |
| ----------- | ----------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| SDATA-01    | 01-02, 01-06, 01-08                             | ✓ SATISFIED                             | Schema delta additive; `short-film-schema` boot suite                                            |
| SDATA-02    | 01-06, 01-07, 01-08, 01-09, 01-14, 01-15, 01-16 | ✓ SATISFIED                             | Real-browser walkthrough passes on HEAD; guard, locale-save, work-editor boot suites             |
| SDATA-03    | 01-03, 01-04, 01-05                             | ✓ SATISFIED                             | Public routes, boot suite, Postgres E2E; facets deliberately left to Meilisearch (D-10)          |
| SDATA-04    | 01-10, 01-11, 01-12, 01-13                      | ✓ SATISFIED (poster clause by override) | 13 approved films, idempotent importer; production run is Phase 6                                |
| SDATA-05    | 01-01, 01-03, 01-04                             | ✓ SATISFIED                             | Boot suite covers every named case incl. non-short work and draft                                |
| FR57        | 01-07, 01-10, 01-13                             | ✓ SATISFIED                             | `MediaInput` uses the registered media-library dialog; dev backdrops on `ik.imagekit.io` (01-13) |

Note: 01-11 and 01-12 SUMMARYs list `requirements-completed: []` by design (SDATA-04 completes in 01-13). Not gaps.

### Anti-Patterns Found

| File                                                                                 | Pattern                                            | Severity           | Impact                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------ | ------------------------------------ |
| phase source (creative-works plugin, WorkForm, Works pages, hooks, seeds, e2e specs) | TBD/FIXME/XXX                                      | none found         | grep clean                           |
| `middlewares/index.ts`, `config/server.ts` (IN-01)                                   | rate limit keyed on `ctx.ip`, `server.proxy` unset | ℹ️ Info / advisory | Production-only; Phase 6 deploy item |
| IN-02..IN-09 in 01-REVIEW.md                                                         | various                                            | ℹ️ Info            | Open, advisory; review status clean  |

Review fixes WR-01 (featured placement kept on re-import), WR-02 (translation posters follow the default), WR-04 (stored slug kept), WR-05 (theatreDetails omitted for non-plays) are present in code and pinned by tests that I ran.

### Human Verification Required

None required for the phase goal. Items I considered and why they do not gate the phase:

- **WR-05 owner-rule change** (fixer marked "requires human verification"): the rule was decided by the owner on 2026-11-10 (c6ef88c, 01-16 amendment) and the code now matches it. The state-preservation invariant is exercised by a passing boot case, not just by presence, so I do not treat it as unverified. An optional owner glance at "switch a play to Film, save, switch back, details intact" is a courtesy, not a gate.
- **Owner Arabic review of the 24 AI-drafted AR/EN fields** (01-CURATION-SHEET.md): owner-deferred follow-up (UAT test 3 skipped), non-blocking per D-13. Tracked, not a Phase 1 criterion.
- **WR-02 residual:** an admin-created translation row that copied a poster before the default poster was replaced cannot be told from a deliberate override. No film has a poster today, so no live impact; a manual clear is documented in 01-REVIEW-FIX.md.

### Gaps Summary

No gaps. Both UAT gaps (G-01-1 blocker, G-01-2 major) and the Arabic RTL item are closed in code and proven in a real browser by a Playwright run I executed on HEAD. The public API, schema, publish guard, importer and edit route are verified by boot suites I re-ran, with Postgres parity now covered over HTTP. The only deliberate departure from the literal roadmap wording (no 2:3 posters) is an owner-confirmed override.

Carry-forward items for later phases (not Phase 1 gaps): production catalog import and IN-01 `server.proxy` (Phase 6), genre ar/en rows (deferred-items.md, Phase 2 decision), `{ data }`-wrapped writes in `usePeople` and `SubEventModal` (deferred-items.md, pre-existing, outside this phase's goal), `.build` distDir in `seed`/`seed:clear`, client Storybook lint leftovers.

---

_Verified: 2026-11-10_
_Verifier: Claude (gsd-verifier)_
