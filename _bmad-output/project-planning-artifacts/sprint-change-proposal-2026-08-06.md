# Sprint Change Proposal — 2026-08-06

**Trigger:** Strategic pivot (operator directive, 2026-08-06)
**Mode:** Batch review
**Scope classification:** Moderate (backlog reorganization, no rollback)
**Status:** APPROVED by Ayoub 2026-08-06 — all §4 edits applied same day

---

## 1. Issue Summary

V1 is redefined as a **content + event aggregation platform**: Tiween launches
as the place to find what's happening (cinema, theater, concerts, exhibitions)
across Tunisia. **All ticketing/purchase functionality is deferred to post-v1.**

Context: the PRD always classified ticketing as Phase 2 ("complex integration,
validate demand first"), but sprint execution drifted ahead of that — Epic 6
stories 6-1 through 6-5 (Konnect payments, QR generation, email delivery) are
already done, and 6-6 was next in the loop's path. This proposal re-aligns the
backlog with the aggregation-first strategy and simultaneously **widens v1 from
cinema-only to multi-category aggregation** (operator decision, 2026-08-06).

## 2. Impact Analysis

### Epic impact

| Epic                   | Impact                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 3 (Discovery)     | **Widened**: 3-2 category filtering (theater/concerts/exhibitions) returns from `deferred` to v1 scope. 3-9 (geolocation) stays deferred. One new story 3-12 gates already-shipped ticketing entry points. |
| Epic 5 (Watchlist)     | None — complete.                                                                                                                                                                                           |
| Epic 6 (B2C Ticketing) | **Deferred post-v1**: 6-6 → 6-10 move to `deferred`. 6-1 → 6-5 stay done/dormant (no rollback). Untracked draft `spec-6-6-in-app-ticket-viewing.md` is parked unstarted.                                   |
| Epic 7 (B2B Venue)     | **Split**: aggregation stories stay v1 — 7-1/7-2 (awaiting-operator), 7-3 (event creation), 7-4 (event editing), 7-8 (event analytics). Ticketing stories deferred — 7-5, 7-6, 7-7, 7-9.                   |
| Epic 8 (Scanner)       | **Deferred post-v1 entirely** (8-1 → 8-6).                                                                                                                                                                 |
| Epic 9 (Admin)         | None structurally — content management is now the v1 heart.                                                                                                                                                |
| Epic 10 (PWA)          | 10-5 (offline ticket display) deferred; 10-6 (background sync) stays but its ticket-queue portion is out of v1.                                                                                            |

### Artifact conflicts

- **PRD `product-scope.md`**: MVP defined as cinema-only; must widen to
  multi-category aggregation and re-affirm ticketing as post-v1.
- **`epic-list.md` / `epic-dependencies.md`**: phase tags and dependency notes
  must reflect the split and the widened Epic 3 scope.
- **Architecture**: no conflict. The 2026-06-12 plugin decomposition already
  isolates `ticketing` as a bounded context; it goes dormant, not removed.
  2C-4 (ticketing UoW) remains done and gates nothing in v1.
- **UX**: no edits required; ticketing screens/components remain built but
  unused in v1.

### Technical impact

- Shipped ticketing code (6-1..6-5 client surfaces, `ticketing` plugin, 2B-5
  content-types, 2A ticketing/scanner components) **stays in the codebase,
  dormant**. Zero rollback risk; post-v1 resumes from a warm start.
- Risk to mitigate: 6-1/6-2/6-3 shipped **user-visible purchase surfaces**
  (ticket prices, quantity selection, Konnect checkout). An aggregation-only
  v1 must not expose a live checkout → new story 3-12 gates these behind a
  feature flag (default off).

## 3. Recommended Approach

**Hybrid: Direct Adjustment + MVP redefinition. No rollback.**

- Effort: Low (status edits + doc edits + one small gating story).
- Risk: Low. Deferral is reversible by flipping statuses back; the dormant
  code is already reviewed and merged.
- Timeline: v1 critical path shortens — remaining v1 work is Epic 3 (3-2,
  3-12), Epic 2D admin UI, Epic 7 aggregation stories (7-3/7-4/7-8), Epic 9,
  Epic 10 (minus 10-5).

Rollback was rejected: reverting merged, reviewed payment/QR/email code buys
no v1 velocity and destroys post-v1 progress. MVP-review-only was rejected:
without status edits the bmad-loop would pick 6-6 next.

## 4. Detailed Change Proposals

### 4.1 `sprint-status.yaml` (implementation-artifacts)

| Key                                          | Old        | New        |
| -------------------------------------------- | ---------- | ---------- |
| `3-2-category-filtering`                     | `deferred` | `backlog`  |
| `6-6-in-app-ticket-viewing`                  | `backlog`  | `deferred` |
| `6-7-offline-qr-code-access`                 | `backlog`  | `deferred` |
| `6-8-purchase-confirmation-with-celebration` | `backlog`  | `deferred` |
| `6-9-purchase-history`                       | `backlog`  | `deferred` |
| `6-10-real-time-ticket-availability`         | `backlog`  | `deferred` |
| `7-5-ticketing-configuration`                | `backlog`  | `deferred` |
| `7-6-multiple-ticket-types-configuration`    | `backlog`  | `deferred` |
| `7-7-ticket-sales-reports`                   | `backlog`  | `deferred` |
| `7-9-real-time-sales-updates`                | `backlog`  | `deferred` |
| `8-1` … `8-6` (all Epic 8 stories)           | `backlog`  | `deferred` |
| `10-5-offline-ticket-display`                | `backlog`  | `deferred` |
| `3-12-gate-ticketing-entry-points-for-v1`    | — (new)    | `backlog`  |

Plus dated comments on epics 3, 6, 7, 8, 10 referencing this proposal.
`deferred` is the established loop-skip status (only `backlog`/`ready-for-dev`
are actionable — precedent: 3-2/3-9 since 2026-07-05).

**New story 3-12 (Epic 3): Gate ticketing entry points for v1.**
Hide/disable all purchase CTAs and routes shipped by 6-1/6-2/6-3 (ticket
type/price display, quantity selection, checkout) behind a feature flag,
default off. Event/venue pages remain fully informational. AC: no route or
visible control in the v1 client initiates a purchase; flag flip restores them
without code changes; existing ticketing tests keep passing.

### 4.2 `epics/epic-list.md`

- Phase-tag legend: `[Phase 2]` → `[Post-V1]` semantics ("deferred until after
  the v1 aggregation launch").
- Epic 3: retag **[MVP]** scope to multi-category — move "Category filtering
  (theater, concerts, exhibitions)" from Phase-2 list into v1 scope; add 3-12.
- Epic 6: retag **[Post-V1]**; note 6-1..6-5 delivered and dormant.
- Epic 7: retag **[MVP-partial]** — aggregation stories (7-1..7-4, 7-8) v1;
  ticketing stories (7-5/7-6/7-7/7-9) Post-V1.
- Epic 8: retag **[Post-V1]**.
- Epic 10: note 10-5 Post-V1.

### 4.3 `epics/epic-dependencies.md`

- Mark Epic 6 and Epic 8 branches Post-V1; note "2C.4 gates Epic 6" satisfied
  and moot for v1.
- Add Epic 7 (aggregation subset) and Epic 3 widened scope to the v1 critical
  path list.

### 4.4 Epic detail files

- `epic-6-b2c-ticketing-purchases.md`, `epic-8-b2b-ticket-validation-scanner.md`:
  deferral banner at top (dated, linking this proposal; 6-1..6-5 dormant note).
- `epic-7-b2b-venue-management.md`: v1/Post-V1 split note per story group.
- `epic-3-event-discovery-browsing.md`: 3-2 returned to v1 scope; add 3-12.

### 4.5 PRD `prd/product-scope.md`

- Core value (v1): "Find what's playing at cinemas across Tunisia" →
  **"Find what's happening — films, theater, concerts, exhibitions — across
  Tunisia."**
- Move "Theater/concerts/exhibitions" out of the descoped table into v1 scope.
- Ticketing rows unchanged (already Phase 2) but annotated: partial build
  (payments/QR/email) delivered 2026-07 and held dormant until post-v1.

## 5. Implementation Handoff

- **Scope: Moderate** → backlog reorganization, executed directly in this
  session (solo operator; PO/Dev hats combined).
- Deliverables: this proposal + the edits in §4 applied atomically.
- Success criteria: bmad-loop's next actionable stories are aggregation-only
  (3-2, 3-12, 2d-2, 7-3…); no ticketing story is `backlog`/`ready-for-dev`;
  PRD/epic docs and sprint-status agree.
