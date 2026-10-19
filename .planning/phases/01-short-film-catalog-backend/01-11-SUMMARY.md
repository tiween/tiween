---
phase: 01-short-film-catalog-backend
plan: 11
subsystem: seed-data
tags: [curation, seed, short-film, catalog, data-quality, d-15, d-16, d-23]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-10 shortFilmSeedFileSchema, listSeedFileIssues, DEFAULT_MEDIA_HOSTS and the seed:shorts --dry-run validator this data file is written against"
provides:
  - "01-CURATION-SHEET.md: the owner-reviewable D-15 sheet covering all 10 mock films, with sourced facts, D-16 verdicts, D-19 readiness, translation provenance, recommendations, counts and owner questions"
  - "apps/strapi/scripts/seeds/data/short-films.json: the launch data file, 5 retiredSlugs and 8 unapproved entries (approved: false), valid under seed:shorts --dry-run"
  - "short-films-data.unit.test.ts: a 13-test data-quality gate on the real catalog file that stays valid when plans 01-12/01-13 add and approve entries"
affects: [01-12, 01-13, phase-06-launch]

actuals:
  tokens: 16200
  tasks: 2
  commits: 2

plan_head_before: b37ee70621ad12ec865448313ea3cd6cf1e9c21e
plan_head_after: 9047ce87a46c40c3ba6a08d782375e8d1ee3fa8f

tech-stack:
  added: []
  patterns:
    - "Channel ownership is read from YouTube's own page data (ownerChannelName, lengthSeconds, isUnlisted, description), never inferred from a video title, so an unofficial re-upload is caught before it becomes a streaming link"
    - "An unverifiable fact is left out of the data file (year, Arabic title, synopsis, director) and the film is flagged on the sheet; only sourced facts enter the file"
    - "The data test asserts catalog quality but never the approved flag, so it holds before and after the owner approval flips entries"

key-files:
  created:
    - .planning/phases/01-short-film-catalog-backend/01-CURATION-SHEET.md
    - apps/strapi/scripts/seeds/data/short-films.json
    - apps/strapi/scripts/seeds/utils/short-films-data.unit.test.ts
  modified: []

key-decisions:
  - "le-masseur and tahtima are needs-owner-input and stay out of the data file: their only copies are third-party YouTube uploads (D-16 forbids a re-upload as a streaming link), and no trailer exists for the festival-only route; tahtima also has no verifiable director"
  - "chrifa-bent-el-fadhel credits Kheyri Habboubi, from the producer's own video description and channel About page; it is a single-source credit, so the owner is asked to confirm it"
  - "Posters: none of the 10 films has a real 2:3 poster; all eight included films are posterless and rely on the D-20 bypass, with YouTube backdrops derived by the importer (no explicit backdrop in the file, so maxres falls back to hq)"
  - "Watch links use streamingLinks only (videos left empty) so the film has one source of truth for where to watch"
  - "Unverified fields are omitted rather than carried from the mock: releaseYear of flashback and chrifa, the Arabic original title of comme-un-fils, the synopses of petit-frere, comme-un-fils and chrifa"
  - "les-souliers-de-laid carries accessType subscription as the conservative value because Artify requires a login and free vs paid could not be checked; flagged for the owner"

patterns-established:
  - "Curation sheet row = one line per film starting with | slug |, so the sheet is greppable and plan 01-12 appends rows the same way"
  - "Mock-catalog errors are listed in a dedicated section of the sheet so the owner sees what was corrected and why"

requirements-completed: []

coverage:
  - id: D1
    description: "The curation sheet lists all 10 mock films with the D-15 columns, D-16 verdict, D-19 readiness, translation provenance, recommendation and a source URL per fact, plus counts, mock-error corrections and owner questions"
    requirement: SDATA-04
    verification:
      - kind: other
        ref: "grep -cE '\\| (khalaa|le-masseur|petit-frere|les-souliers-de-laid|comme-un-fils|brotherhood|ordure|flashback|chrifa-bent-el-fadhel|tahtima) \\|' 01-CURATION-SHEET.md prints 10"
        status: pass
    human_judgment: true
    rationale: "The facts, the official-channel judgments and the recommendations are for the owner to approve at the plan 01-12 checkpoint (D-15); automation cannot judge whether a channel or platform is official enough"
  - id: D2
    description: "short-films.json holds 8 unapproved entries and the 5 retired dev slugs and passes the importer schema with no coded issue"
    requirement: SDATA-04
    verification:
      - kind: other
        ref: "yarn workspace @tiween/admin seed:shorts --dry-run --file scripts/seeds/data/short-films.json -> OK 8 films parsed (0 approved, 8 unapproved)"
        status: pass
      - kind: unit
        ref: "apps/strapi/scripts/seeds/utils/short-films-data.unit.test.ts#passes the importer schema with no coded issue"
        status: pass
    human_judgment: false
  - id: D3
    description: "The data-quality gate checks the real file: unique slugs disjoint from retired ones, an https source per film, duration at most 45, official-online needs a streaming link, festival-trailer-only needs a distinction and a trailer, every distinction sourced, no organisation as director, platform hosts match, Western digits, image hosts allowed"
    requirement: SDATA-04
    verification:
      - kind: unit
        ref: "apps/strapi/scripts/seeds/utils/short-films-data.unit.test.ts (13 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both D-23 mock films are resolved: chrifa-bent-el-fadhel credits a person as director, tahtima is flagged needs-owner-input and is not importable"
    requirement: SDATA-04
    verification:
      - kind: unit
        ref: "short-films-data.unit.test.ts#never credits an organisation as director (mutation-checked: a KDH Prod director fails it)"
        status: pass
    human_judgment: true
    rationale: "Whether a single-source director credit from the producer's own channel is enough, and what to do with tahtima, are owner decisions"

duration: 28min
completed: 2026-10-19
status: complete
---

# Phase 1 Plan 11: Mock-Film Curation Summary

**Source-checked D-15 curation sheet for the 10 mock films, an 8-entry unapproved importer data file (le-masseur and tahtima held for the owner), and a 13-test data-quality gate, with every mock error found by checking YouTube channel ownership and press sources.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-10-19T20:14:00Z (approx)
- **Completed:** 2026-10-19T20:42:00Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments

- A curation sheet covering all 10 mock films: each fact has a source URL, each film a D-16 verdict, D-19 readiness, translation provenance and a recommendation, with counts, a "differences from the mock" section and six owner questions.
- A valid data file: 8 films recommended for inclusion (all `approved: false`) and the 5 fake dev slugs in `retiredSlugs`; `seed:shorts --dry-run` reports "8 films parsed (0 approved, 8 unapproved)".
- A data-quality test on the real file (13 tests); the full `@tiween/admin` suite still passes (105 suites, 1724 tests).
- The research caught several wrong mock facts that would otherwise have gone public (see below).

## Mock-film recommendations

| Slug                  | Recommendation    | Why                                                                                                            |
| --------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| khalaa                | include           | Director's own channel; four sourced wins the mock missed. Unlisted video, confirm with the director           |
| le-masseur            | needs owner input | Only a third-party upload exists (no official link, no trailer); everything else confirmed                     |
| petit-frere           | include           | Director's own channel. Unlisted video, confirm with the director                                              |
| les-souliers-de-laid  | include           | On Artify (licensed platform); FESPACO Poulain d'Or and four other results. Access type to confirm             |
| comme-un-fils         | include           | Director's own channel; year corrected to 2013                                                                 |
| brotherhood           | include           | Short of the Week channel; confirm it counts as a licensed platform. TIFF and Prix Iris wins, Oscar nomination |
| ordure                | include           | Producer's channel (founded by the director); year corrected to 2006                                           |
| flashback             | include           | Director's own channel; single source, year dropped                                                            |
| chrifa-bent-el-fadhel | include           | Producer's channel; director fixed (below)                                                                     |
| tahtima               | needs owner input | No verifiable director, only a third-party upload                                                              |

## D-23 outcomes

- **chrifa-bent-el-fadhel:** the mock named the company KDH Prod. The producer's own video description says "DIRECTED BY : KHEYRI HABBOUBI" and the channel About page says "Director : kheyri habboubi", so the entry credits **Kheyri Habboubi**. It is a single-source credit (no press or database entry found), flagged for the owner.
- **tahtima:** no director is named anywhere (the description credits cast, camera and editing only), and the only upload is on a third-party channel. It is **needs owner input**, not in the data file and not importable. Nothing was invented.

## Task Commits

1. **Task 1 (tracer): khalaa end to end** - `4220e54` (feat)
2. **Task 2: other nine mock films, both D-23 films** - `9047ce8` (feat)

**Plan metadata:** committed separately (docs: complete plan).

## Files Created/Modified

- `.planning/phases/01-short-film-catalog-backend/01-CURATION-SHEET.md` - the D-15 sheet, counts, mock corrections, owner questions
- `apps/strapi/scripts/seeds/data/short-films.json` - launch data file (5 retired slugs, 8 unapproved films)
- `apps/strapi/scripts/seeds/utils/short-films-data.unit.test.ts` - data-quality gate for the real file

## Decisions Made

See `key-decisions` above. In short: hold le-masseur and tahtima for the owner; credit Kheyri Habboubi for chrifa; all eight included films are posterless (D-20 bypass); unverified fields are omitted, not carried from the mock; streamingLinks is the single watch source.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] cinematunisien source URLs were http**

- **Found during:** Task 1 (data file)
- **Issue:** the importer schema only accepts https URLs; the first drafted sources were `http://cinematunisien.com/...`
- **Fix:** switched to the https `/blog/...` canonical URLs, confirmed to resolve
- **Files modified:** apps/strapi/scripts/seeds/data/short-films.json
- **Verification:** dry-run and data test pass
- **Committed in:** 4220e54

**2. [Rule 3 - Blocking] Commit body line too long for commitlint**

- **Found during:** Task 1 commit
- **Issue:** a body line exceeded 100 characters, the commit-msg hook refused it
- **Fix:** shortened the body and committed again (hooks were not bypassed)
- **Committed in:** 4220e54

### Execution notes (not code deviations)

- The runtime had no web-search or page-fetch tool, so research ran through `curl` (YouTube page data and oEmbed, press and database pages, and a search engine). The search engine rate-limited the run partway through, so the festival searches for ordure, flashback and chrifa-bent-el-fadhel were limited to the pages already fetched; the sheet states this. The per-film research budget was respected in spirit (targeted fetches, no whole-site crawling) but not counted strictly, because a scripted YouTube data read replaced several manual fetches.
- Posters: no distributor or director page with a 2:3 poster was reachable within the budget, so no poster was recorded (a real poster for brotherhood exists but is not on an allowed source).

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** none on scope. Both fixes were in the same task.

## Issues Encountered

- The mock's Vimeo link for les-souliers-de-laid points to a different film ("Faracha"), and its artify.tn image and watch URLs are dead. All were dropped.
- The mock catalog's awards were largely unverified: the brotherhood "Sundance jury award, won" claim was not found and was not imported.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. The data file and sheet contain no placeholder text. Films without a verified synopsis have none by design (the field is optional), not as a stub.

## Next Phase Readiness

- Plan 01-12 can append a capped batch of new candidates to the sheet and data file using the same row format, then stop at the blocking owner-approval checkpoint. The sheet's "Questions for the owner" section (unlisted videos, Short of the Week, Artify access, single-source credits, the two held films, posterless launch) should be put to the owner there.
- Plan 01-13 imports only what the owner approves; nothing is approved or imported yet.
- SDATA-04 is not marked complete: it spans plans 01-12 and 01-13.

## Self-Check: PASSED

- Files exist: 01-CURATION-SHEET.md, short-films.json, short-films-data.unit.test.ts
- Commits `4220e54` and `9047ce8` are reachable from HEAD
- `seed:shorts --dry-run`, the data test (13/13) and the full admin suite (1724/1724) pass

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-19_
