---
gsd_state_version: "1.0"
milestone: v1.0
milestone_name: Shorts Directory
current_phase: 01
current_phase_name: Short-Film Catalog Backend
status: executing
stopped_at: Completed 01-12-PLAN.md
last_updated: "2026-10-20T07:32:50.209Z"
last_activity: 2026-10-19
last_activity_desc: Phase 01 execution started
state_head: c77bb70e9cd5ed0f9e41a3899599e8b09d6c8238
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 14
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-18)

**Core value:** People in Tunisia can find what is happening and what to watch across film, theatre, shorts, concerts and exhibitions, in their own language, on their phone.
**Current focus:** Phase 01 — Short-Film Catalog Backend

## Current Position

Phase: 01 (Short-Film Catalog Backend) — EXECUTING
Plan: 13 of 14
Status: Ready to execute
Last activity: 2026-10-19 — Phase 01 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| -     | -     | -     | -        |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: n/a

_Updated after each plan completion_
**Per-Plan Metrics:**

| Plan         | Duration                 | Tasks   | Files    |
| ------------ | ------------------------ | ------- | -------- |
| Phase 01 P01 | 22 min                   | 2 tasks | 1 files  |
| Phase 01 P02 | 20 min                   | 2 tasks | 10 files |
| Phase 01 P07 | 17 min                   | 2 tasks | 9 files  |
| Phase 01 P14 | 12 min                   | 2 tasks | 6 files  |
| Phase 01 P03 | 28 min                   | 3 tasks | 12 files |
| Phase 01 P06 | 36 min                   | 2 tasks | 12 files |
| Phase 01 P08 | 25 min                   | 2 tasks | 10 files |
| Phase 01 P04 | 15 min                   | 2 tasks | 8 files  |
| Phase 01 P09 | 64min                    | 2 tasks | 12 files |
| Phase 01 P10 | 30 min                   | 3 tasks | 9 files  |
| Phase 01 P05 | 14 min                   | 3 tasks | 12 files |
| Phase 01 P11 | 28 min                   | 2 tasks | 3 files  |
| Phase 01 P12 | 2 days (checkpoint wait) | 3 tasks | 2 files  |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md (Locked Decisions and Key Decisions table). Recent:

- [Milestone]: v1.0 is shorts-first; the rest of the synthesized v1 set is parked as 999.x backlog (owner, 2026-10-18)
- [Search]: Meilisearch replaces Algolia; Algolia never had an indexer, so removing it regresses nothing
- [Brand]: Gold Leaf x Aubergine on shorts surfaces only, via an additive scoped token layer; global rollout is backlog 999.5
- [Deploy]: `main` auto-deploys to production, so shorts stay noindex and unlinked until the Phase 6 go-live switch; schema changes are additive
- [Process]: Main-only commits, no PRs; `design_handoff_tiween/` is inert per the kernel (not read)
- [Phase 01]: [01-01] One shared resettable document middleware per boot test file (strapi.documents.use cannot be unregistered)
- [Phase 01]: [01-01] Spike verdicts A1,A2,A3,A4,A5,A13 all confirmed on SQLite: middleware guard viable (also inspect create/update status published), republish re-stamps publishedAt (skip-if-unchanged mandatory), PUT ?locale= creates locale rows (locale tabs viable, D-22 fallback unneeded), localized relations and uid slug are not shared across locale rows (overlay from default-locale row)
- [Phase 01]: 01-02: country/language stored as JSON arrays validated by shared Zod schemas (additive schema, extensible lists) — Keeps the DB delta additive on an auto-deploying main; lists grow without a migration
- [Phase 01]: 01-02: evaluateShortFilmPublishRules throws SKIP_NOT_ALLOWED for any skip code other than POSTER_REQUIRED — The D-20 bypass cannot widen; DIRECTOR_UNPUBLISHED only runs when publishedPersonIds is supplied
- [Phase 01]: 01-07: MediaInput takes assets only from Strapi's media-library dialog (useStrapiApp components['media-library']); URL-paste and fabricated ids removed; multiple-mode removal passes the filtered array
- [Phase 01]: 01-14: Venue managers may create only film and play (VENUE_CREATABLE_WORK_TYPES); CREATIVE_WORK_TYPES and KIND_BY_WORK_TYPE keep short-film — Short films are admin-curated (D-21); the venue create-and-publish flow cannot satisfy D-19 publish rules, while existing shorts must stay schedulable
- [Phase 01]: 01-03: a localized row counts as a translation only with a non-empty title; paging, sorting and counting stay on default-locale rows and the overlay runs on the selected page only
- [Phase 01]: 01-03: creating a locale row for a work with credits needs ar rows for its persons and credit-roles first (finding for 01-09/01-10)
- [Phase 01]: [01-06] Short-film publish guard is a Document Service middleware registered at plugin register time; create/update with status published are rewritten to draft write plus publish so one path evaluates the rules
- [Phase 01]: [01-06] D-20 bypass is an AsyncLocalStorage scope on a Symbol.for slot of globalThis (tsx source and dist plugin are separate module instances); it can skip only POSTER_REQUIRED and no src file outside src/shared may call it
- [Phase 01]: [01-06] Content-manager bulk publish containing a blocked short answers 400 but may still publish complete siblings (not all-or-nothing on Strapi 5.51.2/SQLite)
- [Phase 01]: 01-08: selected codes drop out of the country/language combobox list; addCode is a no-op for a duplicate as a guard — Keeps the picker from offering a choice that does nothing
- [Phase 01]: 01-08: featuredRank is sent as null unless featured is true; stored components (streamingLinks) are re-sent wholesale and never stripped on a type switch — Avoids stale ranks and silent data loss when an admin changes the work type
- [Phase 01]: 01-08: WorkForm imported a nonexistent Film icon from @strapi/icons 2.2.3 and could not render; replaced by Play — Pre-existing crash hidden by 01-07 mocking WorkForm in the routing test
- [Phase 01]: 01-04: featured is ordered in JavaScript (rank asc, unranked last, publishedAt desc, id desc) over a capped, newest-first fetch of 100 so SQLite and Postgres cannot differ
- [Phase 01]: 01-04: related logic is isolated in exported findRelatedDeterministic returning raw rows (director group, then genre group via mergeRelated) so Phase 3 can swap the source to Meilisearch and keep this as fallback
- [Phase 01]: 01-04: related uses the nested credits.person + creditRole.slug filter confirmed by spike A5 on SQLite; Postgres behavior is unverified
- [Phase 01]: Task 1 (01-09): content-manager collection-types bodies are sent flat; the { data } wrapper is silently dropped by the server (boot-proven), so createWork/updateWork send the entity itself
- [Phase 01]: Task 2 (01-09): D-22 branch shipped is locale tabs creating rows (A3 confirmed); a first translation save of a credited work first creates person, credit-role and character rows in that locale, with a mapped sentence as safety net
- [Phase 01]: Task 1 (01-09): the publish pre-check always evaluates the saved default-language draft, on every tab, because the server guard reads that draft whichever language is published; publish and unpublish are per language only (no bulk)
- [Phase 01]: Importer publishes per locale and only what changed (default row only if changed or unpublished), so translation-only edits never bump publishedAt
- [Phase 01]: Change detection is next-driven: keys absent from the next payload are not compared, so hand-added images and fields survive a re-import
- [Phase 01]: Failed image downloads are per-film warnings (BACKDROP_UNAVAILABLE / POSTER_UNAVAILABLE); posterless films publish under the D-20 bypass and are listed in posterBypassed
- [Phase 01]: seed:shorts boots with distDir dist (not .build, which cannot start Strapi in this checkout); index.ts and clear.ts left untouched, logged in deferred-items
- [Phase 01]: 01-05: short-films routes share a 600 req/60 s per-key rate limit; legacy creative-work routes removed but search/findOneWithDetails/createWork kept for the public-api facade
- [Phase 01]: le-masseur and tahtima held out of the data file as needs-owner-input: only third-party uploads exist (D-16 forbids re-uploads), tahtima also has no verifiable director
- [Phase 01]: chrifa-bent-el-fadhel credits Kheyri Habboubi from the producer's own video description and channel page (single source, owner to confirm); no film has a real 2:3 poster so all 8 included films rely on the D-20 bypass
- [Phase 01]: Unverified facts (years, Arabic original title, synopses) are omitted from the data file instead of carried from the mock; streamingLinks is the single watch source (videos left empty)
- [Phase 01]: Owner approved all 13 include films (approve-all, 2026-10-20); mediaHosts stays []; 13 open sheet questions accepted as presented and carried to 01-13 review list

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1] The creative-works plugin has no public list/detail route (only `featured`, `type/:type`, `search`); the current client fetchers hit nothing real and also request nonexistent fields (400s). Phase 1 designs the public read API and param allowlist.
- [Phase 1] Poster/media sourcing and rights for the launch catalog are undecided (mocks hotlink YouTube stills); launch catalog size is undecided. Owner input needed in discuss-phase.
- [Phase 3] Meilisearch shape is open: search plugin vs `creative-works` hooks, one index with a locale field vs per-locale indexes, browser-direct search-only key vs Next.js route, Arabic and French normalization quality. Research flag.
- [Phase 4] Decide in the UI-SPEC: magenta small-text treatment (3.75:1 fails 4.5:1), `ShortsShowcase` vs `ShortsDirectory`, reconciling the detail page's handoff palette (`#161015`/`#241326`) with the spine tokens (`#241326`/`#31203A`). A `Courts Metrages` handoff mock exists in `design_handoff_tiween/` but the kernel marks that folder inert; consult it only with explicit owner approval.
- [Phase 4] Suggestion form needs a new `short-film-suggestion` content type, and a decision on its home plugin (kernel: plugins only, facade rules R1-R5).
- [Cross-cutting] Client `type-check` is not wired into CI (46 pre-existing TS errors outside shorts); shorts code must be clean on its own, verified by file filter in Phase 6. Strapi boot-integration suites are skipped by CI and must be run explicitly.
- [Environment] `.planning/config.json` is absent: defaults assumed (standard granularity, sequential phase IDs). The working tree has unrelated uncommitted edits (for example `apps/client/package.json` script rename); leave them alone.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item                                                     | Status | Deferred At | Milestone |
| -------- | -------------------------------------------------------- | ------ | ----------- | --------- |
| _(none)_ | v2+ work is parked as 999.x phases in ROADMAP.md Backlog |        |             |           |

## Session Continuity

Last session: 2026-10-20T07:32:50.128Z
Stopped at: Completed 01-12-PLAN.md
Resume file: None
