---
title: "Public inventory-leak sanitization (DW-18, DW-112)"
type: "bugfix"
created: "2026-07-13"
status: "done"
baseline_revision: "2e5b7fbb6a1ae1109905851df19109609fb83c7c"
final_revision: "7140507daf5c03964b3aa5318365426abd0b2836"
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** The public, unauthenticated events-manager read endpoints disclose internal per-showtime sell-through. `GET /events-manager/events`, `/events/trending`, and `/events/:documentId` blanket-return each screening's raw `ticketsSold`/`ticketsAvailable` plus full venue records (email, phone, website, status, capacity, manager) (DW-18); `GET /events-manager/showtimes/:documentId/ticket-tiers` returns each tier's exact `ticketsSold`/`ticketsAvailable` though the UI only consumes the derived `remaining`/`soldOut` (DW-112).

**Approach:** Add a pure sanitizing transform in the events-manager plugin applied at the HTTP **controller** boundary (never in the services, which internal cross-plugin callers reuse). Screenings drop `ticketsSold`/`ticketsAvailable` and gain a derived boolean `soldOut`. Venues are reduced to an allowlist of public fields. Tier rows drop `ticketsSold`/`ticketsAvailable`, keeping `remaining`/`soldOut`. Update the frontend consumers that read the removed raw fields to read the derived values instead.

## Boundaries & Constraints

**Always:**

- Sanitize at the controller boundary (`controllers/events.ts`, `controllers/ticket-tiers.ts`) — the `events`/`ticket-tiers`/`public-api` services and their return types stay untouched (checkout's `getSubEventContext` relies on the full `TicketTierOut`, order.ts reads `tier.price`).
- Screening `soldOut = ticketsAvailable > 0 && ticketsSold >= ticketsAvailable` (coerce string decimals via Number; unconfigured capacity `0` ⇒ not sold-out). Never emit `ticketsSold`/`ticketsAvailable`/`remaining` on a public screening.
- Venue allowlist (drop everything else): `id`, `documentId`, `name`, `slug`, `address`, `phone`, `cityRef` (kept whole — public geography), `geo`.
- Preserve the exact Strapi v5 envelope: list ⇒ `{ data: Event[], meta: { pagination } }`, detail ⇒ `{ data: Event, meta }`, tiers ⇒ `{ data: TicketTiersResult, meta }`. Transforms are pure (no input mutation) and null/partial-data safe.

**Block If:**

- A public frontend surface is found to depend on a raw count in a way a derived boolean cannot satisfy (would force a product decision on what to disclose).

**Never:**

- Never change the DB schema, the `adjustInventory` write path, or the `remaining`/`soldOut` math in `ticket-tiers.ts` `mapTier`.
- Never touch `public-api.ts` / `order.ts` (internal cross-plugin edge).
- Never widen the venue allowlist to expose `email`, `status`, `capacity`, `manager`, `website`, `description`, `type`.

## I/O & Edge-Case Matrix

| Scenario              | Input / State                        | Expected Output / Behavior                                         | Error Handling     |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------ | ------------------ |
| Browse list           | screening avail=40 sold=60           | screening has `soldOut:true`, no `ticketsSold`/`ticketsAvailable`  | none               |
| Browse list           | screening avail=40 sold=10           | `soldOut:false`                                                    | none               |
| Unconfigured capacity | avail=0 sold=0                       | `soldOut:false` (not hidden)                                       | none               |
| Venue populated       | venue w/ email+phone+capacity        | only allowlisted fields remain; `email`/`capacity`/`status` absent | none               |
| Detail read           | `{ data: event }` deep populate      | same sanitization, deep `movie`/cast graph preserved               | 404 body unchanged |
| Ticket tiers          | tier avail=100 sold=100              | `remaining:0`,`soldOut:true`, no raw counts                        | none               |
| Empty relations       | event w/ `screenings:null`, no venue | passes through unchanged, no throw                                 | none               |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/utils/sanitize-public.ts` -- NEW pure transforms (event/venue/screening/tiers).
- `apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts` -- apply sanitizer to `findEvents`/`findTrending`/`findEvent` bodies.
- `apps/strapi/src/plugins/events-manager/server/src/controllers/ticket-tiers.ts` -- apply tier sanitizer before `ctx.body`.
- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` / `ticket-tiers.ts` / `public-api.ts` -- READ-ONLY reference; must NOT change.
- `apps/client/src/features/events/types/strapi.types.ts` -- `StrapiScreening`: drop `ticketsAvailable`/`ticketsSold`, add `soldOut?: boolean`.
- `apps/client/src/features/events/utils/eventMappers.ts` -- `toEventDetail` showtime status reads `s.soldOut`.
- `apps/client/src/lib/seo/structured-data.ts` -- offer availability reads `s.soldOut`.
- `apps/client/src/features/tickets/types.ts` -- `TicketTier`: drop `ticketsAvailable`/`ticketsSold`.
- Tests: `controllers/__tests__/events.unit.test.ts`, `services|controllers/__tests__/ticket-tiers.unit.test.ts`, new `utils/__tests__/sanitize-public.unit.test.ts`; client `eventMappers.test.ts`, `useTicketTiers.test.ts`, ticket component/store tests using tier fixtures.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/.../server/src/utils/sanitize-public.ts` -- create pure `sanitizePublicEvent`, `sanitizeEventsListResult`, `sanitizeVenue`, `sanitizeScreening`, `sanitizeTicketTiersResult` -- single source of the transform.
- [x] `apps/strapi/.../controllers/events.ts` -- wrap `findEvents`/`findTrending` result in `sanitizeEventsListResult`; wrap `findEvent` `data` in `sanitizePublicEvent` -- close DW-18 leak.
- [x] `apps/strapi/.../controllers/ticket-tiers.ts` -- sanitize `result.tiers` before `ctx.body` -- close DW-112 leak.
- [x] `apps/strapi/.../utils/__tests__/sanitize-public.unit.test.ts` -- unit-test every I/O Matrix row (pure functions).
- [x] `apps/strapi/.../controllers/__tests__/*.unit.test.ts` -- assert sanitized shape on controller bodies; update any fixture asserting removed fields. (No changes needed — existing fixtures carry no venue-internal or raw-count fields.)
- [x] `apps/client/.../types/strapi.types.ts` + `features/tickets/types.ts` -- update `StrapiScreening`/`TicketTier` field sets.
- [x] `apps/client/.../utils/eventMappers.ts` + `lib/seo/structured-data.ts` -- consume `soldOut` instead of `ticketsAvailable`.
- [x] client test fixtures (`eventMappers.test.ts`, ticket tests) -- migrate `ticketsAvailable`/`ticketsSold` fixtures to `soldOut`/`remaining`.

**Acceptance Criteria:**

- Given an anonymous GET to any of the three events endpoints, when the response is inspected, then no screening or venue object contains `ticketsSold`, `ticketsAvailable`, `email`, `status`, `capacity`, or `manager`.
- Given an anonymous GET to ticket-tiers, when the response is inspected, then no tier contains `ticketsSold`/`ticketsAvailable`, and `remaining`/`soldOut` are present and unchanged in value.
- Given the internal `getSubEventContext`/`order.ts` checkout path, when it runs, then it still receives full `TicketTierOut` tiers (service unchanged) and pricing validation is unaffected.
- Given the event detail / SEO JSON-LD, when a screening is fully sold, then the showtime renders sold-out and the offer is marked unavailable, driven by `soldOut`.
- Given `apps/strapi` jest and `apps/client` vitest + tsc, when run, then all pass.

## Review Triage Log

### 2026-07-13 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 3, low 1)
- defer: 1: (low 1)
- reject: 6: (medium 1, low 5)
- addressed_findings:
  - `[medium]` `[patch]` Fail-closed hardening: `sanitizeScreening` now strips raw counts from an embedded `ticketTiers[]` component, and `sanitizePublicEvent` sanitizes the `performances` relation symmetrically with `screenings`. Both carry `ticketsSold`/`ticketsAvailable` per schema and are latent leaks the moment a future populate includes them. Added unit coverage.
  - `[medium]` `[patch]` Verification gap (controller wiring): existing controller unit tests used field-less fixtures, so a reverted sanitizer wrap would pass undetected. Added sensitive-fixture wiring assertions to `findEvents`, `findEvent`, and `findTicketTiers` controller tests.
  - `[medium]` `[patch]` Verification gap (JSON-LD availability): `generateEventJsonLd` had no test and `src/lib/seo` was outside the vitest `include`. Added `structured-data.test.ts` (soldOut → SoldOut / InStock) and registered `src/lib/seo/**/*.test.ts`.
  - `[low]` `[patch]` Contract consistency: added the missing nullish guard to `sanitizeEventsListResult`/`sanitizeTicketTiersResult` (the module docstring already promised all sanitizers are nullish-safe). Extracted a shared `stripInventoryCounts` helper.
  - Deferred (surfaced in Auto Run Result residual risks, NOT written to the ledger per the orchestrator's "do not edit deferred-work" directive): screening-level `soldOut` (aggregate `ticketsAvailable`) and tier-level `soldOut` (`mapTier`) can disagree for zero/aggregate-capacity data — a showtime may read "available" at the event level while every tier is sold out. Reconciling the two definitions needs a data-model/product decision.
  - Rejected: capacity-0 `soldOut` semantics (spec-sanctioned & documented); negative capacity (DB CHECK-constrained corrupt state); legacy-showtime JSON-LD masking (deprecated field no longer returned by the API; "unknown ⇒ available" was already the default); unpriced-screening InStock (pre-existing, not introduced); numeric `id` retention (frontend `StrapiVenue.id` is required; consistent with the whole API); `remaining` disclosure (kept by explicit DW-112 design).

### 2026-07-13 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 1, low 0)
- defer: 1: (high 0, medium 0, low 1)
- reject: 12: (high 0, medium 0, low 12)
- addressed_findings:
  - `[medium]` `[patch]` Verification gap (findTrending wiring): the prior pass pinned the sanitizer wrap on `findEvents`/`findEvent` but left `findTrending` — a separate public `auth:false` endpoint returning the same venue + screening data — covered only by a field-less fixture asserting `toEqual(result)`, which passes whether or not the sanitizer runs. Added a sensitive-fixture wiring assertion to the `findTrending` controller test (strips venue `email`/`capacity`/`status` + screening raw counts, adds `soldOut`), so a reverted/dropped wrap now fails. events-manager suite: 12 files, 156 tests PASS (was 155).
  - `[low]` `[defer]` Fail-closed gap on the `eventGroup` relation → new ledger entry DW-130. `sanitizePublicEvent` recurses only into `venue`/`screenings`/`performances`; the schema's `eventGroup` relation (inventory-bearing nested events) is spread through untouched. Latent only — `eventGroup` is in neither `EVENT_POPULATE` nor `DETAIL_POPULATE` — but it contradicts the sanitizer's fail-closed docstring. Deferred (needs a recurse-vs-strip design decision), not patched.
  - Rejected (12, all low/no-consequence): three legacy detail/ticketing components (`EventDetailPageDesktop`, `EventDetailPageWithMap`, `TicketingPageDesktop`) still gate on `ticketsAvailable` — verified unmounted (barrel re-exports + one README only) and fed by the deprecated `event.showtimes`/`StrapiShowtime` field, which this diff never touched, so no regression is introduced (Blind Hunter false positive; Edge Case Hunter concurred); `StrapiShowtime` legacy-type retention (explicitly `@deprecated`, out of scope); venue allowlist dropping `images`/`logo`/`website`/`description` (never populated — venue populate pulls only `cityRef.region` + `geo` — so JSON-LD `venue.images` was always `undefined`, no effect); `remaining` velocity disclosure and trending ordering (both by explicit design); `soldOut` inert for `ticketsAvailable=0` (spec-sanctioned I/O-matrix row + Design Notes); screening-vs-tier `soldOut` mismatch (already the spec's documented residual risk); embedded `ticketTiers[]` losing `remaining`/`soldOut` (not populated, latent non-issue); `server.ts` dead `showtimes` populate fields (pre-existing dead legacy); JSON-LD absent-`soldOut`⇒InStock (documented intended default, safe on the sanitized path); whole-object `cityRef` passthrough (spec-sanctioned public geography; populate depth is `region` only — no nested venues/events); negative-capacity `soldOut` (DB CHECK-constrained corrupt state, previously rejected).

## Design Notes

Boundary choice: `events` service output feeds only its controller, but `ticket-tiers` service feeds BOTH its controller and `public-api.getSubEventContext` (checkout). Sanitizing in controllers keeps one rule: services return truth, HTTP responses are sanitized.

Screening `soldOut` intentionally uses the correct remaining-based formula (`sold >= available` when `available>0`). This also corrects a latent frontend bug where sold-out was derived from `ticketsAvailable <= 0` (capacity), ignoring sales — the derived boolean now reflects real availability. Tier `remaining`/`soldOut` are already computed in `mapTier`; the controller only strips the two raw fields it also carries.

Venue `cityRef` is kept whole: it is public geography (city/region name+slug), already the only venue relation populated for browse.

## Verification

**Commands:**

- `cd apps/strapi && npx jest src/plugins/events-manager/server/src/plugins 2>/dev/null; npx jest events-manager` -- expected: events-manager plugin suites green (sanitizer + controllers).
- `cd apps/client && npx vitest run src/features/events src/features/tickets src/lib/seo` -- expected: affected suites green.
- `cd apps/client && npx tsc --noEmit` -- expected: no type errors after field-set changes.

## Auto Run Result

Status: done

**Summary:** Closed two public inventory-disclosure leaks (DW-18, DW-112) by adding pure sanitizing transforms at the events-manager HTTP controller boundary. Screenings/performances drop raw `ticketsSold`/`ticketsAvailable` and expose a derived `soldOut`; venues are reduced to a public allowlist; ticket tiers drop the raw counts (keeping `remaining`/`soldOut`). Services are untouched, so internal checkout keeps the full tier truth. Frontend consumers switched from the removed raw counts to `soldOut`.

**Files changed:**

- `apps/strapi/.../server/src/utils/sanitize-public.ts` — NEW pure sanitizers (venue allowlist, screening/performance count-strip + derived `soldOut`, nested `ticketTiers` strip, list/tiers wrappers, shared `stripInventoryCounts`, nullish-safe throughout).
- `apps/strapi/.../server/src/utils/__tests__/sanitize-public.unit.test.ts` — NEW unit tests (I/O matrix + hardening branches).
- `apps/strapi/.../controllers/events.ts` — sanitize `findEvents`/`findTrending`/`findEvent` bodies.
- `apps/strapi/.../controllers/ticket-tiers.ts` — sanitize the tiers body.
- `apps/strapi/.../controllers/__tests__/events.unit.test.ts`, `ticket-tiers.unit.test.ts` — sensitive-fixture wiring assertions.
- `apps/client/.../events/types/strapi.types.ts` — `StrapiScreening`: `-ticketsAvailable/-ticketsSold`, `+soldOut?`.
- `apps/client/.../events/utils/eventMappers.ts` — showtime status from `soldOut`.
- `apps/client/.../lib/seo/structured-data.ts` — offer availability from `soldOut`.
- `apps/client/.../lib/seo/structured-data.test.ts` — NEW availability test.
- `apps/client/.../features/tickets/types.ts` — `TicketTier`: drop raw counts.
- `apps/client/vitest.config.ts` — include `src/lib/seo/**/*.test.ts`.
- Client test/story fixtures migrated off the removed raw-count fields.

**Review findings:** 4 patches applied (3 medium: fail-closed nested/performances hardening, controller-wiring verification, JSON-LD availability verification; 1 low: nullish-guard consistency). 1 deferred (residual risk below). 6 rejected. No intent_gap / bad_spec — no loopback.

**Verification:**

- `cd apps/strapi && npx jest src/plugins/events-manager` → 12 suites, 155 tests PASS.
- `cd apps/client && npx vitest run src/features/events src/features/tickets src/lib/seo` → 32 files, 334 tests PASS.
- `cd apps/client && npx tsc --noEmit` → 64 errors, all pre-existing (identical to baseline; none in touched files).

**Follow-up review (2026-07-13):** An independent second review pass (Blind Hunter + Edge Case Hunter + Verification Gap, no prior context) ran against the committed diff. Outcome: 1 medium patch, 1 low defer, 12 rejects; no intent_gap/bad_spec, no loopback.

- `[patch]` Closed a verification gap the first pass missed: `findTrending` (the third public `auth:false` events endpoint) had its sanitizer wrap pinned only by a field-less fixture, so a revert would re-leak undetected. Added a sensitive-fixture wiring assertion mirroring `findEvents`/`findEvent`. events-manager suite now 12 files / 156 tests PASS (was 155).
- `[defer → DW-130]` `sanitizePublicEvent` is not fail-closed against the schema's `eventGroup` relation (inventory-bearing nested events); latent only (not in any current populate), deferred for a recurse-vs-strip design decision.
- The reviewers' headline "3 client components still gate on `ticketsAvailable`" was verified a false positive: those components are unmounted legacy (barrel re-exports only) reading the deprecated `event.showtimes`/`StrapiShowtime` path this diff never touched. Venue-allowlist "dropped image fields" was also a non-issue — those fields are never populated. `followup_review_recommended` set to `false` (the only change was a localized test addition).

**Residual risks:**

- Cross-endpoint `soldOut` definition mismatch (deferred): the coarse screening-level `soldOut` (aggregate `ticketsAvailable`) can read "available" while every per-tier `soldOut` is true for the same sub-event when screening-level capacity is 0/unmaintained. Authoritative availability remains the ticket-tiers endpoint. Reconciling needs a data-model/product decision; not written to the deferred-work ledger because the orchestrator owns it.
- `remaining` is still exposed on ticket tiers by explicit DW-112 design (the UI renders "X places restantes"); it discloses remaining count but not total capacity or sold count.
