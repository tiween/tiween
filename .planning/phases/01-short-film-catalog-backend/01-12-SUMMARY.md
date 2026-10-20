---
phase: 01-short-film-catalog-backend
plan: 12
subsystem: seed-data
tags:
  [curation, seed, short-film, catalog, owner-approval, d-14, d-15, d-16, d-23]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-11 curation sheet, unapproved data file and the short-films-data.unit.test.ts data-quality gate"
provides:
  - "01-CURATION-SHEET.md covering 18 films (10 mock, 8 new candidates) with final counts, leads list, media hosts and owner questions"
  - "short-films.json with 13 recommended films, all approved: false, valid under seed:shorts --dry-run"
  - "Recorded owner decision (approve-all, 13 slugs) that plan 01-13 consumes to flip approved flags"
affects: [01-13, phase-06-launch]

actuals:
  tokens: 29560
  tasks: 3
  commits: 2

plan_head_before: 04a4fcf510207b08d7877b7d941a5763a76c32eb
plan_head_after: fa7ba6a0ab888e44c17557e1427cd9fc5c511d08

tech-stack:
  added: []
  patterns:
    - "Capped research batch: 8 new candidates, unresearched leads listed by title and URL only, never in the data file"
    - "Blocking owner checkpoint records the approved slug list in the SUMMARY; the approved flags are flipped by the next plan, not this one"

key-files:
  created: []
  modified:
    - .planning/phases/01-short-film-catalog-backend/01-CURATION-SHEET.md
    - apps/strapi/scripts/seeds/data/short-films.json

key-decisions:
  - "Owner chose approve-all on 2026-10-20: exactly the 13 films recommended include are approved for import"
  - "No extra media host: mediaHosts stays [] and the importer defaults are the only allowed image hosts"
  - "The 13 open owner questions are accepted as presented; they are carried forward to 01-13's owner review list"

patterns-established:
  - "Only the slugs recorded under ## Owner approval may be set to approved: true by 01-13"

requirements-completed: [] # SDATA-04 spans 01-12 and 01-13; it is marked complete when 01-13 finishes the import

coverage:
  - id: D1
    description: "Curation sheet covers the 10 mock films and 8 new candidates with sources, D-16 verdicts, D-19 readiness, recommendations, counts and a leads section"
    requirement: SDATA-04
    verification:
      - kind: unit
        ref: "yarn workspace @tiween/admin jest scripts/seeds/utils/short-films-data.unit.test.ts"
        status: pass
    human_judgment: true
    rationale: "Accuracy of researched facts and eligibility calls is judged by the owner, which the approve-all decision records"
  - id: D2
    description: "Data file holds the 13 recommended films, all approved: false, valid under the importer schema"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "yarn workspace @tiween/admin seed:shorts --dry-run --file scripts/seeds/data/short-films.json (OK 13 films parsed, 0 approved, 13 unapproved)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Owner approval recorded (date, option, slug list, media hosts, notes) before any import"
    requirement: SDATA-04
    verification: []
    human_judgment: true
    rationale: "The decision itself is a human act; the record is the ## Owner approval section below"

duration: ~2 days elapsed across the checkpoint (research and batch 2026-10-19, owner decision 2026-10-20)
completed: 2026-10-20
status: complete
---

# Phase 1 Plan 12: New-Candidate Curation and Owner Approval Summary

**Sourced curation sheet of 18 films (10 mock plus 8 researched new candidates), a valid 13-film unapproved data file, and the owner's recorded approve-all decision that unlocks the import in plan 01-13.**

## Performance

- **Duration:** about 2 days elapsed (the blocking owner checkpoint sat between Task 2 and Task 3)
- **Completed:** 2026-10-20
- **Tasks:** 3 (1 tracer, 1 auto, 1 blocking-human decision)
- **Files modified:** 2

## Accomplishments

- Tracer: bord-a-bord researched end to end (sheet row, leads section, data entry, data test and dry-run green) before the batch was expanded.
- Batch of 8 new candidates researched under the D-16 budget: 5 recommended include (bord-a-bord, let-go, faracha, action-figuration, abderrahman), 2 needs owner input (les-derniers-jours-avec-eliane, miel-amer), 1 excluded (un-retour, 60 minutes).
- Sheet counts finalized for the whole sheet: 18 films, 13 include, 4 needs owner input (le-masseur, tahtima, les-derniers-jours-avec-eliane, miel-amer), 1 excluded, 0 with a real 2:3 poster, 13 posterless.
- 10 unverified leads recorded under `## Leads for later curation` without research (30-50 films is the Phase 6 gate, D-14).
- Owner approved every "include" film at the blocking checkpoint; the decision is recorded below.

## Task Commits

1. **Task 1 (tracer): One new candidate end to end (bord-a-bord)** - `dd62423` (feat)
2. **Task 2: Capped batch of 8 new candidates, sheet counts, leads, owner questions** - `fa7ba6a` (feat)
3. **Task 3: Owner approval checkpoint** - no code commit; recorded in this SUMMARY (see `## Owner approval`)

**Plan metadata:** the docs commit that adds this SUMMARY (docs: complete plan)

## Owner approval

- **Date:** 2026-10-20
- **Decision option:** `approve-all` (every film recommended "include" on the sheet)
- **Approved slugs (13):** khalaa, petit-frere, les-souliers-de-laid, comme-un-fils, brotherhood, ordure, flashback, chrifa-bent-el-fadhel, bord-a-bord, let-go, faracha, action-figuration, abderrahman
- **Not approved, stay out of the data file (5):** le-masseur, tahtima, les-derniers-jours-avec-eliane, miel-amer (all need owner input, unresolved), un-retour (excluded, 60 minutes)
- **Confirmed media hosts:** none beyond the importer defaults (`i.ytimg.com`, `img.youtube.com`, `i.vimeocdn.com`, `artify.tn`, `www.artify.tn`); `mediaHosts` stays `[]`
- **Owner notes:** none given
- **Open questions:** the owner did not answer the 13 "Questions for the owner" individually. They are recorded as **accepted as presented** by the approve-all decision, and stay listed here so plan 01-13's owner review list carries them forward:
  1. khalaa and petit-frere are unlisted YouTube videos on the directors' own channels: linked publicly as presented.
  2. brotherhood: Short of the Week treated as presented on the sheet (trailer-only route if it is not a licensed platform).
  3. les-souliers-de-laid: Artify access recorded as `subscription`.
  4. chrifa-bent-el-fadhel and flashback rest on a single source (the producer's or director's own channel): kept.
  5. le-masseur and tahtima: still lack an official link (and, for tahtima, a verifiable director); they remain out of the data file.
  6. No film has a real 2:3 poster; all 13 are imported posterless through the logged D-20 bypass and covered by the client fallback image.
  7. bord-a-bord, let-go, action-figuration, abderrahman have no full film online and take the festival-trailer-only route: accepted as launch records.
  8. action-figuration: both distinctions (Alexandria 2015 win, Malmö 2015 selection) rest on one database page: kept as presented.
  9. faracha: the channel is credited to the director by its handle only: accepted as presented.
  10. abderrahman: the Tunisian link is inferred from the JCC national competition: accepted as presented.
  11. les-derniers-jours-avec-eliane: runtime still unknown; stays out of the data file.
  12. miel-amer: still no source for its JCC 2014 section or an official link; stays out. un-retour stays excluded for its 60-minute runtime.
  13. Spoken-language codes for let-go (`fr`), action-figuration, abderrahman and bord-a-bord (`aeb`) are inferred: to be reviewed in the admin.
- **AI-drafted translations:** AR and EN titles and synopses (translationProvenance `ai-drafted`, or `original-title` where the Arabic-script original title is used) are accepted as presented; the owner reviews the Arabic in the admin after the import.
- **No `approved: true` is set in `short-films.json` by this plan.** Plan 01-13 flips exactly the 13 slugs above and imports to the dev database only.

## Files Created/Modified

- `.planning/phases/01-short-film-catalog-backend/01-CURATION-SHEET.md` - 18-row sheet, final counts, leads, media hosts, owner questions
- `apps/strapi/scripts/seeds/data/short-films.json` - 13 unapproved entries (8 from 01-11, 5 new), `retiredSlugs` unchanged at 5, `mediaHosts` `[]`

## Decisions Made

- Owner approved all 13 "include" films (approve-all) on 2026-10-20; the five other slugs stay out of the data file.
- No additional image hosts: the SSRF allowlist stays at the importer defaults.
- Unanswered owner questions are treated as accepted-as-presented and carried into 01-13's review list rather than blocking the import.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Verified on resume: commits `dd62423` and `fa7ba6a` are on `main`; the data file has 13 films, none approved; `seed:shorts --dry-run` prints "OK 13 films parsed (0 approved, 13 unapproved)".

## Known Stubs

None. No UI-rendered stubs were introduced. The 13 films are intentionally posterless (D-20 bypass); this is a recorded owner-accepted state, not a stub.

## Threat Flags

None. No new network endpoint, auth path or trust-boundary schema change; T-01-44, T-01-45 and T-01-46 mitigations held (sourced facts only, official channels only, owner decision recorded and `approved` still false).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-13 can run: flip `approved: true` for exactly the 13 slugs under `## Owner approval`, import to the dev database only (the production import is Phase 6), and keep the open-question list above for the owner review.
- SDATA-04 stays pending until 01-13 completes the import.

---

_Phase: 01-short-film-catalog-backend_
_Completed: 2026-10-20_

## Self-Check: PASSED

- Commits dd62423 and fa7ba6a exist on main and descend from 04a4fcf.
- The sheet and data file exist; the data file has 13 films and no `approved: true`.
