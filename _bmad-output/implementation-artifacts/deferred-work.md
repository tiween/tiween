# Deferred Work

## Deferred from: code review of 2b-16-events-manager-plugin-test-coverage.md (2026-06-08)

- ~~Missing validation for date/time strings in service [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — invalid inputs currently lead to 500 errors.~~ **RESOLVED 2026-06-11** — up-front validation of dates/time/price/ticketsAvailable in `createBulkShowtimes` (no partial writes), clear error messages surfaced as 400 by the controller; 9 unit tests added.
- ~~Missing bounds check for ticket inventory [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — allows negative values (overselling).~~ **RESOLVED 2026-06-11** — `updateTicketInventory` enforces non-negative integers and `ticketsSold ≤ ticketsAvailable` (including against already-sold tickets when only capacity changes); 7 unit tests added.

## Deferred from: code review of event-manager validation fixes (2026-06-11)

- TOCTOU race in `updateTicketInventory` [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — the read-then-update window allows a concurrent purchase to bump `ticketsSold` past the validated capacity. The service guard catches operator mistakes, not races. Follow-up: add a PostgreSQL `CHECK (tickets_sold <= tickets_available)` constraint via a Strapi database migration so the RDBMS is the final enforcer. Relevant when Epic 6 (B2C ticketing) makes concurrent purchases real.

## Deferred from: code review of 2c-4-ticketing-unit-of-work (2026-06-15)

- Transaction threading of order/ticket Document Service writes rests on Strapi v5 AsyncLocalStorage auto-join (verified documented-correct; execution proof is the skipped integration test). Re-confirm when integration suite boots.
- Integration test `order.service.test.ts` is `describe.skip` due to pre-existing `db.config.connection` env failure blocking all integration suites. When un-skipped, add a `status: published` screening fixture so the inventory path is exercised against a real published row.
- Refund path (delta<0) in adjustInventory: no upper bound / idempotency, shares TICKET_SOLD_OUT code. No refund caller wired yet (Epic 6) — give a distinct code when implemented.

### Resolved + re-scoped 2026-06-15 (Ayoub: ticketing ships post-GTM)
- **draftAndPublish double-count — RESOLVED.** `adjustInventory` was rewritten from a raw-knex atomic UPDATE to a Document Service read-modify-write that reads/writes `status: "published"`, so it operates on the single live row (no draft+published double-count). Raw SQL removed entirely (per Ayoub's "never do plain SQL queries" rule). Unit tests rewritten against the Document Service mock (8 tests, green).
- **Concurrency NOT handled — deferred to Epic 6 (DEadline: before ticketing goes live).** The rewrite is a plain read-modify-write: two concurrent buyers can both read the same `ticketsSold`, both pass the JS capacity check, and both write — overselling the last seat. Acceptable for now because ticketing is not on the path to first production. Before Epic 6 ships B2C ticketing, add a concurrency-safe reservation. Preferred: a PostgreSQL `CHECK (tickets_sold <= tickets_available)` constraint via a Strapi DB migration (the RDBMS becomes the final enforcer; catch the violation → throw `TICKET_SOLD_OUT`). Alternatives considered: row lock (`FOR UPDATE`), optimistic version field. Code carries an inline "CONCURRENCY NOT HANDLED (deferred to Epic 6)" comment pointing here.
