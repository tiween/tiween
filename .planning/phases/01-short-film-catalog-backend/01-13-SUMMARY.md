---
phase: 01-short-film-catalog-backend
plan: 13
subsystem: seed-data
tags:
  [
    seed,
    short-film,
    imagekit,
    import,
    idempotency,
    d-11,
    d-14,
    d-20,
    sdata-04,
    fr57,
  ]

requires:
  - phase: 01-short-film-catalog-backend
    provides: "01-10 seed:shorts importer, 01-12 curation sheet and recorded owner approval"
provides:
  - "13 owner-approved short films published on the dev database with genres, credits, cast, distinctions, streaming links and ImageKit backdrops, read back in fr and ar through the public facade"
  - "Idempotency proof: a second seed:shorts --verify run creates and updates nothing, totals and publishedAt identical"
  - "Import results section in the curation sheet (posterless films, AI-drafted Arabic review list, D-14 status)"
affects: [phase-02, phase-06-launch]

actuals:
  tokens: 4500
  tasks: 2
  commits: 2

plan_head_before: eab2b1061dd873afa7a2b0ceb7cd2d0897db11ae
plan_head_after: 05f0baf70e1474607490a9b630935abe484ee47c

tech-stack:
  added: []
  patterns:
    - "Launch import runs twice with --verify; the second run must report created [] / updated [] and identical publishedAt"

key-files:
  created: []
  modified:
    - apps/strapi/scripts/seeds/data/short-films.json
    - .planning/phases/01-short-film-catalog-backend/01-CURATION-SHEET.md
    - .planning/phases/01-short-film-catalog-backend/deferred-items.md

key-decisions:
  - "Flipped approved: true on exactly the 13 slugs in 01-12-SUMMARY.md Owner approval; no other data changes"
  - "Import ran against the local compose Postgres (tiween-db-1) only; production import stays a Phase 6 operator step"
  - "les-souliers-de-laid stays imported without a backdrop or poster (no image sourced); listed for the owner instead of hotlinking"

requirements-completed: [SDATA-04, FR57]

coverage:
  - id: D1
    description: "13 owner-approved films imported as published short films on dev Postgres with ImageKit backdrops, readable in fr and ar through the public facade"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "yarn workspace @tiween/admin seed:shorts --verify (run 1: created 5, updated 7, unchanged 1, failed 0; 13 OK verify lines; list total 13)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Second import run is a no-op (created 0, updated 0, unchanged 13, identical publishedAt and total)"
    requirement: SDATA-04
    verification:
      - kind: integration
        ref: "yarn workspace @tiween/admin seed:shorts --verify (run 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Backdrops delivered from the ImageKit URL endpoint host (FR57, dev account)"
    requirement: FR57
    verification:
      - kind: integration
        ref: "psql files table: 12 rows, all on ik.imagekit.io under /tiween/development/short-films/backdrops/"
        status: pass
    human_judgment: false
  - id: D4
    description: "Owner Arabic review of the AI-drafted titles and synopses"
    requirement: SDATA-04
    verification: []
    human_judgment: true
    rationale: "Arabic copy quality is judged by the owner in the admin AR tab; non-blocking for Phase 2"

duration: ~25 min (this continuation; the earlier attempt halted at a human-action checkpoint)
completed: 2026-10-24
status: complete
---

# Phase 1 Plan 13: Launch Catalog Import and Idempotency Proof Summary

**The 13 owner-approved short films are published on the dev database with ImageKit backdrops and read back in fr and ar through the public facade, and a second `seed:shorts --verify` run changed nothing.**

## Performance

- **Duration:** about 25 min in this continuation (first attempt halted 2026-10-20 at a human-action checkpoint)
- **Completed:** 2026-10-24
- **Tasks:** 2 (1 tracer, 1 auto)
- **Files modified:** 3

## Accomplishments

- Tracer: `approved: true` set on exactly the 13 slugs of the Owner approval list (acceptance one-liner prints the identical sorted list), then imported end to end on dev Postgres and ImageKit with 0 failures.
- 12 backdrops uploaded to ImageKit (`ik.imagekit.io`, folder `/tiween/development/short-films/backdrops/`); `files` table went from 0 to 12 rows. les-souliers-de-laid has no sourced image and was correctly left unchanged with a `BACKDROP_UNAVAILABLE (NO_SOURCE)` warning.
- Idempotency proven (D-11): run 2 created 0, updated 0, unchanged 13, list total 13, every publishedAt identical to run 1.
- Curation sheet gained `## Import results (2026-10-24, dev)` with posterless films, AI-drafted AR/EN fields per slug, and the D-14 status line.

## Task Commits

1. **Task 1: approve the 13 films and run the import** - `ff1b447` (feat)
2. **Task 2: second run and Import results** - `05f0baf` (docs)

**Plan metadata:** the docs commit that adds this SUMMARY.

## Import run 1

Command: `yarn workspace @tiween/admin seed:shorts --verify` (exit 0, 83 s, local compose DB tiween-db-1, ImageKit provider). The `aiDraftedFields` array (24 entries) is listed per slug in the curation sheet and omitted here.

```
Summary: created 5, updated 7, unchanged 1, retired 0, skipped-unapproved 0, orphans 0, poster-bypassed 12, ai-drafted 24, warnings 1, failed 0
{
  "created": ["bord-a-bord", "let-go", "faracha", "action-figuration", "abderrahman"],
  "updated": ["khalaa", "petit-frere", "comme-un-fils", "brotherhood", "ordure", "flashback", "chrifa-bent-el-fadhel"],
  "unchanged": ["les-souliers-de-laid"],
  "skippedUnapproved": [], "retired": [], "orphans": [],
  "posterBypassed": ["khalaa", "petit-frere", "comme-un-fils", "brotherhood", "ordure", "flashback",
                     "chrifa-bent-el-fadhel", "bord-a-bord", "let-go", "faracha", "action-figuration", "abderrahman"],
  "failed": [],
  "warnings": ["les-souliers-de-laid: BACKDROP_UNAVAILABLE (NO_SOURCE)"]
}
Verification (public facade):
  OK khalaa  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:35:48.477Z
  OK petit-frere  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:35:51.464Z
  OK les-souliers-de-laid  fr=fr ar=translated poster=no backdrop=no publishedAt=2026-10-20T09:34:50.548Z
  OK comme-un-fils  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:35:54.496Z
  OK brotherhood  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:35:57.943Z
  OK ordure  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:01.236Z
  OK flashback  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:04.044Z
  OK chrifa-bent-el-fadhel  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:06.751Z
  OK bord-a-bord  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:11.463Z
  OK let-go  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:16.976Z
  OK faracha  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:23.287Z
  OK action-figuration  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:30.767Z
  OK abderrahman  fr=fr ar=translated poster=no backdrop=yes publishedAt=2026-10-24T21:36:38.078Z
  list total: 13 published short films
```

ImageKit spot check (DB `files` table, no secrets): 12 rows, all hosted on `ik.imagekit.io`, e.g. `https://ik.imagekit.io/<account>/tiween/development/short-films/backdrops/khalaa_backdrop_9a1ef12811.jpg` and the `petit_frere_backdrop_...jpg` sibling. The run log shows 57 "ImageKit file stored" lines (originals plus derived formats) and no upload errors.

## Import run 2

Same command, same file (exit 0).

```
Summary: created 0, updated 0, unchanged 13, retired 0, skipped-unapproved 0, orphans 0, poster-bypassed 0, ai-drafted 24, warnings 1, failed 0
created: []   updated: []   failed: []
  list total: 13 published short films
```

All 13 verify lines are OK and every `publishedAt` is byte-identical to run 1 (for example khalaa 2026-10-24T21:35:48.477Z, abderrahman 2026-10-24T21:36:38.078Z, les-souliers-de-laid 2026-10-20T09:34:50.548Z). Totals are identical (13). No duplicates, so 01-10's skip-if-unchanged path holds (D-11, T-01-43 satisfied).

## Human-check status

Owner Arabic review of the AI-drafted titles and synopses (Events Manager, Works, AR tab): **pending**, non-blocking for Phase 2. The per-slug list is under `## Import results (2026-10-24, dev)` in `01-CURATION-SHEET.md`. Record "reviewed" or the corrected slugs here when done.

## Owner follow-ups

- Posterless: all 13 films (D-20 bypass logged for 12 this run; les-souliers-de-laid was published bypassed earlier). The client placeholder covers them.
- No backdrop: les-souliers-de-laid (no image sourced). Add one in the admin or source one and re-run.
- Inferred spoken-language codes for let-go, action-figuration, abderrahman and bord-a-bord to check in the admin.

## Deviations from Plan

None to the plan's tasks: data flags, dry run, import, verify, second run and sheet section were executed as written. Environment issues that interrupted the first attempt are recorded below.

## Issues Encountered

- **ImageKit uploads rejected (root cause: read-only restricted API key).** On 2026-10-20 every upload returned HTTP 500 `{"help":"Internal Server Error"}`; `files` stayed at 0 rows, 12 films landed in `failed` and the importer logged "unobserved rejection" lines (logs: the scratchpad `run1.log` and `run1b.log` of the earlier attempt). Before that, two attempts failed with `UPLOAD_PROVIDER_NOT_IMAGEKIT` because the keys were only in the repo-root `.env`; the owner moved them to `apps/strapi/.env`. The 500 was traced with the owner to the rotated ImageKit key being a restricted key with Media management = Read only. The owner switched it to Read and write on 2026-10-24 and the first run after that succeeded with no code or data change. No unobserved-rejection or PromiseRejectionHandledWarning lines appeared on the successful runs.
- **Admin jest timeouts.** `yarn workspace @tiween/admin test`: 1719 passed, 27 failed in 9 jsdom admin UI suites, all `Exceeded timeout of 5000/30000 ms`. Every seeds and short-films server suite passes (short-films-data, short-film-import, media-upload, creative-work-relations, creative-works short-films service/validation/routes/rate-limit). CodeMultiPicker passed on re-run. This plan changed only seed data flags and planning docs, so the failures are load or environment timeouts; logged in `deferred-items.md`, not fixed.

## Known Stubs

None. (The posterless and backdrop-less records are intentional, owner-accepted data states, not code stubs.)

## Threat Flags

None. Threat mitigations held: DB was the local compose Postgres (T-01-40), no secret values were printed or committed (T-01-41), only approved slugs were flagged (T-01-42), and run 2 was a no-op (T-01-43).

## Self-Check: PASSED

- `ff1b447` and `05f0baf` are ancestors of HEAD; the data file, curation sheet and deferred-items changes are committed.
- Acceptance one-liner prints exactly the 13 approved slugs; `grep -c "## Import results"` on the sheet prints 1 and the section contains the D-14 line.
- Run 1: failed [], 13 OK verify lines, ImageKit host confirmed. Run 2: created [] and updated [].
