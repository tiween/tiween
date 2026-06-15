# Deferred Work

## Deferred from: code review of 2b-16-events-manager-plugin-test-coverage.md (2026-06-08)

- ~~Missing validation for date/time strings in service [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — invalid inputs currently lead to 500 errors.~~ **RESOLVED 2026-06-11** — up-front validation of dates/time/price/ticketsAvailable in `createBulkShowtimes` (no partial writes), clear error messages surfaced as 400 by the controller; 9 unit tests added.
- ~~Missing bounds check for ticket inventory [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — allows negative values (overselling).~~ **RESOLVED 2026-06-11** — `updateTicketInventory` enforces non-negative integers and `ticketsSold ≤ ticketsAvailable` (including against already-sold tickets when only capacity changes); 7 unit tests added.

## Deferred from: code review of event-manager validation fixes (2026-06-11)

- TOCTOU race in `updateTicketInventory` [apps/strapi/src/plugins/events-manager/server/src/services/event-manager.ts] — the read-then-update window allows a concurrent purchase to bump `ticketsSold` past the validated capacity. The service guard catches operator mistakes, not races. Follow-up: add a PostgreSQL `CHECK (tickets_sold <= tickets_available)` constraint via a Strapi database migration so the RDBMS is the final enforcer. Relevant when Epic 6 (B2C ticketing) makes concurrent purchases real.
