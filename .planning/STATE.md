---
gsd_state_version: "1.0"
milestone: v1.0
milestone_name: Shorts Directory
current_phase: 1
current_phase_name: Short-Film Catalog Backend
status: executing
stopped_at: Completed 01-07-PLAN.md
last_updated: "2026-10-18T17:21:29.210Z"
last_activity: 2026-10-18
last_activity_desc: Phase 1 execution started
state_head: 92c449c3a260e1493823aace6885e0c2c07cda82
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 14
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-18)

**Core value:** People in Tunisia can find what is happening and what to watch across film, theatre, shorts, concerts and exhibitions, in their own language, on their phone.
**Current focus:** Phase 1 — Short-Film Catalog Backend

## Current Position

Phase: 1 (Short-Film Catalog Backend) — EXECUTING
Plan: 3 of 14
Status: Ready to execute
Last activity: 2026-10-18 — Phase 1 execution started

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

| Plan         | Duration | Tasks   | Files    |
| ------------ | -------- | ------- | -------- |
| Phase 01 P01 | 22 min   | 2 tasks | 1 files  |
| Phase 01 P02 | 20 min   | 2 tasks | 10 files |
| Phase 01 P07 | 17 min   | 2 tasks | 9 files  |

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

Last session: 2026-10-18T17:21:29.074Z
Stopped at: Completed 01-07-PLAN.md
Resume file: None
