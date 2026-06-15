---
title: "Sprint Change Proposal — Catalog Model Inversion (GTM = Read-Only Directory)"
date: "2026-06-15"
author: "Ayoub (via bmad-correct-course)"
trigger_story: "2C.3 — Consolidate Catalog on Creative-Works"
change_scope: "Minor (documentation amendment)"
status: "approved"
supersedes_decision_in: "2c-2-catalog-collision-data-audit.md §3"
related_memory: "catalog-model-creative-work-wins"
---

# Sprint Change Proposal — Catalog Model Inversion

## Section 1 — Issue Summary

**Trigger story:** 2C.3 (`Catalog Move into Creative-Works`, was `ready-for-dev`),
gated by 2C.2 (`done`).

**Issue type:** Strategic pivot + correction of a now-invalidated design decision.

**Problem statement.** The GTM product has been redefined as a **read-only
informative directory** of plays, screenings, and short films — **ticketing ships
post-GTM**. This invalidates the premise behind the 2C.2 decision (2026-06-15 AM),
which chose the **events-manager normalized model** (separate `movie`/`play`/`credit`
content types) and **retired** the June-12 unified `creative-work`. For a
render-oriented directory, the rich unified `creative-work` (with typed components
for cast/credits/videos) is the better catalog of record, and the shorts client is
**already built on it and ~production-ready**. The decision was re-made
2026-06-15 PM (memory `catalog-model-creative-work-wins`): **invert 2C.2 —
`creative-work` (type enum) wins, `movie`/`play` are retired.**

**Evidence at time of discovery.**

- `2c-2-...md §3` and the entirety of `2c-3-...md` documented the **opposite**
  (now-wrong) direction.
- `architecture.md` D2, the Data Architecture table, Gap Analysis item #1, and the
  Step 2 checklist all said "normalized wins / creative-work retired."
- Both catalogs confirmed **EMPTY** (2C.2 §1) → pure schema change, no data
  migration. This fact survives the inversion and keeps risk LOW.
- 2C.4 (ticketing UoW) is `done` and independent; concurrency + ticketing are
  already re-scoped post-GTM in `deferred-work.md`.

## Section 2 — Impact Analysis

| Area                      | Finding                                                                                                                                                                                                                          | Status                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Trigger (1.x)             | 2C.3 triggers; decision already settled by Ayoub                                                                                                                                                                                 | Done                      |
| Current epic 2C (2.1–2.2) | Completable as planned; only the **direction** of 2C.2/2C.3 inverts. No epic added/removed.                                                                                                                                      | Done                      |
| Other epics (2.3–2.4)     | Epic 5 (Watchlist): prior 2C.3 _dropped_ the `creativeWork` watchlist relation; under the inversion `creative-work` survives → relation **needs no change** (net simplification). Epics 6/8 untouched (2C.4 done & independent). | Done                      |
| Resequencing (2.5)        | None. 2C.2→2C.3 ordering holds.                                                                                                                                                                                                  | N/A                       |
| PRD (3.1)                 | GTM-as-directory framing not reflected in PRD text — **deliberately out of scope** here (per decision below). Flagged as a follow-up correct-course.                                                                             | Action-needed (follow-up) |
| Architecture (3.2)        | D2 + Data table + Gap #1 + Step 2 checklist + structure tree + constraint text inverted. **Core of this proposal.**                                                                                                              | Done                      |
| UI/UX (3.3)               | Admin UI rebuild already sequenced _after_ 2C.3 against post-move UIDs — note stays valid (UIDs now target `creative-work`).                                                                                                     | Done                      |
| Other artifacts (3.4)     | sprint-status comment; epic-2c stubs; epic-list scope line; deferred-work already aligned.                                                                                                                                       | Done                      |

## Section 3 — Recommended Approach

**Option 1 — Direct Adjustment.** Effort: **Low**. Risk: **Low**.

Rationale: 2C.3 has not been implemented, so there is nothing to roll back
(Option 2 N/A). The MVP is not redefined at the artifact level by this catalog
change (Option 3 N/A — the GTM/ticketing-sequencing reframe is a separate,
larger correct-course). Both catalogs are empty and the decision is settled, so
the work is purely to make the four planning artifacts agree with the settled
model before a dev agent picks up 2C.3 and implements the wrong direction. The
shorts client already runs on `creative-work`, so the inverted target also
reduces client churn.

## Section 4 — Detailed Change Proposals

All edits applied as part of this proposal (Minor scope → direct implementation).

### Architecture (`architecture.md`)

1. **D2** rewritten: unified `creative-work` (type enum) is the catalog of record;
   `movie`/`play` retired; people graph = `person` + `character` + new
   `credit-role` content type; `cast[]`/`credits[]`/`videos[]` components;
   `videoType` enum; no dynamic zone. Tagged `REVISED 2026-06-15`.
2. **Data Architecture table** — creative-works & events-manager rows inverted.
3. **Gap Analysis item #1** — rewritten to the inverted decision; notes watchlist
   is now **unaffected**.
4. **Step 2 migration checklist** — rewritten to "retire movie/play; add
   credit-role + components; retarget screening/performance → creative-work".
5. **Supporting consistency**: "In-flight catalog redesign" constraint, the
   implementation-sequence step-2 line, the move-mechanics "credit XOR" note, the
   backend structure tree (`credit-role` + `components/`), and the readiness
   assessment line all updated.

### Story 2C.2 (`2c-2-catalog-collision-data-audit.md`)

6. **SUPERSEDED banner** prepended; status corrected `review` → `done` (matches
   sprint-status). §1 (empty catalogs) and §2 (collision surface) retained as
   valid; §3 decision marked inverted. File kept for decision history.

### Story 2C.3 (`2c-3-catalog-move-into-creative-works.md`)

7. **Fully rewritten** to the inverted (simpler) target: retire `movie`/`play`;
   `creative-work` is the catalog; `person`/`character`/`credit-role` people graph;
   `cast[]`/`credits[]`/`videos[]` components; `videoType` enum; no dynamic zone;
   watchlist relation **unchanged**; grep gate flips to
   `plugin::events-manager.(movie|play)` = zero. RBAC `role`-collision guardrail
   called out.

### Epic file (`epic-2c-plugin-architecture-decomposition.md`)

8. Revision banner added; 2C.2 and 2C.3 story stubs inverted to match.

### Roll-up + tracking

9. `epic-list.md` Epic 2C scope line inverted.
10. `sprint-status.yaml` — 2C revision comment added. **No status changes**
    (2C.2 `done`, 2C.3 `ready-for-dev`, 2C.4 `done`).

## Section 5 — Implementation Handoff

**Scope classification: Minor.** Direct documentation amendment, executed by the
Developer agent as part of this workflow. No backlog reorganization (no stories
added/removed/renumbered), no PM/Architect replan.

**Deliverables (all complete):**

- This proposal (`sprint-change-proposal-2026-06-15.md`).
- 10 edits across `architecture.md`, `2c-2-...md`, `2c-3-...md`,
  `epic-2c-...md`, `epic-list.md`, `sprint-status.yaml`.

**Success criteria:**

- Grep gate: no planning artifact still instructs moving `movie`/`play` _into_
  creative-works or retiring `creative-work` (outside the preserved 2C.2 history
  under its SUPERSEDED banner). ✅
- 2C.3 spec describes the inverted target end-to-end. ✅
- sprint-status statuses unchanged; 2C.3 remains `ready-for-dev` against the
  corrected spec. ✅

**Follow-ups (out of this proposal's scope):**

- **PRD correct-course** to formalize "GTM = read-only directory; ticketing
  post-GTM" in PRD/MVP-scope text (currently only in catalog artifacts +
  deferred-work). Run a separate `bmad-correct-course` when ready.
- **2C.3 implementation** remains a future dev story (status `ready-for-dev`).
- Admin UI rebuild re-planned after 2C.3 lands, against `creative-work` UIDs.

## Approval

Approved by Ayoub (decision pre-made 2026-06-15; mode: Batch). Routed to Developer
agent for the documentation edits captured above.
