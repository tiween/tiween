---
title: "Inventory service hardening — distinct refund-underflow error code (DW-6)"
type: "bugfix"
created: "2026-07-13"
baseline_revision: "f56dcff054c3af8c0a7d231ff57e458d25ce3e79"
final_revision: "9d110fd364def8db7a02d889fdd621083031caf9"
status: "done"
review_loop_iteration: 0
followup_review_recommended: false
context:
  - "{project-root}/_bmad-output/project-context.md"
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** `adjustInventory` (events-manager `public-api.ts`) guards both the sale path (`delta > 0`, capacity) and the refund/release path (`delta < 0`, floor at zero) with a single in-SQL guard, and when the guarded UPDATE matches 0 rows it throws one shared code `TICKET_SOLD_OUT` regardless of delta sign. A refund/cancel that would drive `tickets_sold` below zero (an inventory _underflow_ — a server-side inconsistency) is therefore indistinguishable from a buyer losing the oversell race (a client "sold out"). The refund caller is now wired (`ticketing` `releaseInventory` → `adjustInventory(..., -qty)`), so DW-6's "give a distinct code when implemented" condition is met.

**Approach:** Give the refund/underflow branch its own exported error code (`INVENTORY_UNDERFLOW`), selected by delta sign at the single `affected === 0` throw site, and map it in the ticketing controller's status table so a future surfacing caller gets a real HTTP status instead of a generic 500. DW-3 and DW-8 (the TOCTOU oversell race + the RDBMS CHECK backstop) are ALREADY resolved by the sibling bundle `dw-inventory-oversell-concurrency` — the atomic relative increment and the `CHECK (tickets_sold <= tickets_available)` constraint (delivered via the events-manager plugin `bootstrap` ensure, NOT a migration) are already in the tree; this bundle only completes DW-6 and re-verifies that backstop, adding no new inventory-write logic.

## Boundaries & Constraints

**Always:**

- The new code is thrown ONLY on the `delta < 0` floor rejection (refund would drive `tickets_sold < 0`). The `delta > 0` capacity rejection keeps throwing `TICKET_SOLD_OUT` unchanged.
- The "missing published sub-event" branch keeps throwing the plain `/not found/` Error (no code) — the sign split applies only after the existence probe confirms the row exists.
- Preserve `adjustInventory`'s signature `(subEventId, kind, delta)`, its single-guarded-atomic-relative-increment mechanism, the `published_at IS NOT NULL` scoping, and the ambient-transaction binding — all unchanged.
- Export the new code constant the same way `TICKET_SOLD_OUT` is exported from `public-api.ts` (a named `export const`), so cross-plugin consumers reference the symbol, not a string literal.

**Block If:**

- Existing rows in `screenings`/`performances` already violate `tickets_sold <= tickets_available` (would indicate real oversold data needing a human decision) — but note this only surfaces if the CHECK re-verify path is run against real Postgres, which is out of scope here.

**Never:**

- Do NOT add or re-create a `apps/strapi/database/migrations/*.js` CHECK-constraint file. That mechanism was found unsound in the sibling bundle (Strapi runs `db.migrations.up()` BEFORE creating content-type tables, so it crashes a fresh Postgres boot and never installs) and was deliberately replaced by the idempotent `ensureInventoryCheckConstraint` in the events-manager plugin `bootstrap`. Re-adding a migration reintroduces that boot crash.
- Do NOT change `adjustInventory`'s write logic, its callers' signatures, or the bootstrap CHECK ensure.
- Do NOT change the `releaseInventory` swallow-and-log behavior (it must keep NOT rethrowing so a compensation path can still mark the order failed).
- Do NOT edit the deferred-work ledger (the orchestrator records resolution).

## I/O & Edge-Case Matrix

| Scenario                          | Input / State                                         | Expected Output / Behavior                                 | Error Handling                            |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| Oversell / lost race              | `delta=2`, guarded UPDATE matches 0 rows, row exists  | No write                                                   | throw code `TICKET_SOLD_OUT`              |
| Refund below zero (underflow)     | `delta=-1`, guarded UPDATE matches 0 rows, row exists | No write                                                   | throw code `INVENTORY_UNDERFLOW`          |
| Valid refund                      | `delta=-1`, affected 1                                | `tickets_sold` decremented, resolves                       | No error expected                         |
| Missing published sub-event       | affected 0, existence probe empty (any delta sign)    | No write                                                   | throw plain Error `/not found/` (no code) |
| Underflow surfaced via controller | thrown `INVENTORY_UNDERFLOW` reaches `respondError`   | HTTP status from the code map (409), `details.code` echoed | mapped, not a generic 500                 |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` -- `adjustInventory` (throw site at lines ~134-150) + the `TICKET_SOLD_OUT` export (line 29). Add the `INVENTORY_UNDERFLOW` export and branch the `affected === 0` (row-exists) throw by delta sign. Update the doc comment that currently says the loser "→ `TICKET_SOLD_OUT`" to note the sign split.
- `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/public-api.unit.test.ts` -- the `adjustInventory` describe block. The existing "refund would drive sold below zero" test (lines ~150-157) asserts `TICKET_SOLD_OUT`; retarget it to `INVENTORY_UNDERFLOW`. Keep the oversell test asserting `TICKET_SOLD_OUT`. Add/adjust so both codes are covered distinctly.
- `apps/strapi/src/plugins/ticketing/server/src/controllers/order.ts` -- `STATUS_BY_CODE` (lines 4-9). Add `INVENTORY_UNDERFLOW: 409` so a future surfacing caller maps to a real status rather than the `INTERNAL_ERROR`/500 fallback (`releaseInventory` swallows it today, so this is defense-in-depth for later callers).
- `apps/strapi/src/plugins/ticketing/server/src/services/order.ts` -- `releaseInventory` (lines ~381-393, read-only reference): the wired refund caller; confirms DW-6's "when implemented" precondition and that it must keep swallowing (no change).
- `apps/strapi/src/plugins/events-manager/server/src/bootstrap.ts` -- `ensureInventoryCheckConstraint` (read-only reference): the existing DW-3/DW-8 CHECK backstop that must remain the delivery mechanism (no migration).

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` -- Add `export const INVENTORY_UNDERFLOW = "INVENTORY_UNDERFLOW"` beside `TICKET_SOLD_OUT` with a one-line doc comment ("thrown when a refund/release would drive `ticketsSold` below zero"). In the `affected === 0` branch, AFTER the existence probe confirms the row exists, choose the code by delta sign: `delta > 0` → `TICKET_SOLD_OUT`; `delta < 0` → `INVENTORY_UNDERFLOW`. Update the message text and the `adjustInventory` doc comment so the "→ TICKET_SOLD_OUT" note reflects the sale-vs-refund split. No change to the guard SQL, the write, or the transaction binding.
- [x] `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/public-api.unit.test.ts` -- Retarget the "refund would drive sold below zero" test to expect `code: "INVENTORY_UNDERFLOW"`; keep the oversell test asserting `TICKET_SOLD_OUT`; keep the `/not found/` (no code) test. Cover both I/O-matrix error rows distinctly.
- [x] `apps/strapi/src/plugins/ticketing/server/src/controllers/order.ts` -- Add `INVENTORY_UNDERFLOW: 409` to `STATUS_BY_CODE` (a refund underflow is an inventory-conflict/invariant condition, parallel to `TICKET_SOLD_OUT`). No other controller change.

**Acceptance Criteria:**

- Given a refund/release (`delta < 0`) whose guarded UPDATE matches 0 rows on an existing published row, when `adjustInventory` throws, then the error carries `code === "INVENTORY_UNDERFLOW"` (not `TICKET_SOLD_OUT`).
- Given a sale (`delta > 0`) that loses the capacity guard on an existing published row, when `adjustInventory` throws, then the error still carries `code === "TICKET_SOLD_OUT"` (unchanged).
- Given no published row exists for the sub-event, when `adjustInventory` throws, then it is a plain `/not found/` Error with no `code`, for either delta sign.
- Given an `INVENTORY_UNDERFLOW` error reaches the ticketing order controller's `respondError`, when mapped, then the response status is 409 and `error.details.code` is `INVENTORY_UNDERFLOW` (not `INTERNAL_ERROR`).
- Given the DW-3/DW-8 backstop, when the tree is inspected, then no `database/migrations/*.js` CHECK file exists and `ensureInventoryCheckConstraint` remains the delivery mechanism (unchanged).

## Spec Change Log

No bad_spec loopback occurred. Empty.

## Review Triage Log

### 2026-07-13 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 0
- reject: 11: (high 0, medium 2, low 9)
- addressed_findings:
  - `[low]` `[patch]` The `affected === 0` throw site evaluated `delta > 0` twice (once for `code`, once for the message ternary) — a drift risk if one predicate were later changed without the other. Consolidated to a single `isSale = delta > 0` predicate driving both message and code. Behavior identical; 23/23 unit tests still pass.
- rejected (noise / out-of-scope / by-design-adjudicated-in-spec):
  - `INVENTORY_UNDERFLOW → 409` controller mapping is unreachable at runtime because `releaseInventory` swallows-and-logs (all 3 reviewers). REJECT — this is the spec's explicit defense-in-depth decision (Design Notes) with a boundary mandating `releaseInventory` keep swallowing; the Verification Gap reviewer independently confirmed "no shippable regression."
  - "Code split has zero runtime-observable effect / DW-6 goal unmet." REJECT — DW-6's deliverable is a distinct `code` on the thrown Error (present and unit-asserted); the swallowing caller is pre-existing and by-intent.
  - "409 is the wrong status; underflow is a server-side accounting bug → 500-class." REJECT — spec deliberately mirrors `TICKET_SOLD_OUT` (inventory-invariant conflict) and documents the rationale; the code is unreachable via HTTP today so the choice is inconsequential.
  - "Controller hardcodes the string literal instead of importing the exported const." REJECT — matches the existing `TICKET_SOLD_OUT` entry convention; a cross-plugin import would add coupling the plugin architecture avoids.
  - "New controller mapping has no test." REJECT — the line is unreachable at runtime (VerGap: a test would be tautological); AC4 is satisfied structurally.
  - "New error messages untested" / "'sold out' wording misleading for insufficient multi-ticket capacity." REJECT — messages are log-only; the controller returns a static `"Checkout failed"` and never echoes them.
  - "Existence-probe TOCTOU" / "not-found Error carries no code → 500." REJECT — both pre-existing (not introduced by this diff) and already adjudicated in the sibling `spec-inventory-oversell-concurrency` reviews; both paths roll back.
  - "New wire code has no client-side translation." REJECT — frontend is out of scope for this Strapi bundle and the code is not client-surfaced today.
  - "Doc-comment sale-only assumption could drift." REJECT — hypothetical/future-caller speculation.

## Design Notes

Single throw site, sign-based code selection — the row-exists branch already ran the existence probe, so the only remaining ambiguity is "why did the guard reject": capacity (sale) vs floor (refund). The delta sign that selected the guard (`tickets_sold + ? <= tickets_available` vs `>= 0`) is the same sign that selects the code:

```js
if (!exists) throw new Error(`Sub-event ${subEventId} (${kind}) not found`)
const code = delta > 0 ? TICKET_SOLD_OUT : INVENTORY_UNDERFLOW
throw Object.assign(
  new Error(
    delta > 0
      ? `Sub-event ${subEventId} sold out (requested +${delta})`
      : `Sub-event ${subEventId} refund underflow (requested ${delta})`
  ),
  { code }
)
```

Why map `INVENTORY_UNDERFLOW` in the controller even though `releaseInventory` swallows it today: the code is only meaningful if a consumer can act on it. `releaseInventory` catches-and-logs (must stay that way), but a future compensation/refund endpoint that rethrows would otherwise hit the `INTERNAL_ERROR`/500 fallback. Mapping it now keeps the distinct code honest end-to-end. 409 mirrors `TICKET_SOLD_OUT` — both are inventory-invariant conflicts.

## Verification

**Commands:**

- `cd apps/strapi && yarn jest --testMatch "**/public-api.unit.test.ts"` -- expected: all `adjustInventory` tests pass, including the retargeted `INVENTORY_UNDERFLOW` refund-underflow case and the unchanged `TICKET_SOLD_OUT` oversell case.
- `cd apps/strapi && yarn tsc --noEmit -p tsconfig.json` -- expected: no NEW type errors in `public-api.ts` or `controllers/order.ts` (pre-existing unrelated errors in `notification.ts`/`watchlist.ts` may remain).

**Manual checks (if no CLI):**

- Confirm `public-api.ts` exports `INVENTORY_UNDERFLOW`, the `affected === 0` throw selects the code by delta sign, and the sale path still throws `TICKET_SOLD_OUT`.
- Confirm `STATUS_BY_CODE` in `controllers/order.ts` maps `INVENTORY_UNDERFLOW` to 409.
- Confirm NO `apps/strapi/database/migrations/*.js` CHECK-constraint file was added and `ensureInventoryCheckConstraint` is untouched.

## Auto Run Result

Status: done

**Bundle:** `inventory-service-hardening` (DW-3, DW-6, DW-8). **Actionable work delivered: DW-6 only.**

**DW-3 / DW-8 were already resolved** by the sibling bundle `dw-inventory-oversell-concurrency` (spec `spec-inventory-oversell-concurrency.md`, status done): `adjustInventory` already performs a guarded atomic _relative_ increment (no TOCTOU window), and the Postgres `CHECK (tickets_sold <= tickets_available)` backstop already ships via the events-manager plugin `bootstrap` (`ensureInventoryCheckConstraint`), NOT a migration. The intent.md's literal "via a Strapi database migration" phrasing is superseded: a migration was proven unsound there (Strapi runs `db.migrations.up()` before creating content-type tables → fresh-Postgres boot crash). This run re-verified that state and deliberately added no inventory-write logic and no migration.

**Summary (DW-6):** The refund/release underflow path (`delta < 0`) of `adjustInventory` no longer reuses `TICKET_SOLD_OUT`. A new exported `INVENTORY_UNDERFLOW` code is thrown when a refund would drive `ticketsSold` below zero on an existing published row; the sale-oversell path (`delta > 0`) keeps throwing `TICKET_SOLD_OUT`; the missing-row path keeps its plain `/not found/` Error (no code). The ticketing order controller maps `INVENTORY_UNDERFLOW → 409` (defense-in-depth for a future rethrowing caller; `releaseInventory` still swallows-and-logs by design).

**Files changed:**

- `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` — added `export const INVENTORY_UNDERFLOW`; `affected === 0` throw now selects code + message by a single `isSale = delta > 0` predicate; `adjustInventory` doc comment updated for the sale-vs-refund split.
- `apps/strapi/src/plugins/events-manager/server/src/services/__tests__/public-api.unit.test.ts` — refund-below-zero test retargeted to assert `INVENTORY_UNDERFLOW`; oversell test still asserts `TICKET_SOLD_OUT`; `/not found/` test unchanged.
- `apps/strapi/src/plugins/ticketing/server/src/controllers/order.ts` — `STATUS_BY_CODE` gains `INVENTORY_UNDERFLOW: 409`.

**Review:** 3 adversarial reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) at session capability over the `f56dcff..HEAD` diff. Triage: 0 intent_gap, 0 bad_spec, 1 patch (low — consolidated the duplicated `delta > 0` predicate at the throw site), 0 defer, 11 reject. The dominant reviewer theme (the `INVENTORY_UNDERFLOW → 409` mapping is unreachable today because `releaseInventory` swallows the error) was rejected as the spec's explicit by-design defense-in-depth; the Verification Gap reviewer independently confirmed no shippable regression.

**Verification:** `yarn jest --testMatch "**/public-api.unit.test.ts"` → 23/23 pass (post-patch). `yarn tsc --noEmit` → no new errors in changed files (pre-existing `notification.ts`/`watchlist.ts` errors unrelated). Migrations dir confirmed clean (`.gitkeep` only); `bootstrap.ts`/`ensureInventoryCheckConstraint` untouched.

**Residual risks:** No DB-backed test exercises the new code end-to-end (the mapping line is unreachable at runtime today; a future rethrowing refund caller should add a controller test asserting the 409 mapping). This mirrors the already-ledgered DW-129 coverage gap for the inventory path — no new ledger entry warranted.
