# Epic 2C: Plugin Architecture Decomposition (TRACK B continuation) [MVP-partial → Phase 2 gate]

> **Source:** Architecture amendment `_bmad-output/project-planning-artifacts/architecture.md`
> (2026-06-12, status complete). Story ACs derive from its migration checklists;
> implementation MUST follow its dependency rules R1–R5 and pattern definitions.

The Strapi backend is decomposed into clean bounded-context plugins: a new `venues`
plugin (unblocking Epic 7 RBAC), a single catalog of record in `creative-works`,
a scheduling-only `events-manager`, and a transactionally-safe `ticketing` plugin
(unblocking Epic 6). Each story is independently shippable as one PR batching
server + client changes.

**Sequencing rules:**

- 2C.2 gates 2C.3 (data audit before catalog move)
- 2C.4 may run before 2C.3, but never concurrently with it
- ⚠️ The events-manager admin UI rebuild (formerly OpenSpec
  `add-events-manager-admin-ui`, retired — see
  `openspec-retirement-ledger-2026-06-12.md`) is re-planned AFTER 2C.3 against
  post-move UIDs
- 2C.1 gates Epic 7; 2C.4 gates Epic 6
- 2C.1 also retargets the existing venues admin UI (formerly OpenSpec
  `add-venues-admin-ui`, effectively complete) to `plugin::venues.*`

---

## Story 2C.1: Extract Venues Plugin

As a **developer**,
I want venue ownership extracted into a dedicated `venues` plugin (absorbing the entity-properties types),
So that Epic 7's Venue Manager role has a clean permission boundary and venue-domain features have a home.

**Acceptance Criteria:**

**Given** the current `events-manager` plugin owns the `venue` content type
**When** I extract the `venues` plugin
**Then** a new plugin exists at `src/plugins/venues/` scaffolded by sibling-cloning `geography` (package.json identity renamed, AR/FR/EN translations present)
**And** it is registered in `config/plugins.ts`
**And** `venue/schema.json` is moved verbatim with `collectionName: "venues"` preserved (no table migration)
**And** `property-category` and `property-definition` schemas are moved from entity-properties with collectionNames preserved
**And** `event.schema.json`'s venue relation targets `plugin::venues.venue`
**And** venue services move with a `public-api` facade service; content-api routes serve `/venues/*`
**And** permissions are re-seeded: `plugin::events-manager.venue` actions removed, `plugin::venues.venue` granted to public read + Venue Manager role
**And** events-manager admin `useVenues*` hooks reference the new UID constants
**And** client `lib/api/content/venues.ts` paths change from `/events-manager/venues` to `/venues` in the same PR
**And** grep gate passes: zero remaining `events-manager.venue` references
**And** dev smoke test: venue listing and venue detail pages render

---

## Story 2C.2: Catalog Collision Data Audit

As a **developer**,
I want a data audit of the person/genre/category overlap between events-manager and creative-works catalogs,
So that the catalog move (2C.3) has a decided, evidence-based merge strategy before any schema moves.

**Acceptance Criteria:**

**Given** both plugins define `person` (and creative-works defines genre/category) with potentially overlapping data
**When** I run the audit
**Then** a report documents per colliding type: collectionName of each side, row counts per environment, overlap analysis (matching names/slugs), and which side TMDB imports write to
**And** a decision is recorded: merge into the surviving type OR rename-then-migrate, with row-level migration mapping
**And** the credit relations rewrite plan (credit.person targets) is specified
**And** the decision is appended to the architecture amendment's Gap Analysis as resolved
**And** 2C.3 is blocked until this story is done

---

## Story 2C.3: Catalog Move into Creative-Works

As a **developer**,
I want the catalog types (movie, play, person, character, credit) moved from events-manager into creative-works,
So that the platform has a single catalog of record and watchlist + ticketing point at the same entities.

**Acceptance Criteria:**

**Given** 2C.2's audit decision is recorded
**When** I move the catalog types
**Then** movie, play, person, character, credit schemas move verbatim (collectionNames preserved; only relation target UIDs change)
**And** the person/genre collision is resolved per the 2C.2 decision, including data migration if merging
**And** `screening.movie` and `performance.play` relations target creative-works UIDs
**And** the credit XOR lifecycle subscriber (`lifecycles/credit.ts` + bootstrap registration) moves to creative-works
**And** permissions are re-seeded for all moved types with the same role grants
**And** events-manager admin hooks (useCreativeWorks, usePeople) reference new UIDs
**And** client paths for shorts/search/event-detail populate chains reference moved types correctly
**And** grep gate passes: zero `plugin::events-manager.(movie|play|person|character|credit)` references
**And** existing events-manager test suite passes against the retargeted relations

---

## Story 2C.4: Ticketing Unit of Work and Atomic Inventory

As a **developer**,
I want order creation wrapped in a transaction with atomic inventory decrement via an events-manager facade,
So that ticket sales cannot oversell capacity or orphan partial orders before Epic 6 carries real money.

**Acceptance Criteria:**

**Given** `order.createOrder` currently creates order + N tickets with no transaction and no inventory update
**When** I implement the Unit of Work
**Then** `events-manager` exposes `public-api.adjustInventory(subEventId, kind, delta)` performing an atomic conditional UPDATE (`tickets_sold + qty <= tickets_available` in the WHERE clause; zero rows → throw `TICKET_SOLD_OUT`) — the one sanctioned Document-Service exception, commented as such
**And** `order.createOrder` wraps availability + order + tickets + adjustInventory in `strapi.db.transaction`
**And** createOrder inputs are validated with Zod via the shared `validate()` helper, errors returned as codes
**And** tests cover: happy path, oversell rejection, mid-loop failure rollback, and concurrency (two parallel orders for the last seat — exactly one succeeds)
**And** hardcoded `currency: "TND"` is replaced by `defaultCurrency` plugin config
**And** this story does not run concurrently with 2C.3

---

## Story 2C.5: Consolidation Sweep

As a **developer**,
I want the cross-plugin conventions consolidated (strategy map, facades, shared kit, entity-properties removal),
So that the decomposed plugins enforce the architecture amendment's patterns going forward.

**Acceptance Criteria:**

**Given** stories 2C.1–2C.4 are done
**When** I run the consolidation sweep
**Then** `events-manager/server/src/strategies/sub-event.ts` exports the `subEventStrategy` map and service bodies no longer branch on `if (kind === ...)`
**And** `creative-works`, `venues`, and `geography` expose `public-api` facade services
**And** the shared server kit exists at `apps/strapi/src/shared/` (validate helper, typed Context, policy helpers, error-code constants, test utilities)
**And** the entity-properties plugin shell is deleted along with its `config/plugins.ts` entry
**And** touched controllers use `ctx: Context` and return error codes (no prose messages)
**And** grep gate passes: no foreign-UID `strapi.documents()` calls outside sanctioned facades (rules R3/R4)

---
