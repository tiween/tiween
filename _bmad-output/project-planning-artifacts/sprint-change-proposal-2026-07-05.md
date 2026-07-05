---
title: "Sprint Change Proposal — Split Story 3.1 (Homepage) into Backend + Frontend Slices; Defer Phase-2 Discovery Stories"
date: "2026-07-05"
author: "Ayoub (via Claude Code, resolving a bmad-loop escalation)"
trigger: "Story 3.1 escalated twice in the bmad-loop: it is a full-stack vertical slice too large for one unattended dev pass, and Phase-2 story 3.2 kept re-escalating the run."
change_scope: "Moderate (story split within an existing epic + backlog status changes; no new epic, no scope change to the product)"
status: "proposed"
mode: "Batch"
related_epics: ["epic-3-event-discovery-browsing"]
related_plugins: ["events-manager"]
related_run: "bmad-loop 20260704-170701-cbb4"
---

# Sprint Change Proposal — Split Story 3.1; Defer Phase-2 Discovery Stories

## Section 1 — Issue Summary

**Trigger.** During the unattended `bmad-loop` run `20260704-170701-cbb4`, **Story 3.1 (Homepage with Curated Event Listings)** escalated. Its four blocking scoping decisions had already been resolved by Ayoub on 2026-07-04 (the spec was `ready-for-dev`), so this is **not** an intent gap — it is a **sizing** problem. 3.1 is a full-stack vertical slice, and it exceeded a single unattended dev pass: attempt 1 timed out at the 90-minute session limit; attempt 2 finished without producing a committable result. With `max_dev_attempts: 2` exhausted, the loop advanced to **Story 3.2 (Category Filtering)**, which correctly self-halted (it is `[Phase 2]` deferred in the epic and depends on 3.1's unshipped API), escalating the run a second time.

**Context — why 3.1 is oversized.** The escalation evidence (retained in the original spec's Auto Run Result) showed 3.1 spans four layers, any one of which is a meaningful unit of work:

1. **No public events API.** `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts` registers only `admin` + `seed` routes — there is no `content-api` GET route for `event`/`screening`, so the frontend's `/api/events-manager/events` calls have no server route.
2. **`featured` does not exist** on the `event` content-type, though the frontend filters on it.
3. **No event-level popularity signal.** Only `screening.ticketsSold` exists; Strapi REST cannot rank events by an aggregate of related screenings without a custom service — "Tendances" needs one.
4. **Frontend data layer targets legacy fields.** `lib/strapi-api/content/events*.ts` and `features/events/types/strapi.types.ts` query `startDate`/`status`/`creativeWork`/`showtimes.time`, none of which exist; the real schema is `startDateTime`/`eventStatus`/`screenings`/`screening.movie`. The homepage UI itself is ~80% built and only needs fixing-and-wiring, not rebuilding.

Layers 1–3 are a self-contained **backend data foundation**; layer 4 is a **frontend wire-up** that depends on it. That is the natural split seam.

**Decisions taken by Ayoub during this workflow (Batch mode):**

1. **Split Story 3.1 along its data/presentation seam** into two independently-shippable sub-stories rather than re-driving the whole slice unattended.
2. **Defer Story 3.2 (Category Filtering)** in the sprint plan so the loop stops re-escalating on it — it is already `[Phase 2]` in the epic and depends on 3.1.

**Extension applied for consistency (flagged for objection).** Story **3.9 (Geolocation "Near Me")** is the identical case — `[Phase 2]`, epic-marked deferred, and it would trip the loop the same way once the MVP filter stories are consumed. It is deferred here alongside 3.2 for the same documented reason. Revert if you want it left actionable.

## Section 2 — Impact Analysis

| Area           | Finding                                                                                                                                                                                                                                                             | Status        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Product scope  | **Unchanged.** Same homepage capability ships; only the delivery unit is split.                                                                                                                                                                                     | No action     |
| Epic impact    | **Story 3.1 split** into 3.1a (backend) + 3.1b (frontend) within Epic 3. No epic added or rescoped.                                                                                                                                                                 | Action-needed |
| Sprint keys    | Sub-story keys **must be numeric** — the loop's `STORY_RE` (`^(\d+)-(\d+)-(.+)$`) ignores letter-suffixed keys (the 55 `epic-2*` keys already fall into `unknown_keys`). So 3.1a keeps key `3-1`; 3.1b is a new numeric key `3-11`, file-ordered right after `3-1`. | Action-needed |
| Loop selection | Only `backlog`/`ready-for-dev` are actionable. Setting `3-2` and `3-9` to `deferred` makes the loop skip them without losing tracking. The already-escalated old keys (`3-1-homepage-…`, `3-2-…`) stay in the run's touched-set and are skipped on resume.          | Action-needed |
| Run recovery   | No rollback needed: `git log 85bad29..HEAD` is empty — nothing was committed. On resume, `_pick_next` re-reads sprint-status and advances to `3-1` (backend) then `3-11` (frontend).                                                                                | Verified      |
| Specs          | Two `ready-for-dev` specs written (backend + frontend) carrying forward the resolved decisions, so the dev workflow does not re-derive/re-escalate. Original `spec-3-1-homepage-…` deleted (content split into the two).                                            | Done          |
| Dependencies   | 3.1b depends on 3.1a; file order + sequential execution enforce it. Downstream MVP filter stories (3.3–3.5) already depend on 3.1's API, now delivered by 3.1a.                                                                                                     | No action     |

## Section 3 — Recommended Approach

**Split, don't re-drive.** Re-driving the whole slice unattended with a bigger budget risks another timeout because size is the problem, not budget. Splitting yields two units that each fit one dev pass and can be verified independently (backend via `curl`/seed; frontend via typecheck/build/page load). This is also more BMAD-idiomatic (small, single-goal stories) and removes the `multiple-goals` warning the original 3.1 spec carried.

**Sequence:** `3-1` (backend) → `3-11` (frontend) → then the MVP filter stories `3-3`, `3-4`, `3-5` (which share the `filterStore`/URL-state mechanism) → `3-6`, `3-7`, `3-8`, `3-10`. Phase-2 `3-2` and `3-9` stay deferred until Phase 2.

## Section 4 — Detailed Change Proposals

### 4.1 Epic file — `epics/epic-3-event-discovery-browsing.md`

Story 3.1 replaced by a split note + **Story 3.1a: Public Events Browse API & Data Foundation** (backend acceptance criteria: content-api routes, `featured` boolean, trending service) and **Story 3.1b: Homepage with Curated Event Listings** (the original homepage acceptance criteria + an explicit "fix-and-wire the existing UI, align the data layer" criterion, marked _depends on 3.1a_).

### 4.2 Sprint status — `implementation-artifacts/sprint-status.yaml`

- `3-1-homepage-with-curated-event-listings` → renamed key `3-1-public-events-browse-api-and-data-foundation: backlog` (3.1a).
- New key `3-11-homepage-with-curated-event-listings: backlog` inserted immediately after (3.1b).
- `3-2-category-filtering: backlog` → `deferred`.
- `3-9-geolocation-near-me-filtering: backlog` → `deferred`.
- Added a REVISION comment block pointing at this proposal and explaining the numeric-key constraint.

### 4.3 Specs — `implementation-artifacts/`

- New `spec-3-1-public-events-browse-api-and-data-foundation.md` (`ready-for-dev`, backend slice).
- New `spec-3-11-homepage-with-curated-event-listings.md` (`ready-for-dev`, frontend slice, `depends_on: [3-1-…]`).
- Deleted `spec-3-1-homepage-with-curated-event-listings.md` (superseded; content split into the two above).

### 4.4 Epic index — `epics/index.md`

Line for Story 3.1 replaced with two lines (3.1a + 3.1b); 3.2 and 3.9 annotated `[Phase 2 — deferred]`.

### 4.5 Memory

`epic-3-story-3-1-scope` updated to record the split (3.1 = backend API/data foundation, key `3-1`; 3.11 = homepage wire-up, key `3-11`) so future sessions don't reconstruct the pre-split shape.

## Section 5 — Implementation Handoff

1. **No rollback required.** Working tree is at baseline `85bad29`; the only tracked change is the loop auto-adding a `bmad-loop resume *` permission to `.claude/settings.local.json`.
2. **Resume the loop:** `bmad-loop resume 20260704-170701-cbb4`. It will re-read sprint-status, skip the escalated old keys and the deferred Phase-2 stories, and drive `3-1` (backend) then `3-11` (frontend).
3. If a fresh run is preferred over resuming the twice-escalated one, `bmad-loop run --epic 3` reads the same sprint-status and picks `3-1` first.

## Approval

Decisions approved by Ayoub on 2026-07-05 (split 3.1; defer 3.2; 3.9 deferred by extension, revertible). Proposal status: **proposed** → apply on resume.
