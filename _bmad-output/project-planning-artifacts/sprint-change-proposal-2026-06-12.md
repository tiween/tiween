# Sprint Change Proposal — Plugin Architecture Decomposition

**Date:** 2026-06-12
**Status:** Approved by Ayoub (2026-06-12, batch review)
**Scope classification:** Moderate (backlog reorganization; PO/Dev handoff)
**Trigger artifact:** `_bmad-output/project-planning-artifacts/architecture.md` (amendment, complete)

## 1. Issue Summary

The architecture amendment completed 2026-06-12 decomposes the Strapi backend
into clean bounded-context plugins (new `venues` plugin, single catalog of
record in `creative-works`, scheduling-only `events-manager`, transactional
`ticketing`, future `payments`). Its 4 migration steps existed in no epic or
story. Additionally:

- Epic 2B's story texts describe a deleted model (Showtime component,
  monolithic content types in `src/api/`) — reality diverged by design via the
  2026-06-11/12 schema.org redesign.
- A sequencing conflict exists with the OpenSpec change
  `add-events-manager-admin-ui` (114 tasks targeting UIDs that migration
  step 2 moves).
- Verified P0 risk: ticketing order creation has no transaction and never
  decrements inventory (oversell + orphan-order risk before Epic 6).

**Issue type:** structural decision from architecture analysis (not a story
failure). Evidence: code analysis of all 7 plugins; validated amendment.

## 2. Impact Analysis

**Epic impact:**

- Epic 2B (13/16 review+done): completes as-is; story texts are historical
  record — dated divergence note added, no rewrites.
- NEW Epic 2C required: 5 stories mapping 1:1 to the amendment's migration
  steps (venues extraction, collision audit, catalog move, ticketing UoW,
  consolidation sweep).
- Epic 6: 6-3 amended (Konnect via dedicated `payments` plugin per D5);
  prerequisite on 2C.4; 6-10 builds on the inventory facade.
- Epic 7: prerequisite on 2C.1; venue stories target `plugin::venues.*`.
- Epics 3/5/8/9/10: no story changes (client endpoint prefixes batch inside
  2C.1/2C.3 PRs).

**Artifact conflicts:** PRD — none (MVP untouched; internal restructure).
UX — none. Architecture — already updated (the amendment). Secondary:
epic-list.md, epic-dependencies.md, sprint-status.yaml, OpenSpec change doc.

## 3. Recommended Approach

**Direct Adjustment (Option 1)** — add Epic 2C + targeted epic amendments.
Effort: Medium. Risk: Low. Rollback rejected (the recent schema redesign IS
the foundation). MVP review unnecessary (MVP live and unaffected).

Rationale for a NEW epic rather than extending 2B: 2B is near completion with
its own retrospective arc; 2C has distinct gating semantics (2C.1 → Epic 7,
2C.4 → Epic 6) and its own sequencing rules (2C.2 gates 2C.3; 2C.4 never
concurrent with 2C.3).

## 4. Detailed Changes Applied

1. **NEW** `epics/epic-2c-plugin-architecture-decomposition.md` — 5 stories
   with ACs derived from the amendment's migration checklists.
2. `epics/epic-list.md` — Epic 2C section inserted after 2B.
3. `epics/epic-dependencies.md` — 2C added to both dependency diagrams;
   OpenSpec sequencing note.
4. `epics/epic-2b-...md` — dated divergence note prepended (stories kept as
   historical record).
5. `epics/epic-6-b2c-ticketing-purchases.md` — 6-3 references the `payments`
   plugin; epic-level prerequisite note (2C.4).
6. `epics/epic-7-b2b-venue-management.md` — epic-level prerequisite note
   (2C.1; `plugin::venues.*` RBAC).
7. `sprint-status.yaml` — epic-2c block added (5 stories, backlog).
8. **RESOLVED (2026-06-12):** OpenSpec retired entirely — BMad is the single
   source of truth. All 16 OpenSpec changes dispositioned in
   `openspec-retirement-ledger-2026-06-12.md`; the admin UI rebuild re-plans
   after 2C.3 as BMad stories.

## 5. Implementation Handoff

- **Story cycle (SM/Dev):** next story = **2C.1** (or 2C.4 if Epic 6 pressure
  rises first — both are unblocked). Use `bmad-create-story` per story; the
  architecture amendment is required context for every 2C story.
- **PO/owner (Ayoub):** OpenSpec sequencing decision (item 8); confirm 2C
  priority relative to remaining 2B review queue.
- **Success criteria:** all five 2C stories done with their grep gates green;
  Epic 7 stories startable against `plugin::venues.*`; Epic 6 startable with
  transactional ordering in place.
