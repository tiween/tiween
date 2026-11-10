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
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 1: Code Review Report (incremental, plan 01-16 + carry-forward)

**Reviewed:** 2026-11-10
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Scope: the 12 files changed since `d9e3505` by the final gap-closure plan (01-16), read in full and diffed, plus the files behind the 9 findings of the 2026-10-25 review that were still `open`.

The 01-16 change is sound. Hidden-field validation (loose draft schemas in the object shape, strict schemas re-applied per type in a `superRefine`) behaves as documented. The short-film-only keys are omitted from a Film or Play payload, and the server boot test pins that an omitted key leaves the stored value alone. The streaming-URL error is translated, the toast fires on every invalid Save, and Arabic inputs get `dir` and `lang`. Translation key parity between `en.json` and `fr.json` holds. A missing `ar.json` is intended and not flagged. I found no security issue and no crash-level defect in the new code. One new warning concerns an inconsistency the plan introduced into its own rule: hidden theatre details are still sent (as `null`) while hidden short-film keys are omitted.

Of the 9 prior open findings, 1 (WR-03) is resolved by this plan. The other 8 still apply to the current code and are carried forward unchanged.

Necessity assessment was not performed (the necessity reference was not read for this incremental pass), so no `necessity:` count is emitted.

## Warnings

### WR-05: A Film or Play save still clears stored `theatreDetails`, contradicting the "hidden fields are not sent" rule

**File:** `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts:668-682` (rule stated at `schema.ts:7-13`, `700-702`), pinned by `schema.unit.test.ts` "(v) never validates a hidden act count..." and `WorkFormShortFields.test.tsx` "saves a film when an invalid act count was left behind by a type switch" (`expect(data.theatreDetails).toBeNull()`)
**Issue:** The new header says "Hidden fields are neither validated nor sent", and `SHORT_FILM_ONLY_KEYS` exists so that "a save as Film or Play leaves the stored values untouched (01-08)". `theatreDetails` is treated the other way: for any type except `play`, the payload sends `theatreDetails: null`, which clears the stored single component in the content-manager. An editor who switches a Play to Film (a typo fix, or a mistaken click) and saves loses the whole theatre record (play type, act count, premiere venue, performed languages), and switching back does not restore it. The short-film side of the same switch is preserved. The code behaves differently for two cases the comments describe as one rule, and the 01-16 tests pin the destructive branch as expected behaviour. This line existed before 01-16, but the plan restated the rule, extended `SHORT_FILM_ONLY_KEYS` only to short-film keys, and added the tests that lock it in.
**Fix:** Decide the rule and make the code, comments and tests agree. If stored data must survive a type switch, omit the key for non-plays:

```ts
...(isPlay
  ? { theatreDetails: { playType: details.playType || null, /* ... */ } }
  : {}),
```

and change the two tests to assert `not.toHaveProperty("theatreDetails")`. If clearing is intended (a non-play must not carry theatre data), reword the header and the "not sent" claims to say theatre details are cleared, and add a test that names that behaviour.

### WR-01: A re-import silently reverts editor-set `featured` / `featuredRank` and republishes the film

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/scripts/seeds/utils/short-film-import.ts:376-377` (consumed at `apps/strapi/scripts/seeds/shorts/import-short-films.ts`)
**Issue:** `buildShortFilmData` still writes `featured: entry.featured ?? false` and `featuredRank: entry.featuredRank ?? null` unconditionally (verified at lines 376-377). The data file names neither field, while the WorkForm "Directory placement" section tells the owner to set them in the admin. On the next `seed:shorts` run the importer sees `featured: true` in the draft against `false` in the payload, overwrites the draft, republishes and re-stamps `publishedAt` on every featured film. The curated hero list is wiped and the default sort key churns. The importer already treats `poster` and `backdrop` as "only written when the file names one"; placement needs the same rule.
**Fix:** Write the placement fields only when the entry names them, and keep them out of the comparison otherwise:

```ts
...(entry.featured !== undefined ? { featured: entry.featured } : {}),
...(entry.featuredRank !== undefined ? { featuredRank: entry.featuredRank } : {}),
```

Add a service test that sets `featured` through the Document Service, re-runs the import with a file that omits it, and asserts it survives.

### WR-02: Replacing or removing the default-language poster leaves a stale poster on every translation, and the public API prefers it

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx` (default-tab save), `LocalizedFieldsForm.tsx`, read side `apps/strapi/src/plugins/creative-works/server/src/services/short-films.ts:462`
**Issue:** `poster` is a localized attribute, the importer replicates its id into each translation row, and the overlay still serves `toPublicMedia(localized.poster) ?? item.poster` (verified at line 462). Saving the default tab writes the new poster to the default row only, so `?locale=ar` and `?locale=en` keep the old image after a correction, and removing the default poster does not clear it on translations.
**Fix:** Pick one rule and make both sides follow it. Either stop copying the poster to translation rows and fall back to the default poster at read time unless a translation carries its own deliberate one (drop the prefill in `toLocalizedValues` and the replication in `buildLocalizedData` / `importFilm`), or propagate a changed poster id to every existing translation row on a default-tab save and republish the published ones.

### WR-04: Saving a work whose slug was blank can silently change its public URL

_Carried from 2026-10-25 review. Still applies. Location moved from `WorkFormPage.tsx:144-150` to `WorkFormPage.tsx:183-190`._

**File:** `apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx:183-190` with `hooks/useCreativeWorks.ts:580-593`
**Issue:** When the slug field is blank, `handleSubmit` calls `generateSlug(values.title)` and puts the result into the payload only; the form field stays `""`. `generateSlug` posts `{ contentTypeUID, field: "slug", data: { title } }` with no `documentId`, so the content-manager's availability check counts the work's own stored slug as taken. A second save from the same mounted form generates `my-film-1` and overwrites the slug. Public URLs and the importer's slug key depend on it.
**Fix:** After a successful save, write the stored slug back into the form (`reset` with the refetched values or `setValue("slug", saved.slug)`), or skip generation when the loaded work already has a slug and pass `documentId` to the uid generator.

## Info

### IN-01: Rate limiting keys on `ctx.ip`, and Strapi's `server.proxy` is not set

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/src/plugins/creative-works/server/src/middlewares/index.ts:12-25`, `apps/strapi/config/server.ts`
**Issue:** Accepted risk T-01-15. `grep proxy apps/strapi/config/*.ts` finds nothing, so behind the Dokploy proxy `ctx.ip` is the proxy address for every caller and the 600 req/60 s bucket is global per route. One hostile client can 429 the Next.js server.
**Fix:** Set `server.proxy: true` (or the exact hop count) once the Dokploy topology is confirmed.

### IN-02: `isHttpsUrl` accepts strings that are not clean https URLs, and the stored raw value is served as-is

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/src/shared/short-film-rules.ts:371-378`, `short-films.ts` projection
**Issue:** `isHttpsUrl` still does `new URL(value.trim()).protocol === "https:"`. `"https:evil.com"`, `"https:///x"`, leading whitespace and `https://user:pass@a.com` pass, and the raw string is persisted and served. The 01-16 schema reuses it for the new `INVALID_HTTPS_URL` field error, so the admin shows no error for these inputs either.
**Fix:** Require `value === value.trim()`, `startsWith("https://")`, a non-empty `hostname` and empty `username` / `password`; return `url.href` from the write path or the projection.

### IN-03: A changed `poster.sourceUrl` or `backdrop.sourceUrl` has no effect once an image is uploaded

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/scripts/seeds/utils/media-upload.ts:236-239`
**Issue:** `findOrUploadImage` still reuses any upload whose name starts with `<name>.` and returns its id without comparing the source URL, so a corrected source is silently ignored on re-import.
**Fix:** Record the source URL (file `caption` or `provider_metadata`) and warn or replace on mismatch; at minimum document the manual delete-then-rerun step.

### IN-04: `mapCountryNames` and `COUNTRY_NAMES` are dead production code

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/scripts/seeds/utils/short-film-import.ts:505-565`
**Issue:** The only referencing files are `short-film-import.ts` and its own unit test. Nothing under `scripts/` or `src/` calls it in production.
**Fix:** Delete the helper, its table and its test, or move it to a one-off migration script.

### IN-05: Admin lookups are silently capped

_Carried from 2026-10-25 review. Still applies._

**File:** `apps/strapi/src/plugins/events-manager/admin/src/hooks/useCreativeWorks.ts:692`
**Issue:** `useGenres` still fetches `pageSize: 100` once and never pages. Genres beyond the first 100 are unpickable with no warning.
**Fix:** Page through the vocabulary as `useCreditRoles` does, or surface a truncation error.

### IN-06: `SHORT_FILM_ONLY_KEYS` is not the source of truth for the payload

**File:** `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts:235-239`, `703-717`
**Issue:** The exported constant is referenced only by its own comment and `schema.unit.test.ts`. `workToApiPayload` hard-codes the same three keys in an object literal. Adding a fourth short-film-only field to the payload without touching the constant passes every test except the one that pins the list's literal contents, and that test would then be edited to match. The constant gives an appearance of a single definition without enforcing one.
**Fix:** Build the omitted block from the constant, or drop the export and let the test assert the keys directly:

```ts
const shortFilmOnly = { streamingLinks: [...], featured: ..., featuredRank: ... } satisfies Record<(typeof SHORT_FILM_ONLY_KEYS)[number], unknown>
```

### IN-07: The WR-03 E2E URL assertion is vacuous

**File:** `apps/strapi/e2e/specs/admin-short-film-walkthrough.spec.ts:488-490`
**Issue:** `toHaveURL(new RegExp(`${WORKS_PATH}/[^/]+$`))` also matches the pre-save URL `.../works/new`, so the first assertion passes immediately and proves nothing about the save. The test is still correct only because the following `publish-bar` assertion renders solely on an existing work (`WorkFormPage.tsx:310` gates on `isEditing`). If the publish bar ever renders on the create page, the test would pass without a save.
**Fix:** Exclude the create path: `new RegExp(`${WORKS_PATH}/(?!new$)[^/]+$`)`.

## Resolved since prior review

### WR-03: Save is silently blocked when an invalid value sits in a section hidden by the work type (RESOLVED by 01-16)

Evidence against the current code:

- `schema.ts:258-287` object shape now uses `streamingLinkDraftSchema` (free `url`), `theatreDetailsDraftSchema` (free `actCount`) and a free `featuredRank`. The strict checks run only inside the `superRefine` at `schema.ts:289-334`, gated on `type === "short-film"` and `type === "play"`. A blank streaming row or a rank of 0 left behind by a type switch no longer fails the resolver (`schema.unit.test.ts` cases (i), (iv), (v); `WorkFormShortFields.test.tsx` "saves a film when a blank streaming row was left behind...").
- `workToApiPayload` (`schema.ts:700-717`) omits `streamingLinks`, `featured`, `featuredRank` for non-short films.
- Visible feedback: `StreamingLinksEditor.tsx:102-129` renders a translated `Field.Error`, and `index.tsx:120-131, 133-136` raises a danger toast on every invalid submit, which also covers the unslotted `duration`, `releaseYear` and `rating` bounds mentioned in the prior finding.
- The server boot case `work-editor.service.test.ts` "a save that omits short-film-only keys keeps them" confirms Strapi leaves omitted keys untouched.

Residual: see WR-05 for the theatre-details asymmetry that survives next to this fix.

---

_Reviewed: 2026-11-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
