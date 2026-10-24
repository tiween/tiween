---
phase: 01-short-film-catalog-backend
reviewed: 2026-10-25T00:00:00Z
depth: standard
files_reviewed: 83
files_reviewed_list:
  - apps/client/src/app/[locale]/venue/events/new/_components/VenueEventForm.tsx
  - apps/client/src/features/venues/schemas/venue-events.test.ts
  - apps/client/src/features/venues/schemas/venue-events.ts
  - apps/strapi/package.json
  - apps/strapi/scripts/seeds/data/creative-works.json
  - apps/strapi/scripts/seeds/data/short-films.json
  - apps/strapi/scripts/seeds/shorts.ts
  - apps/strapi/scripts/seeds/shorts/__fixtures__/short-films.sample.json
  - apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts
  - apps/strapi/scripts/seeds/shorts/import-short-films.ts
  - apps/strapi/scripts/seeds/utils/media-upload.ts
  - apps/strapi/scripts/seeds/utils/media-upload.unit.test.ts
  - apps/strapi/scripts/seeds/utils/short-film-import.ts
  - apps/strapi/scripts/seeds/utils/short-film-import.unit.test.ts
  - apps/strapi/scripts/seeds/utils/short-films-data.unit.test.ts
  - apps/strapi/src/bootstrap/i18n-locales.ts
  - apps/strapi/src/bootstrap/i18n-locales.unit.test.ts
  - apps/strapi/src/components/creative-works/streaming-link.json
  - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-locale-save.service.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-publish-guard.service.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-film-schema.service.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/__tests__/short-films.service.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/content-types/__tests__/creative-work-schema.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json
  - apps/strapi/src/plugins/creative-works/server/src/controllers/index.ts
  - apps/strapi/src/plugins/creative-works/server/src/controllers/short-film.ts
  - apps/strapi/src/plugins/creative-works/server/src/document-middlewares/__tests__/short-film-publish-guard.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/document-middlewares/short-film-publish-guard.ts
  - apps/strapi/src/plugins/creative-works/server/src/middlewares/__tests__/short-films-rate-limit.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/middlewares/index.ts
  - apps/strapi/src/plugins/creative-works/server/src/register.ts
  - apps/strapi/src/plugins/creative-works/server/src/routes/__tests__/content-api.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/routes/__tests__/short-films-api-doc.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/routes/content-api.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/__tests__/public-api.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/__tests__/short-films.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/creative-work.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/index.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/public-api.ts
  - apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts
  - apps/strapi/src/plugins/creative-works/server/src/validation/__tests__/short-films.unit.test.ts
  - apps/strapi/src/plugins/creative-works/server/src/validation/short-films.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/CodeMultiPicker.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/MediaInput.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormLocales.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormPublish.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorkFormShortFields.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/__tests__/WorksRouting.test.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/MediaInput/index.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/SideNav/index.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/CountryLanguageFields.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocaleTabs.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/LocalizedFieldsForm.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/PublishBar.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/publishRules.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/publishRules.unit.test.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.unit.test.ts
  - apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/StreamingLinksEditor.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts
  - apps/strapi/src/plugins/events-manager/admin/src/hooks/workPopulate.ts
  - apps/strapi/src/plugins/events-manager/admin/src/pages/App.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx
  - apps/strapi/src/plugins/events-manager/admin/src/translations/ar.json
  - apps/strapi/src/plugins/events-manager/admin/src/translations/en.json
  - apps/strapi/src/plugins/events-manager/admin/src/translations/fr.json
  - apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/venue-events.unit.test.ts
  - apps/strapi/src/plugins/events-manager/server/src/validation/__tests__/venue-events.unit.test.ts
  - apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts
  - apps/strapi/src/shared/__tests__/bypass-test-helper.ts
  - apps/strapi/src/shared/__tests__/short-film-publish-bypass.unit.test.ts
  - apps/strapi/src/shared/__tests__/short-film-rules.unit.test.ts
  - apps/strapi/src/shared/short-film-publish-bypass.ts
  - apps/strapi/src/shared/short-film-rules.ts
  - apps/strapi/tests/__mocks__/strapi-admin.ts
  - apps/strapi/tests/fixtures/index.ts
  - apps/strapi/tests/fixtures/publishable-short.ts
  - apps/strapi/tests/fixtures/short-films.ts
  - apps/strapi/tests/setup-jsdom.ts
  - apps/strapi/tests/strapi-semantics.service.test.ts
  - apps/strapi/types/generated/components.d.ts
  - apps/strapi/types/generated/contentTypes.d.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-25
**Depth:** standard
**Files Reviewed:** 83
**Status:** issues_found

## Summary

I read the production source in full: the public read service, controller, validation, the Document Service publish guard, the shared rules and bypass modules, the importer (CLI, orchestrator, media helper, payload builders), and the admin WorkForm, locale tabs, publish bar, hooks and page. I sanity-checked the generated types, translation key parity, the seed data (`seed:shorts --dry-run` parses 13 approved films), the ISO list (249 unique, sorted codes) and the `isHttpsUrl` / `stripHtml` edge cases by running them. I did not read the test files line by line. I checked them for skipped or vacuous tests and found none.

The server side is solid. The read allowlist, strict query schemas, coded errors, fail-closed guard and SSRF-hardened downloader hold up. I found no security vulnerability and no crash-level defect. The defects are in editor-versus-importer ownership, stale translation data, and admin form edge cases. None of them blocks the code from shipping, but three can silently change or hide public catalog data.

Documented decisions I did not flag: English-only catalog admin strings, the posterless-film bypass (D-20), the shared-IP rate-limit risk (T-01-15), the lean list (D-10), and the carried-over markdown rendering risk.

## Warnings

### WR-01: A re-import silently reverts editor-set `featured` / `featuredRank` and republishes the film

**File:** `apps/strapi/scripts/seeds/utils/short-film-import.ts:376-377` (consumed at `apps/strapi/scripts/seeds/shorts/import-short-films.ts:477, 502-505, 516-519`)
**Issue:** `buildShortFilmData` always writes `featured: entry.featured ?? false` and `featuredRank: entry.featuredRank ?? null`. The data file currently names neither field on any of the 13 films. The admin docs (`short-films-admin.md:40`) and the WorkForm "Directory placement" section tell the owner to set Featured and rank in the admin. On the next `seed:shorts` run (a re-run to add films toward the 30-50 target, or the Phase 6 production run), `payloadDiffers` sees `featured: true` in the draft against `false` in the payload. The importer then overwrites the draft with `featured: false`, republishes the default locale and re-stamps `publishedAt` on every featured film. This causes two defects:

- The curated hero list is wiped.
- The default sort key churns, which is exactly what Pitfall 8 and the "unchanged films are skipped" contract try to prevent.

The importer already treats `poster`/`backdrop` as "only written when the file names one, so a hand-attached image is never cleared". Placement fields need the same rule.
**Fix:** Write the placement fields only when the entry names them, and keep them out of the comparison otherwise:

```ts
...(entry.featured !== undefined ? { featured: entry.featured } : {}),
...(entry.featuredRank !== undefined ? { featuredRank: entry.featuredRank } : {}),
```

Alternatively document that the data file owns placement and warn in `short-films-admin.md`. Add a service test that sets `featured` through the Document Service, re-runs the import with a file that omits it, and asserts it survives.

### WR-02: Replacing or removing the default-language poster leaves a stale poster on every translation, and the public API prefers it

**File:** `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx:138-153` and `LocalizedFieldsForm.tsx:59`, read side `apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts:462`
**Issue:** `poster` is a localized attribute. The translation tab prefills it from the default row ("starting from the default-language poster"), and the importer replicates the id into every translation row. Saving the default tab (`updateWork(documentId, payload, defaultLocale)`) writes the new poster to the default row only. The overlay then serves the translation's poster over the default one:

```ts
poster: toPublicMedia(localized.poster) ?? item.poster,
```

After an editor corrects a wrong poster on the FR tab, `/shorts/<slug>?locale=ar` and `?locale=en` keep showing the old image until someone opens each translation tab and replaces it by hand. Removing the poster on the FR tab does not clear it on the translations. The same applies to a poster added after import. In that case the translation has none and falls back correctly, so only replacement and removal are affected.
**Fix:** Pick one rule and make both sides follow it. Either:

- Stop copying the poster to translation rows and fall back to the default poster at read time, unless the translation has its own, deliberately set one. This is the simplest option. Drop the prefill in `toLocalizedValues`, and drop the replication in `buildLocalizedData`, `importFilm` and the `replicatedPoster` handling.
- Or, on a default-tab save that changes the poster, propagate the new id to every existing translation row, and republish those that are published.

### WR-03: Save is silently blocked when an invalid value sits in a section hidden by the work type

**File:** `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/index.tsx:440-513`, `schema.ts:229, 235`, `StreamingLinksEditor.tsx:106-117`
**Issue:** `streamingLinks` and `featuredRank` stay in the form state and in `workFormSchema` for every work type. Their UI is rendered only when `isShort`. Reproduction:

1. Pick "Short film".
2. Click "Add a streaming link" and leave the URL blank (the default is `""`).
3. Switch the type to Film or Play.

The Zod resolver still fails on `streamingLinks.0.url`, the section is unmounted, and the form is `noValidate`. Save does nothing and no error is shown anywhere. A rank of `0` has the same effect. Even while the section is visible, the URL input only turns red: there is no message, and the `INVALID_HTTPS_URL` code is never translated. `duration`, `releaseYear` and `rating` have bounds in the schema but no error slot either. That part predates this phase, but the new fields repeat the pattern.
**Fix:** Make the schema conditional on type, for example a `superRefine` on `workFormSchema` that validates `streamingLinks` / `featuredRank` only when `type === "short-film"`. Alternatively drop them in `workToApiPayload` for other types and reset them in a `useEffect` when the type changes. Render `<Field.Error />` with a translated message under the streaming URL input.

### WR-04: Saving a work whose slug was blank can silently change its public URL

**File:** `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx:144-150` with `hooks/useCreativeWorks.ts:617-630`
**Issue:** When the slug field is blank, `handleSubmit` calls `generateSlug(values.title)` and writes the result into the payload only. The form field stays `""`, because `WorkForm` is keyed by `documentId` and does not reset after `refetchAll()`. The request to `/content-manager/uid/generate` carries no `documentId`, so the content-manager's availability check counts the work's own slug as taken. A second save from the same mounted form (for example `works/:documentId` re-saved without remounting) therefore generates `my-film-1` and overwrites the slug. Public URLs and the importer's slug key both depend on that slug. Newly created works are not affected, because they navigate and remount with the stored slug loaded. Works that load with an empty slug are affected, and so are any that reach the page without a remount.
**Fix:** After a successful save, write the stored slug back into the form (`reset` with the refetched values, or `setValue("slug", saved.slug)`). Alternatively skip generation when the loaded work already has a slug, and pass `documentId` to the uid generator so it ignores the work itself.

## Info

### IN-01: Rate limiting keys on `ctx.ip`, and Strapi's `server.proxy` is not set

**File:** `apps/strapi/src/plugins/creative-works/server/src/middlewares/index.ts:12-25`, `apps/strapi/config/server.ts`
**Issue:** This is the accepted risk T-01-15, noted so the trade-off stays visible. With no `proxy` in `config/server.ts`, Koa's `ctx.ip` is the reverse proxy address for every caller. The 600 requests/60 s bucket is then global per route, so one anonymous client at 10 req/s can 429 the Next.js server for everyone. The documented reasoning ("the cap never throttles the SSR caller") assumes no hostile client.
**Fix:** Set `server.proxy: true` (or the exact proxy hop count) once the Dokploy topology is confirmed, so `ctx.ip` is the real client address. This is cheap and leaves the limiter unchanged.

### IN-02: `isHttpsUrl` accepts strings that are not clean https URLs, and the stored raw value is served as-is

**File:** `apps/strapi/src/shared/short-film-rules.ts:371-378`, `short-films.ts:312, 413-418`
**Issue:** `isHttpsUrl` trims and parses, so `"https:evil.com"`, `"https:///x"`, `"  https://a.com"`, `"https://a\n.com"` and `"https://user:pass@a.com"` all return `true`. The server guard and the public filter then persist and serve the raw string. This is not exploitable (`javascript:` and `data:` are rejected), but some of these render as broken or relative links, and embedded credentials would be published. The comment promises an "absolute https URL".
**Fix:** Require `value === value.trim()`, `value.startsWith("https://")`, a non-empty `hostname`, and empty `username` / `password`. Return `url.href` from the write path or the projection.

### IN-03: A changed `poster.sourceUrl` or `backdrop.sourceUrl` has no effect once an image is uploaded

**File:** `apps/strapi/scripts/seeds/utils/media-upload.ts:236-239`
**Issue:** `findOrUploadImage` reuses any `plugin::upload.file` whose name starts with `<slug>-poster.` / `<slug>-backdrop.`, regardless of the URL in the data file. If the curated source is corrected after the first run (a wrong or low-resolution image), a re-import reports the film as unchanged and keeps the old file, with no warning. The design is documented ("never moved"), but the failure is silent.
**Fix:** Record the source URL (for example in the file's `caption`, or `provider_metadata`) and warn or replace when it differs. At minimum, document the manual delete-then-rerun step in the operator guide.

### IN-04: `mapCountryNames` and `COUNTRY_NAMES` are dead production code

**File:** `apps/strapi/scripts/seeds/utils/short-film-import.ts:505-565`
**Issue:** Nothing under `scripts/` or `src/` calls `mapCountryNames`. Only its own unit test does. The data file already uses ISO codes.
**Fix:** Delete the helper, its table and its test, or move it to a one-off migration script.

### IN-05: Admin lookups are silently capped

**File:** `apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts:726`
**Issue:** `useGenres` fetches `pageSize: 100` once and never pages, unlike `useCreditRoles` right below it. A vocabulary larger than 100 genres would leave the extra genres unpickable with no warning.
**Fix:** Page through the vocabulary the way `useCreditRoles` does, or surface a truncation error.

---

_Reviewed: 2026-10-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
