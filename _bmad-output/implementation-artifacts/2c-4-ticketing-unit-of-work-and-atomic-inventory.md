# Story 2C.4: Ticketing Unit of Work and Atomic Inventory

Status: review

## Story

As a **developer**,
I want order creation wrapped in a transaction with atomic inventory decrement via an events-manager facade,
so that ticket sales cannot oversell capacity or orphan partial orders before Epic 6 carries real money.

## Acceptance Criteria

1. `events-manager` exposes a `public-api` service (new — does not exist yet) whose `adjustInventory(subEventId, kind, delta)` performs an **atomic conditional UPDATE** at the query-builder level: increments `ticketsSold` by `delta` only where `ticketsSold + delta <= ticketsAvailable`. Zero rows affected → throw an error carrying code `TICKET_SOLD_OUT`. This is the ONE sanctioned exception to the Document-Service-only rule, confined to this method, commented as such (architecture amendment Validation Issues section).
2. `kind` is `"screening" | "performance"`; `adjustInventory` resolves the correct table via a strategy/UID map (reuse `SUB_EVENT_UIDS` from event-manager.ts). `adjustInventory` does NOT open its own transaction (it runs inside the caller's per architecture rule).
3. `order.createOrder` is wrapped in `strapi.db.transaction(async () => {...})`: (a) validate input via Zod, (b) call `adjustInventory(+qty)` for the screening/performance (throws TICKET_SOLD_OUT if capacity exceeded), (c) create the order, (d) create the N tickets. Any throw rolls the whole unit back (no orphan order, no inventory change).
4. createOrder inputs validated with a Zod schema via a shared `validate()` helper; validation failures throw a Strapi `ValidationError` carrying an error CODE (not prose). Enforce screening XOR performance (exactly one set).
5. Hardcoded `currency: "TND"` in createOrder replaced by plugin config: `strapi.config.get("plugin::ticketing.defaultCurrency", "TND")`. Add `defaultCurrency: "TND"` to ticketing `config/index.ts` default.
6. Tests (server jest, SQLite) cover: (a) happy path — order + tickets created, ticketsSold incremented by qty; (b) oversell rejection — request exceeding remaining capacity throws TICKET_SOLD_OUT and creates NO order/tickets and leaves ticketsSold unchanged; (c) mid-loop failure rollback — a forced failure during ticket creation rolls back order + inventory; (d) concurrency — two parallel createOrder calls for the last remaining seat: exactly one succeeds, one throws TICKET_SOLD_OUT.
7. Existing suites stay green; no regressions. `yarn generate:types` still boots Strapi cleanly.

## Tasks / Subtasks

- [x] Task 1: events-manager `public-api` facade with atomic inventory (AC: 1, 2)
  - [x] Create `events-manager/server/src/services/public-api.ts`; register in services/index.ts as `"public-api"`
  - [x] Implement `adjustInventory(subEventId, kind, delta)` — SPIKE outcome: Strapi v5 query-builder `updateMany` CANNOT express the guard (its `data` only takes static values, no column-relative `ticketsSold = ticketsSold + delta`; its `where` compares a column to a literal, no column-vs-column `ticketsSold + delta <= ticketsAvailable`). Chose a single raw, atomic, capacity-guarded knex UPDATE bound to the caller's `trx`. Zero rows → throw error with `TICKET_SOLD_OUT` code. Table/column names resolved from `strapi.db.metadata` (snake_case).
  - [x] Comment the method as the sole sanctioned Document-Service exception
- [x] Task 2: Shared validation helper (AC: 4)
  - [x] Create `apps/strapi/src/shared/validation.ts` exporting `validate(schema, data)` (Zod `safeParse` → throws Strapi `ValidationError` with `details.code = VALIDATION_FAILED`)
  - [x] Create `ticketing/server/src/validation/order.ts` with `createOrderSchema` (Zod): userId? guestEmail? guestName? eventId, screeningId? performanceId? (XOR via `.refine`), tickets[] of {type, price}
- [x] Task 3: Transactional createOrder (AC: 3, 5)
  - [x] Wrap `order.createOrder` body in `strapi.db.transaction(async ({ trx }) => {...})`
  - [x] Inside: validate → resolve subEvent kind+id → `strapi.plugin("events-manager").service("public-api").adjustInventory(id, kind, +tickets.length, trx)` → create order → create N tickets
  - [x] Replace hardcoded `currency: "TND"` with `strapi.config.get("plugin::ticketing.defaultCurrency", "TND")`; add default to ticketing config/index.ts; added `zod` to apps/strapi package.json deps
  - [x] Added optional `screening`/`performance` relations to ticket-order schema so the order records the sub-event (schema had only legacy `showtime`)
- [x] Task 4: Tests (AC: 6)
  - [x] `ticketing/server/src/services/__tests__/order.unit.test.ts` — mocked strapi: happy, configured currency, oversell (TICKET_SOLD_OUT, no order), validation failure (missing + both XOR), mid-loop rollback, performance path
  - [x] `events-manager/server/src/services/__tests__/public-api.unit.test.ts` — asserts the atomic UPDATE's capacity guard (the concurrency invariant), column-relative SET, tx binding, sold-out, refund floor guard
  - [x] `ticketing/server/src/services/__tests__/order.service.test.ts` — integration (happy + oversell + concurrency) written but `describe.skip` (pre-existing integration boot `db.config.connection` failure blocks ALL integration suites, not a regression here)
  - [x] Added `apps/strapi/jest.config.ts` (ts-jest, node env) — none existed in this base lineage (2B.16 infra absent from base commit 446f578); required to run the unit gate
- [x] Task 5: Verification (AC: 7) — ALL GATES PASS
  - [x] `yarn test --testPathPattern unit` GREEN: 4 suites / 18 tests pass (new `order.unit.test.ts` + `public-api.unit.test.ts`, plus pre-existing seed suites — no regression)
  - [x] `rm -rf dist .strapi && yarn generate:types` boots Strapi cleanly: 0 warnings, 0 errors (confirms public-api registration + schema/config changes)
  - [x] grep: no foreign-UID `strapi.documents()` in production; the only cross-plugin call is ticketing → events-manager `public-api`

## Dev Notes

### Authoritative constraints (architecture amendment — MUST follow)

- `_bmad-output/project-planning-artifacts/architecture.md`:
  - **Transaction Pattern** + its **Concurrency amendment**: capacity-guarded writes use an atomic conditional UPDATE (zero rows → throw code), NOT read-then-write. Read the "Validation Issues Addressed" section — it specifies the exact SQL shape: `UPDATE screenings SET tickets_sold = tickets_sold + :qty WHERE id = :id AND tickets_sold + :qty <= tickets_available`.
  - **Facade (D8)**: ticketing calls events-manager ONLY via `public-api` (rules R3/R4). This is a sanctioned edge (ticketing already relates to events-manager.screening/performance in its schema).
  - **Rules R1–R5** are review blockers.
- Document Service API everywhere EXCEPT the single `adjustInventory` atomic UPDATE.
- Error CODES not prose (project-context.md rule). `TICKET_SOLD_OUT` is already a defined code in the original architecture's ERROR_CODES.

### Key file references (verified, file:line)

- `ticketing/server/src/services/order.ts:3-5` UID constants; `:20-84` createOrder (order create lines 51-65, ticket loop 67-81; hardcoded `currency: "TND"` line 62, `paymentStatus: "pending"` line 63). createOrder is currently NOT exposed via any route — wiring a POST route is OUT of scope for this story (Epic 6 owns the checkout endpoint); this story makes the service method correct + safe.
- `events-manager/server/src/services/event-manager.ts:230-281` existing `updateTicketInventory` (check-then-act, race acknowledged in comment lines 249-251) — do NOT call this for the sale path; `adjustInventory` is the new atomic method. Keep `updateTicketInventory` for admin manual capacity edits.
- `events-manager/server/src/services/event-manager.ts:3-13` `SUB_EVENT_UIDS` map (reuse it).
- `events-manager/server/src/services/index.ts` exports `"event-manager"`, `seed` — ADD `"public-api"`.
- screening/performance schemas: `ticketsAvailable`/`ticketsSold` are `integer default 0`; collectionNames `screenings`/`performances`; both `draftAndPublish: true` (⚠️ the atomic UPDATE must target the right published-vs-draft row — verify the query hits the row the Document Service reads; may need to filter on published state or use the documentId→id mapping).
- Test infra: `apps/strapi/tests/helpers/strapi.ts` (`setupStrapi`), `tests/fixtures/events.ts` `seedScreening({ ticketsAvailable, ticketsSold })` (line ~107) — use it to seed a capacity-1 screening for the oversell/concurrency tests.

### Critical guardrails

1. **draftAndPublish on sub-events:** screening/performance use draft+publish. The Document Service `documentId` maps to potentially two DB rows (draft + published). The atomic UPDATE via query builder operates on raw rows — make sure it targets the published row that represents live capacity (the one the sale reads). Spike this first; if it's frager than expected, an acceptable fallback is `strapi.db.transaction` with `SELECT ... FOR UPDATE` row lock then guarded update — still atomic, still inside the tx. Document whichever you choose.
2. **adjustInventory must not open its own transaction** — it's called inside createOrder's tx (architecture rule). For rollback to work, both the order/ticket writes and the inventory update must share one transaction.
3. **delta sign:** sale = `+qty` on ticketsSold; a future cancellation/refund = `-qty`. Implement `adjustInventory` to handle both signs; the capacity guard only applies when delta > 0.
4. **No new POST route** — createOrder stays a service method. Don't expose checkout here.
5. **Pre-existing scan() controller bug** (validate called with wrong arg) is OUT of scope — do not fix here.
6. **This story builds on 2C.1** (committed on branch `feat/2c-1-venues-plugin`, base commit 446f578) — the venues extraction. You are branching from that commit, so events-manager already has its venue type removed; that does not affect screening/performance/inventory work.

### Testing

- Follow Story 2B.16 pattern (`apps/strapi/jest.config.ts`, SQLite override, `tests/README.md`).
- Unit tests (mocked strapi) are the must-pass gate. Integration tests that boot Strapi may hit the pre-existing `db.config.connection` env failure — if so, write them but skip with a documented reason; do not let that block the story (it blocks ALL integration tests, not yours).
- Coverage target ≥80% for the new ticketing order code.

### Project Structure Notes

- New: `events-manager/server/src/services/public-api.ts`, `ticketing/server/src/validation/order.ts`, `apps/strapi/src/shared/validation.ts`, ticketing `__tests__/order.*.test.ts`.
- The `shared/validation.ts` helper is the first piece of the shared server kit that story 2C.5 completes — keep it minimal and dependency-free.

### References

- [Source: _bmad-output/project-planning-artifacts/architecture.md#Transaction Pattern (Unit of Work) + Concurrency amendment]
- [Source: _bmad-output/project-planning-artifacts/architecture.md#Architecture Validation Results — Oversell race resolution]
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2c-plugin-architecture-decomposition.md#Story 2C.4]
- [Source: _bmad-output/project-context.md — error-code rule, Strapi v5 Document Service rule]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

- Base-commit correction: the worktree HEAD was an unrelated lineage (19f44b6) missing the plugins; reset the working branch onto the intended base `446f578` (story 2C.1) which contains the events-manager/ticketing plugins.
- Stale story references vs. base state: `event-manager.ts` has no `SUB_EVENT_UIDS` map at base (so the map was defined locally in `public-api.ts`); the `architecture.md` path referenced by the story does not exist at this commit (the self-contained AC text was used as the authority).

### Spike outcome (query-builder vs row-lock)

Strapi v5 `strapi.db.query(uid).updateMany` CANNOT express the atomic guarded increment:
its `data` accepts only static values (no column-relative `ticketsSold = ticketsSold + delta`),
and its `where` compares a column to a literal (no column-vs-column `ticketsSold + delta <= ticketsAvailable`).
Decision: a single raw atomic capacity-guarded knex UPDATE (`strapi.db.connection(table)...andWhereRaw(...).update({ col: knex.raw('?? + ?', ...) })`),
bound to the caller's `trx` via `.transacting(trx)`. The DB rejects oversell (zero affected rows → `TICKET_SOLD_OUT`).
This is a single atomic statement, so no explicit `SELECT ... FOR UPDATE` row lock is needed.
draftAndPublish handled by guarding/incrementing on `document_id` (all versions stay in sync; a sold-out
document has zero rows passing the guard regardless of draft/published count). Table + column names are
resolved from `strapi.db.metadata.get(uid)` (snake_case), not hardcoded.

### Completion Notes List

- Implementation complete; all verification gates pass.
- Gate 1 — `yarn test --testPathPattern unit`: 4 suites / 18 tests GREEN (new ticketing + public-api
  unit suites plus pre-existing seed suites; no regression).
- Gate 2 — `rm -rf dist .strapi && yarn generate:types`: Strapi booted and generated types with 0
  warnings / 0 errors, proving the `public-api` service, ticket-order schema relations, and ticketing
  config default all register cleanly.
- Gate 3 — grep: only cross-plugin production call is `order.ts` →
  `strapi.plugin("events-manager").service("public-api")`; production `strapi.documents()` calls in
  ticketing use only ticketing UIDs.
- Env note: the worktree had no `node_modules` and asdf had no yarn pinned; ran `yarn install` once to
  populate workspace deps for the gates (node_modules is gitignored, not part of the commit). The
  temporary `yarn` line added to `.tool-versions` to let asdf resolve yarn was reverted before commit.
- No `createOrder` callers exist (no POST route — Epic 6 owns checkout), so the signature change
  (`showtimeId` → `screeningId`/`performanceId` XOR) introduces no regression. Pre-existing `scan()`
  controller bug left untouched (out of scope).

### File List

New:

- apps/strapi/src/shared/validation.ts
- apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts
- apps/strapi/src/plugins/events-manager/server/src/services/**tests**/public-api.unit.test.ts
- apps/strapi/src/plugins/ticketing/server/src/validation/order.ts
- apps/strapi/src/plugins/ticketing/server/src/services/**tests**/order.unit.test.ts
- apps/strapi/src/plugins/ticketing/server/src/services/**tests**/order.service.test.ts
- apps/strapi/jest.config.ts

Modified:

- apps/strapi/src/plugins/events-manager/server/src/services/index.ts (register "public-api")
- apps/strapi/src/plugins/ticketing/server/src/services/order.ts (transactional createOrder)
- apps/strapi/src/plugins/ticketing/server/src/config/index.ts (defaultCurrency default)
- apps/strapi/src/plugins/ticketing/server/src/content-types/ticket-order/schema.json (screening/performance relations)
- apps/strapi/package.json (add zod dependency)

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-14 | Implemented atomic inventory facade (`public-api.adjustInventory`), transactional `order.createOrder`, shared Zod `validate()` helper + order schema, config-driven currency, ticket-order sub-event relations, unit tests + skipped integration test, jest config. Gates: unit tests 18/18 green; `generate:types` boots with 0 errors; grep R4 boundary clean. Status → review. |
