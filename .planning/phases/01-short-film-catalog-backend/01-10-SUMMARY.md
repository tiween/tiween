---
phase: 01-short-film-catalog-backend
plan: 10
subsystem: seed-import
tags:
  [
    strapi,
    seed,
    importer,
    idempotency,
    ssrf,
    upload,
    imagekit,
    i18n,
    zod,
    short-film,
  ]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-01 spike verdicts (A2 republish re-stamps publishedAt, A13 provider resolution); 01-02 shared rules (countryCodesSchema, languageCodesSchema, STREAMING_PLATFORMS, RESERVED_SHORT_FILM_SLUGS); 01-03 public-api facade (findShortFilm, findShortFilms) and the translated-row credit-target finding; 01-06 runWithShortFilmPublishBypass and the publish guard"
provides:
  - "shortFilmSeedFileSchema / shortFilmSeedEntrySchema: the strict, coded data-file contract 01-11 and 01-12 write against"
  - "Pure payload builders (buildShortFilmData, buildLocalizedData, resolveArabicTitle, stripHtml, payloadDiffers, mapCountryNames, collectAiDraftedFields, listSeedFileIssues)"
  - "SSRF-safe downloadImage, youtubeThumbnailCandidates, findOrUploadImage, assertUploadProvider, DEFAULT_MEDIA_HOSTS"
  - "importShortFilms(strapi, file, deps): idempotent upsert-by-slug as a pure function of a booted Strapi, reusable by Phase 6 against production"
  - "yarn workspace @tiween/admin seed:shorts with --file, --dry-run, --allow-local-uploads, --verify, --help"
  - "scripts/seeds/shorts/__fixtures__/short-films.sample.json and three suites (63 + 43 unit, 22 boot)"
affects: [01-11, 01-12, 01-13, phase-02-shorts-client, phase-06-launch]

actuals:
  tokens: 30210
  tasks: 3
  commits: 4

plan_head_before: fc090ab8aec7252a47ad03bec6479be1a513a22f
plan_head_after: 1133143bf8d11e93ae4a63708a1a92306686083b

tech-stack:
  added: []
  patterns:
    - "Next-driven change detection: compare only the keys the next payload names, collapse populated relations to documentId and uploads to numeric id, treat null as missing, keep component order"
    - "Publish only what changed, per locale: the default row is republished only when it changed or was never published, so a translation-only edit leaves the default sort key alone"
    - "Download = vet URL, manual redirect loop (re-vet each hop, max 3), image/* header AND magic-byte signature, streaming byte cap, whole-call timeout; failures carry stable codes"
    - "Per-film try/catch plus per-image warnings: one bad film or one unreachable thumbnail never aborts the run"
    - "Coded issues everywhere (INVALID_HTTPS_URL, UNKNOWN_GENRE, ARABIC_INDIC_DIGITS, UNKNOWN_KEY...) with Zod prose mapped to codes in one place"

key-files:
  created:
    - apps/strapi/scripts/seeds/utils/short-film-import.ts
    - apps/strapi/scripts/seeds/utils/media-upload.ts
    - apps/strapi/scripts/seeds/shorts/import-short-films.ts
    - apps/strapi/scripts/seeds/shorts.ts
    - apps/strapi/scripts/seeds/shorts/__fixtures__/short-films.sample.json
    - apps/strapi/scripts/seeds/utils/short-film-import.unit.test.ts
    - apps/strapi/scripts/seeds/utils/media-upload.unit.test.ts
    - apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts
  modified:
    - apps/strapi/package.json

key-decisions:
  - "The importer publishes per locale, not with locale '*': the default row is republished only when it changed or was never published, and only the translation rows it wrote are published, so a translation edit never bumps publishedAt and an editor's unrelated draft is never published"
  - "Change detection is next-driven (keys absent from the next payload are not compared) so an image or field an editor added by hand survives a re-import, and component defaults Strapi adds (video.type TEASER) never read as a change"
  - "A failed backdrop or poster download is a per-film warning (BACKDROP_UNAVAILABLE / POSTER_UNAVAILABLE with the reason code); the film is imported and, if posterless, published under the bypass and listed in posterBypassed"
  - "original-title provenance vouches for the Arabic TITLE only; any other Arabic field that is present is still listed in aiDraftedFields"
  - "posterBypassed lists the films published in THIS run under the bypass, not every posterless film"
  - "Downloader hardening beyond the plan: file signature must be jpeg/png/gif/webp/avif (svg refused), no credentials or custom port in a URL, relative redirects resolved against the current hop"
  - "seed:shorts boots with distDir dist, not .build (the copied boot fails in this checkout, see Deviations)"

patterns-established:
  - "A data-file entry that cannot be written faithfully is rejected at validation with a path-specific code, never normalized silently (tn is not upgraded to TN)"
  - "Vimeo has no derivable thumbnail URL: a Vimeo film names its backdrop explicitly in the data file; only YouTube links derive one"

requirements-completed: [SDATA-04, FR57]

coverage:
  - id: D1
    description: "The data-file schema accepts the sample and rejects, with a path-specific code, an unknown genre or credit role, an http URL, the reserved slug, no directors, no watch source, lowercase country, unknown language, Arabic-Indic digits in AR title/synopsis/originalTitle, unknown keys, duplicate slugs, one person with two names, a retired approved slug and a URL as media host"
    requirement: SDATA-04
    verification:
      - kind: unit
        ref: "apps/strapi/scripts/seeds/utils/short-film-import.unit.test.ts#shortFilmSeedFileSchema; #listSeedFileIssues"
        status: pass
    human_judgment: false
  - id: D2
    description: "Payload builders write only keys that exist on creative-work/schema.json and each component JSON (distinction has no sourceUrl), resolve the Arabic title from an Arabic originalTitle, return exactly title/synopsis/poster per locale, strip HTML from synopses, map the mock's free-text countries to ISO codes, and detect real changes without false positives (key order, null vs missing, populated relations, component defaults)"
    requirement: SDATA-04
    verification:
      - kind: unit
        ref: "short-film-import.unit.test.ts#buildShortFilmData: write contract; #buildLocalizedData; #stripHtml; #mapCountryNames; #payloadDiffers; #collectAiDraftedFields"
        status: pass
    human_judgment: false
  - id: D3
    description: "downloadImage refuses http, hosts outside the allowlist, lookalike subdomains, IP literals, redirects to non-allowlisted or http targets, more than 3 redirects, non-images (including svg and html with an image content-type), bodies over 10 MB (streaming and declared) and hung requests; assertUploadProvider fails closed unless ImageKit and refuses allowLocal in production"
    requirement: SDATA-04
    verification:
      - kind: unit
        ref: "apps/strapi/scripts/seeds/utils/media-upload.unit.test.ts (43 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Run 1 imports every approved entry as a published short film readable through the creative-works facade with media, credits, cast, distinctions, videos, streaming links, ISO countries, languages and genres; the unapproved entry is skipped; AR title is the Arabic originalTitle; ar/en rows exist with the poster id replicated; HTML is stripped from the synopsis"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts#importShortFilms: run 1 (first import)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Run 2 with the same file creates and updates nothing: creative-work, person, genre, credit-role and upload-file counts are unchanged, no download happens, and each film's published row id and publishedAt are identical after a 1.1 s pause"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "import-short-films.service.test.ts#importShortFilms: run 2 (same file, idempotent)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Changing one field (duration) or one translation (en title) updates only that film, re-sends the full component arrays so credits, cast, distinctions, videos, streaming links and images survive, and leaves the unchanged film's publishedAt untouched"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "import-short-films.service.test.ts#run 3 (one field changed, lossless update); #run 4 (a translation changed)"
        status: pass
    human_judgment: false
  - id: D7
    description: "retiredSlugs deletes the short film in every locale; a published short film in neither list is reported as an orphan and left untouched; a slug owned by another work type is a failed film (SLUG_BELONGS_TO_OTHER_WORK_TYPE) and does not stop the rest"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "import-short-films.service.test.ts#deletes a retired short film in every locale; #reports a published short film in neither list as an orphan; #records one failed film and still imports the rest"
        status: pass
    human_judgment: false
  - id: D8
    description: "A posterless film is published inside the D-20 bypass (skip POSTER_REQUIRED only) and listed in posterBypassed; every ai-drafted AR/EN field is listed in aiDraftedFields; an unreachable image is a per-film warning with its reason code"
    requirement: FR57
    verification:
      - kind: integration
        ref: "import-short-films.service.test.ts#publishes a posterless film under the D-20 bypass and lists it; #lists every ai-drafted translation field; #imports a film whose images cannot be fetched and warns per image"
        status: pass
    human_judgment: false
  - id: D9
    description: "seed:shorts validates without booting (--dry-run exits 1 and names the offending film, 0 for the sample), prints --help with every flag and the build:test-dist note, refuses local uploads unless --allow-local-uploads and refuses that flag in production, and on a real boot imports, re-runs idempotently and reads back through the facade with --verify"
    requirement: SDATA-04
    verification:
      - kind: other
        ref: "yarn workspace @tiween/admin seed:shorts --dry-run --file scripts/seeds/shorts/__fixtures__/short-films.sample.json (exit 0); same on a copy with country [tn] (exit 1, names sample-two); seed:shorts --help"
        status: pass
      - kind: other
        ref: "NODE_ENV=test DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/cli-check.db tsx scripts/seeds/shorts.ts --file <sample> --allow-local-uploads --verify, twice (run 1 created 2, run 2 unchanged 2 with identical publishedAt, exit 0); without --allow-local-uploads exit 1 UPLOAD_PROVIDER_NOT_IMAGEKIT; NODE_ENV=production with the flag exit 1"
        status: pass
    human_judgment: false
  - id: D10
    description: "Downloads from the real remote hosts (YouTube and Vimeo thumbnail CDNs, artify.tn, festival poster pages) are only exercised against injected fetch in the suites; the CLI check hit the real hosts with the sample's fake URLs and got HTTP_ERROR 404s as warnings"
    verification: []
    human_judgment: true
    rationale: "Whether the real hosts serve the thumbnails the curated file names (and whether an owner-approved poster host needs adding to mediaHosts) can only be learned on the 01-13 dev run with the real catalog"

duration: 30min
completed: 2026-10-19
status: complete
---

# Phase 1 Plan 10: Idempotent Short-Film Launch Import Summary

**A validated data-file contract, pure payload builders, an SSRF-safe media helper and `importShortFilms`, an upsert-by-slug import that skips unchanged films (stable `publishedAt`), re-sends full component arrays on update, writes AR/EN rows with the poster replicated, retires and reports orphans, publishes posterless films under the logged D-20 bypass, and ships as `yarn workspace @tiween/admin seed:shorts` with `--dry-run`, `--verify` and a fail-closed upload-provider check.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-10-19T19:20:45Z
- **Completed:** 2026-10-19T19:50:34Z
- **Tasks:** 3 (Task 1 tracer, Task 2 TDD, Task 3 CLI)
- **Files modified:** 9 (8 created, 1 modified), 4 task commits

## Accomplishments

- **Data contract.** `shortFilmSeedFileSchema` is strict end to end: https-only URLs, slugs and genres checked against `data/genres.json`, role slugs against `data/credit-roles.json`, country and language through the 01-02 validators, a D-19 watch source, Western digits in Arabic fields, unique slugs, one name per person slug, no retired slug that is also approved, bare-hostname `mediaHosts`. Every issue is a path plus a CODE (Zod prose is mapped in one place), and `listSeedFileIssues` names the offending film for `--dry-run`.
- **Import.** `importShortFilms` validates, asserts the upload provider, calls `ensureI18nLocales`, finds or creates genres, persons and credit roles, uploads backdrop and poster, creates or updates the film in the default locale, writes the `ar` and `en` rows (poster id replicated, credited persons and roles given a row in that locale first, per the 01-03 finding), and publishes only what changed.
- **Idempotency proven on a real Strapi.** Run 2 on the same file: created `[]`, updated `[]`, unchanged both films, every record count identical, zero downloads, published row ids and `publishedAt` identical after a 1.1 s pause. Run 3 and 4 (one duration, one translated title) update only that film and keep every component array.
- **Safe media.** `downloadImage` implements T-01-30 end to end and `assertUploadProvider` implements T-01-31; both are unit-tested.
- **Operator CLI.** `seed:shorts` validates without booting, boots like the seeder, refuses local disk unless asked, prints the report plus a one-line summary, reads every film back through the facade, and exits non-zero on any failed film or missed read-back.

## Task Commits

1. **Task 1: End-to-end import of one approved film (tracer)** - `20cb7a3` (feat)
2. **Task 2 RED: failing mapping, idempotency and SSRF tests** - `3756ac7` (test)
3. **Task 2 GREEN: idempotent, lossless, SSRF-safe import** - `c005d19` (feat)
4. **Task 3: seed:shorts CLI** - `1133143` (feat)

No REFACTOR commit. **Plan metadata:** committed with this SUMMARY (docs: complete plan).

Tracer gate: interactive run, `end-of-phase` mode, automated-only `<verify>`: the tracer verify was re-run after the commit (1/1 boot test) and passed ("Tracer verified end-to-end, expanding"). No checkpoint was raised.

## TDD evidence (Task 2)

**RED** (`3756ac7`): the unit files and a rewritten boot suite were written against the Task 1 code.

- Unit: `Tests: 99 failed, 6 passed, 105 total`. The failures are `TypeError: (0 , media_upload_1.downloadImage) is not a function` (26), `youtubeThumbnailCandidates` (12), and `buildLocalizedData`, `collectAiDraftedFields`, `hasArabicIndicDigits`, `listSeedFileIssues`, `mapCountryNames`, `payloadDiffers` not being exported yet. The 6 passing cases are the Task 1 behaviours (schema parses the sample, the write-contract guard on `buildShortFilmData`).
- Boot (rebuilt dist): `Tests: 15 failed, 7 passed, 22 total`. Failures are assertion failures for the intended reasons: the posterless `sample-two` could not be published (`failed` non-empty), no `ar`/`en` rows, no retire, no orphans, no skip of unchanged films, no provider guard, no warnings. The passing ones are behaviours the tracer already delivered.
- Semantic assessment: the target tests executed and failed on the planned behaviour (or on the absent export), not on setup or fixtures. The repo has no `workflow.tdd_mode`, so `check tdd-red-evidence` was not run.

**GREEN** (`c005d19`): unit `106 passed` (63 + 43), boot `22 passed`. Full unit gate `Test Suites: 101 passed`, `Tests: 1681 passed` (was 94 / 1431 after 01-06 plus 01-07..01-09). `yarn workspace @tiween/admin lint` clean.

## Three-run boot output

`yarn workspace @tiween/admin jest --selectProjects server --testMatch='**/import-short-films.service.test.ts' --runInBand --verbose`, after `rm dist/src/index.js` and `build:test-dist` with the sentinel re-asserted:

```
importShortFilms: guards
  ✓ refuses the local upload provider unless it is explicitly allowed
  ✓ rejects an invalid data file with coded issues and writes nothing
importShortFilms: run 1 (first import)
  ✓ creates every approved film and reports the rest
  ✓ never imports an unapproved film
  ✓ publishes the film with its media, credits and links, readable through the facade
  ✓ serves the Arabic originalTitle as the ar title and replicates the poster id
  ✓ publishes a posterless film under the D-20 bypass and lists it
  ✓ uses the YouTube thumbnail as the backdrop, falling back from maxres to hq
  ✓ downloads each image once, from the sources the file names
  ✓ lists every ai-drafted translation field for owner review (D-13)
  ✓ deletes a retired short film in every locale
  ✓ reports a published short film in neither list as an orphan and leaves it alone
importShortFilms: run 2 (same file, idempotent)
  ✓ creates and updates nothing
  ✓ leaves every record count unchanged
  ✓ downloads and uploads nothing
  ✓ keeps each published row and its publishedAt (no default-sort churn)
importShortFilms: run 3 (one field changed, lossless update)
  ✓ updates only the changed film
  ✓ re-sends the full component arrays so nothing is lost
  ✓ does not touch the film that did not change
importShortFilms: run 4 (a translation changed)
  ✓ updates the film when only a translated title changed
importShortFilms: per-film failures and warnings
  ✓ records one failed film and still imports the rest
  ✓ imports a film whose images cannot be fetched and warns per image
Test Suites: 1 passed, 1 total
Tests:       22 passed, 22 total
```

| Run | File                                                                                                    | created                | updated    | unchanged              | other                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------- | ---------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | sample + `retiredSlugs: [retire-me]` (a pre-created `retire-me` with an `ar` row, and an `orphan-film`) | sample-one, sample-two | -          | -                      | skippedUnapproved sample-unapproved; retired retire-me; orphans orphan-film; posterBypassed sample-two; aiDraftedFields sample-two ar and en |
| 2   | same                                                                                                    | -                      | -          | sample-one, sample-two | counts and `publishedAt` identical                                                                                                           |
| 3   | sample-one duration 12 to 13                                                                            | -                      | sample-one | sample-two             | credits 2, cast 1, distinctions 1, videos 1, streaming links 1 intact                                                                        |
| 4   | sample-one en title edited                                                                              | -                      | sample-one | sample-two             | ar title still the Arabic originalTitle                                                                                                      |

## CLI check on a real boot

`NODE_ENV=test DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/cli-check.db tsx scripts/seeds/shorts.ts --file <sample> --allow-local-uploads --verify` (database removed afterwards):

```
Summary: created 2, updated 0, unchanged 0, retired 0, skipped-unapproved 1, orphans 0, poster-bypassed 2, ai-drafted 2, warnings 3, failed 0
  OK sample-one  fr=fr ar=translated poster=no backdrop=no publishedAt=2026-10-19T19:46:54.678Z
  OK sample-two  fr=fr ar=translated poster=no backdrop=no publishedAt=2026-10-19T19:46:55.384Z
  list total: 2 published short films
```

The three warnings are the real downloader getting `HTTP_ERROR` for the sample's invented URLs (so both films imported posterless under the bypass). The second run printed `unchanged 2` with the same `publishedAt` values. Without `--allow-local-uploads` it exited 1 with `UPLOAD_PROVIDER_NOT_IMAGEKIT`; with the flag and `NODE_ENV=production` it exited 1 before booting.

## Decisions Made

See `key-decisions` in the frontmatter. In short: publish per locale and only what changed; next-driven change detection; image failures are warnings; `original-title` provenance covers the title only; `dist` as the boot dir.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The copied seeder boot (`distDir: .build`) cannot start Strapi in this checkout**

- **Found during:** Task 3 (first real boot of the CLI)
- **Issue:** The plan says to copy `scripts/seeds/index.ts`'s boot. With `distDir: process.cwd() + "/.build"` Strapi read its config from a directory that does not exist and failed with `Cannot destructure property 'client' of 'db.config.connection' as it is undefined`.
- **Fix:** `seed:shorts` boots with `distDir: process.cwd() + "/dist"`, the directory `build:test-dist` emits, the one the plugins load from and the one `tests/helpers/strapi.ts` uses. Verified with a real boot, a re-run and `--verify`.
- **Files modified:** `apps/strapi/scripts/seeds/shorts.ts`
- **Verification:** the CLI check above.
- **Committed in:** `1133143`
- **Follow-up:** `index.ts` and `clear.ts` carry the same `.build` path and were left alone (out of scope, not verified to fail on a developer machine); recorded in `deferred-items.md`.

**2. [Rule 2 - Missing critical] Publish per locale instead of `locale: "*"`**

- **Found during:** Task 2 (designing the update path)
- **Issue:** Task 1 published with `locale: "*"`. For an update that republishes the default row too, which re-stamps `publishedAt` (spike A2) even when only a translation changed, and publishes an editor's unrelated draft in a locale the importer did not touch.
- **Fix:** the importer publishes the default row only when it changed or was never published, plus each translation row it wrote, one `publish` per locale, all inside the bypass scope when the film is posterless. Run 4 (translation-only edit) asserts the update.
- **Files modified:** `apps/strapi/scripts/seeds/shorts/import-short-films.ts`
- **Committed in:** `c005d19`

### Plan extensions and interpretations (not defects)

- Task 1 also uploads the poster (the plan text only names the backdrop): the sample's `sample-one` has a poster source and the D-19 guard blocks a publish without one, so the tracer could not pass otherwise.
- The Task 1 boot test was folded into run 1 when the boot suite was rewritten in the RED commit (one database means `sample-one` can only be "created" once).
- Fixture and test fixes in the GREEN commit: the unit test's id map lacked `sample-director-two`, and the whitespace test now expects paragraph breaks to survive (a synopsis is markdown).
- Added beyond the plan, all unit-tested: magic-byte signature check and svg refusal in the downloader, no credentials or custom port in an image URL, file-level checks (`DUPLICATE_SLUG`, `PERSON_NAME_CONFLICT`, `RETIRED_SLUG_IN_FILMS`), `UNKNOWN_KEY` for stray fields, `RETIRED_SLUG_NOT_SHORT_FILM` and `SLUG_BELONGS_TO_OTHER_WORK_TYPE` guards, an explicit refusal in the suite when the upload provider is not `local` (it must never push test images to ImageKit).
- Vimeo: there is no derivable thumbnail URL, so only YouTube links derive a backdrop; a Vimeo film must name `backdrop.sourceUrl`. The plan's "YouTube/Vimeo thumbnail candidate" is met for the allowlisted `i.vimeocdn.com` host only through that explicit field.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical) plus the interpretations above.
**Impact on plan:** No scope creep. The first is a boot path that cannot work; the second keeps the idempotency promise for translation-only edits.

## Issues Encountered

- Boot suites refuse to start when any `.ts` under `src/` is newer than `dist/`; this plan changed nothing under `src/`, but dist was still rebuilt (sentinel deleted, `build:test-dist`, sentinel re-asserted) before each boot run.
- `apps/strapi/.env` was neither read nor staged (the secret guard blocked a probe for ImageKit variable names; the suite instead asserts at runtime that the provider is `local`).
- Pre-commit hooks (turbo lint) take about 45 s per commit; lint-staged rewrote import order and formatting in the committed files. No `--no-verify`.

## User Setup Required

None - no external service configuration required. The production run needs ImageKit credentials, which is the Phase 6 operator step.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-01-30 mitigated (https only, exact allowlist, IP literals, manual re-vetted redirects capped at 3, image content-type plus signature, 10 MB streaming cap, 15 s timeout; 43 unit tests). T-01-31 mitigated (`assertUploadProvider` in both the importer and the CLI; `--allow-local-uploads` refused in production, checked by hand on a real boot). T-01-32 mitigated (`stripHtml` on every synopsis, covered including script content and an unclosed tag). T-01-33 mitigated (retire deletes only a short film whose slug is listed; a retired slug that is another work type is a warning; orphans only reported). T-01-34 mitigated (Arabic-Indic digits rejected at validation). T-01-35 mitigated (bypass only around posterless publishes, skip limited to POSTER_REQUIRED by 01-06, each film in `posterBypassed`, each use logged by the guard). T-01-SC: no dependency added, lockfile untouched.

## Next Phase Readiness

- **01-11 (curated data file):** write `scripts/seeds/data/short-films.json` to `shortFilmSeedFileSchema`; run `seed:shorts --dry-run` first. Person slugs must be unique and keep one name across the file. A Vimeo film needs an explicit `backdrop.sourceUrl`. Use `mapCountryNames` to turn the mock's free-text countries into codes.
- **01-12 (owner approval):** `aiDraftedFields` in the report is the owner's Arabic/English review list; flip `approved` per film.
- **01-13 (dev run):** build first (`build:test-dist`), set the target database variables, pass `--allow-local-uploads` only when ImageKit is not configured, add owner-approved poster hosts to `mediaHosts`, and record every `BACKDROP_UNAVAILABLE` / `POSTER_UNAVAILABLE` warning for follow-up (the assumption flagged in the plan).
- Carry-forward: genres have no `ar`/`en` rows (see `deferred-items.md`); `index.ts`/`clear.ts` boot path is unverified; Postgres behaviour of the import is unverified (this plan ran on SQLite only).

## Self-Check: PASSED

- FOUND: apps/strapi/scripts/seeds/utils/short-film-import.ts
- FOUND: apps/strapi/scripts/seeds/utils/media-upload.ts
- FOUND: apps/strapi/scripts/seeds/shorts/import-short-films.ts
- FOUND: apps/strapi/scripts/seeds/shorts.ts
- FOUND: apps/strapi/scripts/seeds/shorts/**fixtures**/short-films.sample.json
- FOUND: apps/strapi/scripts/seeds/utils/short-film-import.unit.test.ts
- FOUND: apps/strapi/scripts/seeds/utils/media-upload.unit.test.ts
- FOUND: apps/strapi/scripts/seeds/shorts/import-short-films.service.test.ts
- FOUND commits 20cb7a3, 3756ac7, c005d19, 1133143

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-19_
