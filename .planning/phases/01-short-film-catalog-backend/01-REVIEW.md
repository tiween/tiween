---
phase: 01-short-film-catalog-backend
reviewed: 2026-11-10T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - apps/strapi/e2e/specs/admin-short-film-walkthrough.spec.ts
  - apps/strapi/src/plugins/creative-works/server/src/__tests__/work-editor.service.test.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocalizedFieldsForm.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/StreamingLinksEditor.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormLocales.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/translations/en.json
  - apps/strapi/src/plugins/events-manager/admin/src/translations/fr.json
  - apps/strapi/scripts/seeds/utils/short-film-import.ts
  - apps/strapi/scripts/seeds/shorts/import-short-films.ts
  - apps/strapi/scripts/seeds/utils/media-upload.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts
  - apps/strapi/src/plugins/creative-works/server/src/middlewares/index.ts
  - apps/strapi/src/shared/short-film-rules.ts
  - apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
  - apps/strapi/config/server.ts
findings:
  critical: 0
  warning: 0
  info: 9
  total: 9
status: clean
---

# Phase 1: Code Review Report (iteration 2, after the WR-01/02/04/05 fixes)

**Reviewed:** 2026-11-10
**Depth:** standard
**Files Reviewed:** 20
**Status:** clean (no Critical or Warning findings remain; 9 Info items)

## Summary

This pass re-reads the four fix commits (e57fe88, 91fc06c, 139780f, 4ba4792) against the current code and diffs them against the prior review (`01-REVIEW.iter2.md`). All four prior Warnings are resolved, and I found no regression in the translation-poster fallback (read side and the importer's one-time clearing), the re-import featured logic, or the slug re-send. The admin component and seed-util jest suites pass on the current tree (18 suites, 442 tests). The boot suites were not re-run here, so those results come from the fix report.

The WR-05 behaviour (non-play saves omit `theatreDetails`) follows the 2026-11-10 owner decision and is not flagged. The missing `ar.json` is intended. Necessity assessment was not performed (the necessity reference was not read for this incremental pass), so no `necessity:` count is emitted.

The Info items from the previous review are carried forward with their IDs. Two new Info items (IN-08, IN-09) come from the fixes.

## Info

### IN-01: Rate limiting keys on `ctx.ip`, and Strapi's `server.proxy` is not set

_Carried from the 2026-10-25 review. Still applies._

**File:** `apps/strapi/src/plugins/creative-works/server/src/middlewares/index.ts:12-25`, `apps/strapi/config/server.ts`
**Issue:** Accepted risk T-01-15. `config/server.ts` still has no `proxy` setting, so behind the Dokploy proxy `ctx.ip` is the proxy address for every caller. The 600 req/60 s bucket is then global per route, and one hostile client can 429 the Next.js server.
**Fix:** Set `server.proxy: true` (or the exact hop count) once the Dokploy topology is confirmed.

### IN-02: `isHttpsUrl` accepts strings that are not clean https URLs, and the stored raw value is served as-is

_Carried. Still applies._

**File:** `apps/strapi/src/shared/short-film-rules.ts:371-378`, `short-films.ts` projection
**Issue:** `isHttpsUrl` does `new URL(value.trim()).protocol === "https:"`. `"https:evil.com"`, `"https:///x"`, leading whitespace and `https://user:pass@a.com` pass, and the raw string is persisted and served. The admin schema reuses it for `INVALID_HTTPS_URL`, so the admin shows no error for these inputs either.
**Fix:** Require `value === value.trim()`, `startsWith("https://")`, a non-empty `hostname` and empty `username` / `password`; return `url.href` from the write path or the projection.

### IN-03: A changed `poster.sourceUrl` or `backdrop.sourceUrl` has no effect once an image is uploaded

_Carried. Still applies._

**File:** `apps/strapi/scripts/seeds/utils/media-upload.ts:236-239`
**Issue:** `findOrUploadImage` reuses any upload whose name starts with `<name>.` and returns its id without comparing the source URL, so a corrected source is silently ignored on re-import.
**Fix:** Record the source URL (file `caption` or `provider_metadata`) and warn or replace on mismatch; at minimum document the manual delete-then-rerun step.

### IN-04: `mapCountryNames` and `COUNTRY_NAMES` are dead production code

_Carried. Still applies. Location moved from `short-film-import.ts:505-565` to `:510-570`._

**File:** `apps/strapi/scripts/seeds/utils/short-film-import.ts:510-570`
**Issue:** The only referencing files are `short-film-import.ts` and its own unit test. Nothing under `scripts/` or `src/` calls it in production.
**Fix:** Delete the helper, its table and its test, or move it to a one-off migration script.

### IN-05: Admin lookups are silently capped

_Carried. Still applies._

**File:** `apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts:692`
**Issue:** `useGenres` fetches `pageSize: 100` once and never pages. Genres beyond the first 100 are unpickable with no warning.
**Fix:** Page through the vocabulary as `useCreditRoles` does, or surface a truncation error.

### IN-06: `SHORT_FILM_ONLY_KEYS` is not the source of truth for the payload

_Carried. Still applies. Location moved to `schema.ts:237` and `706-725`._

**File:** `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts:237`, `706-725`
**Issue:** The exported constant is referenced only by a comment and `schema.unit.test.ts`. `workToApiPayload` hard-codes the same three keys in an object literal, so a fourth short-film-only field added to the payload without touching the constant would pass every test except the one that pins the list's literal contents.
**Fix:** Build the omitted block from the constant, or drop the export and let the test assert the keys directly, for example with a `satisfies Record<(typeof SHORT_FILM_ONLY_KEYS)[number], unknown>` on the object literal.

### IN-07: The WR-03 E2E URL assertion is vacuous

_Carried. Still applies._

**File:** `apps/strapi/e2e/specs/admin-short-film-walkthrough.spec.ts:489`
**Issue:** `toHaveURL(new RegExp(`${WORKS_PATH}/[^/]+$`))` also matches the pre-save URL `.../works/new`, so it proves nothing about the save. The test is still correct only because the following `publish-bar` assertion renders solely on an existing work.
**Fix:** Exclude the create path: `new RegExp(`${WORKS_PATH}/(?!new$)[^/]+$`)`.

### IN-08: The importer's stale-poster clearing only reaches locales the data file translates

**File:** `apps/strapi/scripts/seeds/shorts/import-short-films.ts:457-459`, `476-494`
**Issue:** `translations` is filtered to locales for which `buildLocalizedData` returns a title, and the inherited-copy check runs only inside that loop. A translation row left by an earlier run (or created in the admin) for a locale the data file no longer translates keeps its stale copy of the default poster, and the public API keeps preferring it (`overlayLocalizedFields`, `toPublicMedia(localized.poster) ?? item.poster`). This matters little in practice because earlier runs only wrote rows for locales that had a title. The WR-02 report already lists the related replaced-default-poster case as residual.
**Fix:** If it ever matters, iterate `ctx.otherLocales` for the stale-copy check separately from the text writes, or document the one-off manual clear for those rows.

### IN-09: Clearing the slug field on a saved work no longer regenerates a slug

**File:** `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx:189-200`
**Issue:** With the WR-04 fix, a blank slug field on an existing work always re-sends the stored slug and never calls the uid generator. An editor who clears the field after retitling a film, expecting a regenerated slug, gets the old one back with no message. The fix is correct for its stated problem (the generator counts the work's own slug as taken and would answer `my-film-1`), so this is a deliberate trade-off, not a defect. The page does not tell the editor about it.
**Fix:** Optional. Add a one-line hint under the slug field ("Leave as is to keep the public URL; type a new one to change it"), or leave as is.

## Resolved since prior review

### WR-05: A Film or Play save cleared stored `theatreDetails` (RESOLVED by e57fe88)

- `schema.ts:670-690`: `workToApiPayload` spreads `{ theatreDetails: {...} }` only when `isPlay` and `{}` otherwise, so the key is absent for every other type. The header comment (`schema.ts:7-13`) now states one rule for all hidden sections.
- `schema.unit.test.ts` and `WorkFormShortFields.test.tsx` now assert `not.toHaveProperty("theatreDetails")`. A unit case checks that a play still sends the object.
- `work-editor.service.test.ts` has a new boot case ("a save that omits theatreDetails keeps the stored component") that saves a play as a film through the content-manager and reads the record back unchanged.
- `theatreDetails` is read only by `work-editor.ts` and the admin. No public API path exposes the details a non-play keeps, so retaining them leaks nothing.

### WR-01: A re-import silently reverted editor-set `featured` / `featuredRank` and republished the film (RESOLVED by 91fc06c)

- `short-film-import.ts:377-384` writes `featured` and `featuredRank` only when `entry.featured` / `entry.featuredRank` are not `undefined`. An explicit `false` is still written.
- `payloadDiffers` is next-driven, so keys absent from the payload are never compared. An omitted key therefore produces no diff, no write and no republish, and `publishedAt` is not re-stamped.
- On first create the content-type defaults apply (`featured: false`, `featuredRank` null; `schema.json:230-245`).
- Regression coverage: a unit test (omitted, named, explicit `false`) and a boot case that sets `featured: true, featuredRank: 5`, re-imports, and asserts `unchanged`, kept values and unchanged publish stamps.
- Consequence to be aware of: a film whose data file does name `featured` is still file-owned, so an admin edit to it is overwritten on the next import. That matches the importer's rule for every other named field.

### WR-02: Replacing or removing the default poster left a stale poster on every translation (RESOLVED by 139780f)

- Admin: `toLocalizedValues(row)` (`LocalizedFieldsForm.tsx:50-61`) no longer prefills a new translation from the default poster, and the call site (`WorkFormPage.tsx:379`) is updated. A new translation therefore saves `poster: null`.
- Read side: `overlayLocalizedFields` (`short-films.ts:462`) falls back to `item.poster` when the translation row has no poster. The overlay query populates `poster` for the localized rows (`short-films.ts:689`). The publish guard evaluates the default-locale draft (`short-film-publish-guard.ts` `loadRuleSubject`), so a posterless translation still publishes.
- Importer: `buildLocalizedData` returns only `title` and `synopsis`. A translation draft whose poster id equals the default row's current or incoming id is cleared once (`import-short-films.ts:464-492`). I traced `payloadDiffers` for the cleared case: `canonicalExisting` maps the stored media object to its id for the `poster` key and `canonicalNext` drops the `null`, so the payload differs, the row is written and republished. After the clear no inherited copy remains, so the next run reports `unchanged` and the clear does not repeat.
- Deliberate overrides (a poster id different from the default's) are left alone, and the boot case pins both branches.
- Known residual, already recorded in the fix report: a copy whose id no longer equals the default's, because an editor replaced the default poster by hand, is indistinguishable from an override and stays until cleared manually. See also IN-08.

### WR-04: Saving a work whose slug was blank could silently change its public URL (RESOLVED by 4ba4792)

- `WorkFormPage.tsx:189-200`: a blank slug field on an existing work re-sends `work.slug` (trimmed) and skips `generateSlug`. The generator runs only when the work has no stored slug, on the create path or for legacy rows. A generator failure on that path still falls through to a plain save.
- `work` is the default-locale row refetched by `refetchAll()` after the first save, so the second save from the same mounted form sees the stored slug. `handleSubmit` is rebuilt on each render and does not capture a stale `work`.
- The `WorkFormPublish.test.tsx` regression runs two consecutive saves against a stand-in content-manager and asserts that the second PUT sends the first slug.
- See IN-09 for the one behavioural trade-off.

---

_Reviewed: 2026-11-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
