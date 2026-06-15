# Story 2C.4: Ticketing Unit of Work and Atomic Inventory

Status: review

<!-- Implemented on branch feat/2c-4-ticketing-uow (commit 5dfa1bd), based on
2C.1 (446f578). Gate note: the initial agent run mis-reported the unit gate —
order.unit.test.ts failed to COMPILE (ts-jest outDir error on the cross-tree
shared/validation import). Fixed by adding isolatedModules:true + displayName to
jest.config.ts. Independently re-verified: 18/18 unit tests pass, Strapi boots
clean under type-gen (0 errors). The atomic capacity-guarded knex UPDATE in
events-manager public-api.ts is the correct race-safe oversell guard. -->

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

- [ ] Task 1: events-manager `public-api` facade with atomic inventory (AC: 1, 2)
  - [ ] Create `events-manager/server/src/services/public-api.ts`; register in services/index.ts as `"public-api"`
  - [ ] Implement `adjustInventory(subEventId, kind, delta)` using `strapi.db.query(uid).updateMany({ where: { documentId, ticketsSold: { $lte: <available - delta> } }, data: ... })` OR a knex-level conditional update — whichever Strapi v5 supports for an atomic guarded increment (verify with a quick spike; the invariant is: the WHERE clause must include the capacity guard so the DB rejects oversell, not app code). Zero rows → throw error with `TICKET_SOLD_OUT` code.
  - [ ] Comment the method as the sole sanctioned Document-Service exception (cite architecture amendment)
- [ ] Task 2: Shared validation helper (AC: 4)
  - [ ] Create `apps/strapi/src/shared/validation.ts` exporting `validate(schema, data)` that runs Zod `safeParse` and throws Strapi `ValidationError` with a code on failure (this seeds the shared kit that 2C.5 expands)
  - [ ] Create `ticketing/server/src/validation/order.ts` with `createOrderSchema` (Zod): userId? guestEmail? guestName? eventId, screeningId? performanceId? (XOR), tickets[] of {type, price}
- [ ] Task 3: Transactional createOrder (AC: 3, 5)
  - [ ] Wrap `order.createOrder` body in `strapi.db.transaction(async () => {...})`
  - [ ] Inside: validate(createOrderSchema, input) → resolve subEvent kind+id → `strapi.plugin("events-manager").service("public-api").adjustInventory(subEventId, kind, +tickets.length)` → create order → create N tickets
  - [ ] Replace hardcoded `currency: "TND"` with `strapi.config.get("plugin::ticketing.defaultCurrency", "TND")`; add default to ticketing config/index.ts
- [ ] Task 4: Tests (AC: 6)
  - [ ] `ticketing/server/src/services/__tests__/order.unit.test.ts` — unit tests with mocked strapi (happy, oversell, validation failure)
  - [ ] `ticketing/server/src/services/__tests__/order.service.test.ts` — integration (boot Strapi via tests/helpers) covering happy + oversell + concurrency (two parallel createOrder for last seat). NOTE: integration jest currently fails to boot on a pre-existing `db.config.connection` issue (see story 2C.1 notes) — if it still fails in your env, mark the integration test written-but-skipped with a clear reason and ensure the UNIT tests fully cover happy/oversell/rollback; the concurrency assertion can be a unit test asserting the atomic UPDATE's WHERE guard is present.
- [ ] Task 5: Verification (AC: 7)
  - [ ] `yarn test --testPathPattern unit` green incl. new ticketing tests
  - [ ] `yarn generate:types` boots Strapi cleanly (0 errors)
  - [ ] grep: no new foreign-UID `strapi.documents()` calls (rule R4); the only cross-plugin call is ticketing → events-manager public-api

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

### Debug Log References

### Completion Notes List

### File List
