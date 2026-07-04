---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: "complete"
completedAt: "2026-06-12"
inputDocuments:
  - "_bmad-output/architecture/index.md (existing architecture — authoritative baseline)"
  - "_bmad-output/architecture/core-architectural-decisions.md"
  - "_bmad-output/architecture/project-structure-boundaries.md"
  - "_bmad-output/architecture/implementation-patterns-consistency-rules.md"
  - "_bmad-output/prd/functional-requirements.md"
  - "_bmad-output/prd/product-scope.md"
  - "_bmad-output/project-planning-artifacts/epics/epic-dependencies.md"
  - "_bmad-output/project-context.md"
workflowType: "architecture"
documentMode: "amendment"
amendmentScope: "Strapi plugin decomposition — backend module structure only. The existing sharded architecture at _bmad-output/architecture/ remains authoritative for all other concerns (stack, auth, infra, QR, testing)."
project_name: "tiween-bmad-version"
user_name: "Ayoub"
date: "2026-06-12"
---

# Architecture Decision Document — Amendment: Strapi Plugin Decomposition

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

_Mode: **Amendment** to the existing architecture (`_bmad-output/architecture/`). Scope: backend plugin boundaries, dependency-direction rules, and migration sequencing. Where this document and the original conflict on backend module structure, this document supersedes._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (architectural implications for plugin structure):**

The PRD's 66 FRs cluster into domains that map directly onto backend module
boundaries — the decomposition follows requirement seams, not technical whim:

| FR Cluster                                                 | Phase       | Plugin Home (current → target)                          |
| ---------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| Discovery FR1–10 (showtimes, filtering, film/venue detail) | MVP (live)  | events-manager + creative-works + geography (unchanged) |
| Accounts FR11–18                                           | MVP (live)  | users-permissions ext. (unchanged)                      |
| Watchlist FR19–23                                          | Phase 2     | user-engagement (unchanged)                             |
| B2C Ticketing FR24–31                                      | Phase 2     | ticketing → ticketing + payments (ACL)                  |
| B2B Venue FR32–40                                          | Phase 2     | events-manager.venue → **new `venues` plugin**          |
| Validation FR41–46 (scanner)                               | Phase 2     | ticketing (stays)                                       |
| Admin FR47–53                                              | MVP-partial | Strapi admin roles (cross-plugin RBAC)                  |
| Content FR54–58 (i18n, media)                              | MVP (live)  | cross-cutting, all plugins                              |
| Real-time FR64–66                                          | Phase 2     | deferred — out of amendment scope                       |

**Non-Functional Requirements driving the decomposition:**

- Role-based isolation: Venue Manager (FR32–40) and venue staff (FR41–46) need
  permission boundaries; Strapi RBAC granularity follows plugin boundaries.
- Financial integrity: FR24–31 require atomic order+ticket+inventory writes —
  currently absent (no transactions, no inventory decrement on sale).
- i18n (FR54–56): AR/FR/EN on all localized content types — every moved
  content type must preserve localization config.

**Scale & Complexity:**

- Primary domain: backend module architecture (Strapi v5 plugin monolith)
- Complexity level: medium — structural refactor of a live MVP, no new tech
- Architectural components: 7 plugins today → 8 target (+1 future payments)

### Technical Constraints & Dependencies

1. **Live MVP**: cinema discovery is in production scope; every migration step
   must be independently shippable with client+server changes batched per step.
2. **Strapi v5 plugin mechanics**: UIDs (`plugin::<name>.<type>`) appear in
   schema relation targets, permission seeds, admin hooks, and client endpoint
   paths. `collectionName` is plugin-agnostic — preserving it avoids DB table
   migrations; only UID references migrate.
3. **Catalog of record = creative-works' unified `creative-work`** (REVISED
   2026-06-15): the June-12 theatre redesign (`creative-work` type enum +
   typed components) is the catalog. events-manager's legacy `movie`/`play`
   are retired. Both catalogs were empty, so this is schema-only.
   user-engagement already points at creative-works; ticketing points at
   events-manager sub-events (scheduling), whose `.movie`/`.play` relations
   retarget to `creative-work`.
4. **Epic dependency order**: Epics 6/7/8 (Phase 2) all gate on Epic 4 (auth,
   done). None started — the decomposition must land before they do.
5. **Documented architecture drift**: the original architecture document
   prescribes `src/api/` content types and a single events-manager plugin;
   the implemented system is 7 plugins. This amendment re-baselines the
   documented backend structure to match and improve reality.

### Cross-Cutting Concerns Identified

- **Dependency direction discipline**: cross-plugin schema relations exist
  (ticketing → events-manager; user-engagement → creative-works) and must
  remain acyclic with explicit rules.
- **Permission seeds & RBAC**: every UID move invalidates seeded permissions;
  each migration step needs a permission re-seed checklist entry.
- **Client endpoint coupling**: Next.js `lib/api/content/*` hardcodes plugin
  route prefixes (`/events-manager/venues` etc.); endpoint moves must batch
  with server changes per step.
- **Inventory integrity**: ticketsAvailable/ticketsSold live on events-manager
  sub-events while sales live in ticketing — the seam where transaction +
  facade-call work lands.
- **i18n preservation**: localized fields and existing locale content must
  survive content-type moves unchanged.

## Starter Template Evaluation

### Primary Technology Domain

Brownfield amendment — the application starter (notum-cz/strapi-next-monorepo-starter)
was selected in the original architecture and is in production. The scaffolding
decision for this amendment is narrower: **how to bootstrap the new `venues`
plugin** (and later the `payments` plugin) inside `apps/strapi/src/plugins/`.

### Starter Options Considered

| Option                                                             | What it gives                                                                                                                                                                                           | Fit                                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npx @strapi/sdk-plugin@6.1.1 init` (official, verified current)   | Publishable-package layout: build/watch/verify scripts, dual server+admin bundles, exports map                                                                                                          | Overkill — local plugins are source-loaded from `src/plugins/`, not packaged; generated layout diverges from the 7 existing plugins |
| **Sibling-clone of `geography`** (19 files, cleanest local plugin) | Exact local conventions: `strapi-server.js`/`strapi-admin.js` entries, TS server/admin split, content-types/services/controllers/routes layout, AR/FR/EN translations, peer-dep `@strapi/strapi ^5.0.0` | Best — guarantees structural consistency with existing plugins, zero new tooling                                                    |
| `strapi-plugin-dev:scaffold-plugin` project skill                  | Automates the sibling-pattern scaffold                                                                                                                                                                  | Use as the execution vehicle for the clone approach                                                                                 |

### Selected Starter: Sibling-clone of `geography` (via scaffold-plugin skill)

**Rationale for Selection:**
Consistency is the architecture here — eight plugins following one structure is
worth more than any individual scaffold's features. `geography` is the smallest,
cleanest exemplar (read-only content-api, localized content types, no drift).
The official SDK layout targets npm-publishable plugins, which these are not.

**Initialization Command:**

```bash
# New plugin scaffold = copy geography's skeleton, rename, empty the domain
cp -r apps/strapi/src/plugins/geography apps/strapi/src/plugins/venues
# then: rename in package.json (name, strapi.name, displayName),
# clear content-types/services/controllers/routes, register in config/plugins.ts
# (or run the strapi-plugin-dev:scaffold-plugin skill with name=venues)
```

**Architectural Decisions Provided by Starter (the sibling pattern):**

- **Language & Runtime:** TypeScript strict, server code under `server/src/`,
  admin under `admin/src/`, entries `strapi-server.js` / `strapi-admin.js`
- **Code Organization:** `content-types/<type>/schema.json`, `services/`,
  `controllers/`, `routes/{content-api,admin-api}.ts`, `policies/`
- **i18n:** `admin/src/translations/{en,fr,ar}.json` mandatory
- **Conventions carried over:** hand-rolled `({ strapi }) => ({...})` factories,
  module-level UID constants, Document Service API only, string route handlers
- **Registration:** enabled + resolved by path in `apps/strapi/config/plugins.ts`

**Note:** Scaffolding the `venues` plugin via this pattern is the first
implementation story of migration step 1.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- D1 — Extract `venues` plugin from events-manager (unblocks Epic 7 RBAC scoping)
- D2 — creative-works' unified `creative-work` (type: film | short-film | play)
  is the single catalog of record. The events-manager normalized catalog
  (movie, play) is RETIRED. People graph: `person` + `character` content types
  - a NEW `credit-role` content type (crew vocabulary; named to avoid the Strapi
    RBAC `role` collision). `cast[]` (→ person, character) and `credits[]`
    (→ person, credit-role) are repeatable COMPONENTS on creative-work; `videos[]`
    gains a `videoType` enum (trailer/teaser/clip/…). No dynamic zone (rejected —
    keep data structured/queryable). [REVISED 2026-06-15 — inverts the earlier
    "normalized movie/play wins" direction; see sprint-change-proposal-2026-06-15.]
- D3 — Ticketing order creation becomes a Unit of Work: `strapi.db.transaction`
  wrapping availability check → order+tickets create → inventory decrement via
  events-manager facade (must land before Epic 6 carries real money)

**Important Decisions (Shape Architecture):**

- D4 — Dependency-direction rules (acyclic; see table below)
- D5 — `payments` plugin: dedicated Anti-Corruption-Layer plugin for Konnect,
  mirroring tmdb-integration; created when Epic 6 starts, not before
- D6 — entity-properties folds into `venues` as its amenity/metadata system
- D7 — screening/performance stay separate content types; shared logic
  extracted into a `subEventStrategy[kind]` map (no data migration)
- D8 — Facade convention: each plugin exposes one named service as its only
  sanctioned cross-plugin entry point

**Deferred Decisions (Post-MVP / out of amendment scope):**

- Real-time inventory updates (FR64–66) — original architecture's WebSocket
  decision stands; lands after the inventory facade exists
- Notifications/reviews plugin split — revisit when a second engagement
  feature lands (Rule of Three)

### Data Architecture (Plugin Domain Ownership)

Target plugin map — 8 plugins, each one bounded context:

| Plugin                 | Owns (content types)                                                       | Notes                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `creative-works`       | creative-work (type enum), person, character, credit-role, genre, category | Single catalog of record; rich unified core + `cast[]`/`credits[]`/`videos[]` components. `movie`/`play` retired (no XOR lifecycle needed) |
| `venues` ✨            | venue + entity-properties' property-category, property-definition          | New; serves Epic 7 B2B + Venue Manager RBAC                                                                                                |
| `events-manager`       | event, screening, performance, feature, event-group                        | Scheduling only; `screening.movie` → creative-work, `performance.play` → creative-work                                                     |
| `ticketing`            | ticket-order, ticket                                                       | + scanning; Unit-of-Work order creation                                                                                                    |
| `payments` ✨ (future) | none — Konnect client, webhook, status mapping                             | Created with Epic 6; ACL pattern per tmdb-integration                                                                                      |
| `user-engagement`      | user-watchlist                                                             | Unchanged; future engagement features land here until Rule of Three                                                                        |
| `geography`            | region, city                                                               | Unchanged                                                                                                                                  |
| `tmdb-integration`     | none                                                                       | Unchanged; reference ACL implementation                                                                                                    |

Database/cache/search decisions inherited unchanged from original architecture
(PostgreSQL 16, Redis 7, Algolia). All content-type moves preserve
`collectionName` — **no table migrations**, only UID reference updates.

### Authentication & Security

Inherited unchanged (NextAuth JWT, bcrypt, HMAC-SHA256 QR). Amendment adds:

- Venue Manager role permissions re-seed against `plugin::venues.*` UIDs
- Konnect webhook signature verification isolated in `payments` plugin (D5)
- Plugin policies remain plugin-local; shared auth helpers go to the
  server-local shared kit (see patterns step)

### API & Communication Patterns

- REST inherited; plugin route prefixes change with moves:
  `/events-manager/venues/*` → `/venues/*` (client batched per step)
- **Dependency-direction rules (D4)** — the amendment's core law:

| Rule | Statement                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| R1   | Cross-plugin schema relations and service calls form one acyclic graph                                                                |
| R2   | A plugin may call another's services only along an edge that already exists in its schema relations (e.g. ticketing → events-manager) |
| R3   | Cross-plugin service calls go through the target's facade service only (D8)                                                           |
| R4   | No plugin reaches into another's content types via `strapi.documents()` with a foreign UID — facade or schema relation only           |
| R5   | Integration plugins (tmdb, payments) depend on nothing; anyone may call them                                                          |

Sanctioned edges: ticketing → events-manager (inventory), ticketing → payments
(future), user-engagement → creative-works, events-manager → creative-works
(catalog relation), venues ← events-manager (event.venue), \* → users-permissions.

### Frontend Architecture

Inherited unchanged. Amendment impact limited to `lib/api/content/*` endpoint
path updates, batched per migration step (no API-shape changes — Strapi
response format rule unaffected).

### Infrastructure & Deployment

Inherited unchanged (Dokploy, Docker, GitHub Actions). No new containers;
plugin moves are code-level only.

### Decision Impact Analysis

**Implementation Sequence:**

1. Step 1 — Scaffold `venues` (sibling-clone), move venue type +
   entity-properties types, retarget `event.venue`, re-seed permissions,
   update client paths (one PR)
2. Step 2 — Consolidate catalog on creative-works (`creative-work` type enum
   wins; retire movie/play; add credit-role + cast[]/credits[] components),
   retarget screening/performance relations, update admin hooks + client paths
   (one PR)
3. Step 3 — Ticketing Unit of Work + inventory facade + tests (can precede
   step 2 if Epic 6 is hotter; never concurrent with it)
4. Step 4 — `subEventStrategy` extraction; facade convention sweep; delete
   entity-properties plugin shell
5. With Epic 6 — create `payments` plugin (ACL pattern)

**Cross-Component Dependencies:**

- Step 1 & 2 each rewrite UIDs hardcoded in the Next.js client → batch
  server+client per PR
- Step 3's facade call lands on post-step-2 UIDs if sequenced after
- Venue Manager RBAC (Epic 7) blocked until step 1; Konnect (Epic 6)
  independent of steps 1–2 but needs step 3

## Implementation Patterns & Consistency Rules

_Scope: Strapi plugin layer only. Frontend and general patterns in the original
architecture (`implementation-patterns-consistency-rules.md`) remain in force._

### Pattern Categories Defined

8 conflict points where agents implementing plugin work could diverge.

### Plugin Code Patterns (codifying the existing, verified convention)

| Concern                       | Rule                                                                                                                      | Example                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Service/controller definition | Hand-rolled factory `({ strapi }: { strapi: Core.Strapi }) => ({...})` — NOT `createCoreService/Controller`               | all 7 existing plugins            |
| UID references                | Module-level constants only: `const PLUGIN_ID = "x"; const Y_UID = \`plugin::${PLUGIN_ID}.y\`` — never inline UID strings | `ticketing/services/order.ts:3-5` |
| Data access                   | Document Service API only (`strapi.documents(UID)`) — no entityService, no `db.query` in business code                    | enforced by strapi-reviewer agent |
| Route handlers                | String references `"controller.method"`; routes in `routes/{content-api,admin-api}.ts`                                    | existing convention               |
| Controller typing             | `ctx: Context` (koa) — `ctx: any` is an anti-pattern to burn down as files are touched                                    | replaces current `any`            |
| Admin translations            | `admin/src/translations/{en,fr,ar}.json` required for every plugin                                                        | existing convention               |

### Facade Pattern (D8)

- Every plugin exposes **one** service named **`public-api`** as its sole
  cross-plugin entry point: `strapi.plugin("events-manager").service("public-api")`.
- `public-api` methods are the plugin's contract: typed params/returns, no ctx,
  no Strapi internals leaked. Internal services are private by convention.
- First implementations: `events-manager.public-api.adjustInventory(...)`
  (called by ticketing), `creative-works.public-api.findWork(...)`.
- Anti-pattern: calling another plugin's internal service or using a foreign
  UID with `strapi.documents()` (rule R4).

### Validation Pattern

- Zod schemas in `server/src/validation/<controller>.ts` per plugin.
- Controllers call a shared helper: `const body = validate(createOrderSchema, ctx.request.body)`
  — throws Strapi `ValidationError` carrying an error CODE.
- Error responses carry codes (`TICKET_SOLD_OUT`), never prose — translation
  happens in the client (existing rule, now enforced server-side too).

### Transaction Pattern (Unit of Work)

- Any service method performing 2+ writes wraps them in `strapi.db.transaction(async () => {...})`.
- Availability/invariant checks happen INSIDE the transaction (re-read, then write).
- Cross-plugin facade calls that write (e.g. `adjustInventory`) are called inside
  the caller's transaction; facades must not open their own.
- **Concurrency amendment (from validation):** capacity-guarded writes use an
  atomic conditional UPDATE at the query-builder level (zero rows → throw code),
  not read-then-write — the one sanctioned Document-Service exception, confined
  to `adjustInventory`. See Architecture Validation Results.

### Sub-Event Strategy Pattern (D7)

- `events-manager/server/src/strategies/sub-event.ts` exports
  `subEventStrategy: Record<"screening" | "performance", SubEventStrategy>`
  (UID, parent relation field, work relation field, defaults).
- Services resolve behavior via the map — no `if (kind === ...)` branching in
  service bodies.

### Shared Server Kit

- Location: `apps/strapi/src/shared/` (relative imports; NOT a workspace
  package — `packages/shared-types` was deliberately deleted).
- Allowed: `validate()` helper, typed `Context` re-export, policy helpers
  (`requireUser`), error-code constants, test utilities.
- Forbidden: domain logic, content-type access, plugin-specific code.

### Content-Type Move Mechanics (steps 1 & 2)

When moving a content type between plugins, agents MUST:

1. Copy `schema.json` verbatim — change ONLY relation `target` UIDs; never
   touch `collectionName`, attribute names, or localization flags.
2. Move lifecycle subscribers with their content type when applicable.
3. Re-seed permissions: old `plugin::<old>.<type>` actions removed, new
   `plugin::<new>.<type>` actions granted to the same roles (incl. Venue Manager).
4. Update admin hooks' UID constants and content-manager links.
5. Update client `lib/api/content/*` route prefixes in the same PR.
6. Grep-verify: zero remaining references to the old UID before merge.

### Enforcement Guidelines

**All AI Agents MUST:**

- Follow dependency rules R1–R5 (Core Decisions) — violations are review blockers
- Use the strapi-plugin-dev:strapi-reviewer agent on any plugin server change
- Keep each migration step to ONE PR batching server + client changes
- Run the existing events-manager test suite + new tests before merging moves

**Anti-Patterns (plugin layer):**

| Anti-Pattern                                                  | Correct Approach                       |
| ------------------------------------------------------------- | -------------------------------------- |
| `strapi.documents("plugin::other.thing")` from another plugin | Facade `public-api` or schema relation |
| Inline UID string literals                                    | Module-level UID constants             |
| `ctx: any` in new/touched code                                | `ctx: Context`                         |
| Multi-write without transaction                               | Unit of Work pattern                   |
| `ctx.badRequest("Human readable message")`                    | `ctx.badRequest("ERROR_CODE")`         |
| New plugin from `@strapi/sdk-plugin init` layout              | Sibling-clone of geography             |
| Hardcoded `"fr"`, `"TND"` defaults                            | Plugin config via `config/plugins.ts`  |

## Project Structure & Boundaries (Target State)

### Backend Structure — supersedes the original architecture's `apps/strapi` section

```
apps/strapi/src/
├── index.ts                          # register/bootstrap (lifecycles, role seeds)
├── bootstrap/                        # venue-manager-role, i18n-locales (existing)
├── lifeCycles/                       # adminUser, user (existing)
├── shared/                           # ✨ server kit (NOT a workspace package)
│   ├── validation.ts                 # validate(schema, data) → ValidationError(code)
│   ├── context.ts                    # typed koa Context re-export
│   ├── policies.ts                   # requireUser etc.
│   ├── error-codes.ts                # SCREAMING_SNAKE constants
│   └── testing.ts                    # strapi mock helpers
└── plugins/
    ├── creative-works/               # CATALOG (unified creative-work, type enum)
    │   └── server/src/
    │       ├── content-types/        # creative-work, person, character,
    │       │                         #   credit-role, genre, category
    │       ├── components/           # cast[], credits[], videos[] (videoType enum)
    │       ├── services/             # creative-work, person, public-api ✨
    │       ├── controllers/  routes/  validation/
    ├── venues/                       # ✨ NEW — B2B venue domain (Epic 7)
    │   └── server/src/
    │       ├── content-types/        # venue (moved), property-category,
    │       │                         #   property-definition (from entity-properties)
    │       ├── services/             # venue, public-api
    │       ├── controllers/  routes/  policies/   # is-venue-manager
    ├── events-manager/               # SCHEDULING only
    │   └── server/src/
    │       ├── content-types/        # event, screening, performance,
    │       │                         #   feature, event-group
    │       ├── strategies/sub-event.ts   # ✨ subEventStrategy map (D7)
    │       ├── services/             # event-manager, seed, public-api ✨
    │       │                         #   public-api.adjustInventory()
    │       ├── controllers/  routes/  validation/
    ├── ticketing/                    # COMMERCE
    │   └── server/src/
    │       ├── content-types/        # ticket-order, ticket
    │       ├── services/             # order (Unit of Work ✨), ticket, public-api
    │       ├── controllers/  routes/  policies/  validation/
    │       └── __tests__/            # ✨ order transaction + inventory tests
    ├── payments/                     # ✨ FUTURE (with Epic 6) — Konnect ACL
    │   └── server/src/
    │       ├── services/             # konnect-client, status-mapping, public-api
    │       └── routes/               # content-api: /payments/konnect/webhook
    ├── user-engagement/              # unchanged (user-watchlist)
    ├── geography/                    # unchanged (region, city)
    └── tmdb-integration/             # unchanged (reference ACL)
    # entity-properties/              # ❌ DELETED in step 4 (types moved to venues)
```

Each plugin keeps the sibling-pattern internals (admin/src with translations,
strapi-server.js / strapi-admin.js entries). Admin UI structure unchanged.

### Architectural Boundaries

Dependency rules R1–R5 (Core Decisions) govern all boundaries. Sanctioned graph:

```
geography      tmdb-integration      payments(future)
                    ▲ (admin HTTP)        ▲ R5
venues ◄── events-manager ──► creative-works ◄── user-engagement
                ▲                      ▲ (screening/performance .work)
                │ public-api.adjustInventory (inside ticketing's transaction)
            ticketing ──► users-permissions ◄── user-engagement
```

**Data boundaries:** tables unchanged (`collectionName` preserved everywhere);
boundary moves are UID-level only.

### Requirements to Structure Mapping

| Epic                      | Primary plugin(s)                         | Notes                                    |
| ------------------------- | ----------------------------------------- | ---------------------------------------- |
| 3 — Discovery (MVP, live) | events-manager, creative-works, geography | endpoints re-prefixed in steps 1–2       |
| 5 — Watchlist             | user-engagement                           | unchanged                                |
| 6 — B2C Ticketing         | ticketing + payments                      | needs step 3 (Unit of Work) first        |
| 7 — B2B Venue             | venues ✨                                 | blocked on step 1                        |
| 8 — Scanner               | ticketing                                 | admin-api scan route, Venue-staff policy |
| 9 — Admin                 | cross-plugin RBAC                         | permission re-seeds in steps 1–2         |

### Migration Checklists (per shippable step — one PR each)

**Step 1 — Extract `venues` (+ absorb entity-properties types)**

- [ ] Sibling-clone geography → `plugins/venues`; rename package.json identity
- [ ] Register in `config/plugins.ts`
- [ ] Move `venue/schema.json` verbatim (keep `collectionName: "venues"`)
- [ ] Move property-category, property-definition schemas from entity-properties
- [ ] Retarget `event.schema.json` venue relation → `plugin::venues.venue`
- [ ] Move/create venue services + `public-api`; content-api routes `/venues/*`
- [ ] Re-seed permissions: drop `plugin::events-manager.venue` actions, grant
      `plugin::venues.venue` to public read + Venue Manager role
- [ ] Update events-manager admin `useVenues*` hooks UID constants
- [ ] Client: `lib/api/content/venues.ts` paths `/events-manager/venues` → `/venues`
- [ ] Grep gate: zero `events-manager.venue` references; dev smoke: venue pages render

**Step 2 — Catalog consolidation on `creative-works` (inverted 2026-06-15)**

- [ ] Retire events-manager `movie`/`play` content types (no data → delete);
      `creative-work` (type enum) is the catalog of record
- [ ] Ensure `person`, `character` are content types in creative-works
- [ ] Add NEW `credit-role` content type (crew vocabulary; RBAC-safe name)
- [ ] Model `cast[]` (→ person, character) and `credits[]` (→ person, credit-role)
      as repeatable COMPONENTS on creative-work; add `videoType` enum to `videos[]`
- [ ] Retarget `screening.movie` → `plugin::creative-works.creative-work`;
      `performance.play` → `plugin::creative-works.creative-work`
- [ ] No XOR credit lifecycle (movie/play retired — nothing to enforce)
- [ ] Re-seed permissions for the catalog types (public read + editor roles)
- [ ] Update events-manager admin hooks (useCreativeWorks, usePeople) UIDs
- [ ] Client: shorts/search/events populate paths reference `creative-work`
- [ ] Grep gate: zero `plugin::events-manager.(movie|play)`; zero standalone
      `credit`-as-content-type or RBAC `role` collision references

**Step 3 — Ticketing Unit of Work (may precede step 2; never concurrent)**

- [ ] `events-manager.public-api.adjustInventory(subEventId, kind, delta)` —
      validates ticketsSold ≤ ticketsAvailable, no own transaction
- [ ] `order.createOrder` wrapped in `strapi.db.transaction`: re-read availability
      → create order + tickets → adjustInventory; throws `TICKET_SOLD_OUT` code
- [ ] Zod schemas for createOrder inputs via shared `validate()`
- [ ] Tests: oversell rejection, mid-loop failure rollback, happy path,
      concurrency (two parallel orders for last seat — exactly one succeeds)
- [ ] Plugin config: `defaultCurrency` replaces hardcoded "TND"

**Step 4 — Consolidation sweep**

- [ ] `strategies/sub-event.ts` map; de-branch event-manager service
- [ ] `public-api` facades for creative-works, venues, geography
- [ ] Shared kit `apps/strapi/src/shared/` (validate, Context, error-codes)
- [ ] Delete entity-properties plugin shell + its `config/plugins.ts` entry
- [ ] `ctx: Context` + error-code sweep on touched controllers

**With Epic 6 — `payments` plugin**

- [ ] Sibling-clone scaffold; konnect-client mirrors tmdb-client
      (env key check, retry, status mapping); webhook route + signature verify
- [ ] ticketing calls `payments.public-api` only (R3)

### Development Workflow Integration

Unchanged commands (`yarn dev`, `yarn test`). Each step's PR gate:
type-check + existing tests + grep gates above + strapi-reviewer agent pass.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** D1–D8 are mutually consistent and consistent with
the inherited stack. The decomposition introduces no new technology. One
deliberate exception documented below (atomic inventory update vs
Document-Service-only rule).

**Pattern Consistency:** Facade (D8) operationalizes rules R2–R4; the
sibling-clone starter guarantees new plugins satisfy the code patterns;
checklists enforce the move mechanics. Verified against actual code — the
patterns codify what the 7 plugins already do.

**Structure Alignment:** Target tree implements every decision; dependency
graph is acyclic; epics map 1:1 to plugins.

### Requirements Coverage Validation ✅

- Epics 3/5/6/7/8/9 all have a plugin home (table in Structure section);
  Epic 7 unblocked by step 1, Epic 6 by step 3 + payments plugin.
- FR24–31 (purchase integrity) covered by Unit of Work + atomic inventory.
- FR32–46 (B2B) covered by venues plugin + RBAC re-seeds.
- NFRs: financial integrity (step 3), i18n preservation (move mechanics rule 1),
  RBAC (re-seed checklist items). FR64–66 (real-time) explicitly deferred —
  the WebSocket decision in the original architecture is unaffected.

### Implementation Readiness Validation ✅

Decisions carry rationale + verified versions (Strapi 5.33.1, sdk-plugin 6.1.1
evaluated/rejected). Each migration step is one PR with grep gates and smoke
checks. Patterns include concrete file references from the live codebase.

### Gap Analysis Results

**Critical:** none open.

**Important (tracked, with resolution path):**

1. **Step 2 catalog model** — RESOLVED 2026-06-15 by story 2C.2, then **REVISED
   2026-06-15** (GTM redefined as a read-only directory; see
   `sprint-change-proposal-2026-06-15.md`). The earlier 2C.2 "normalized
   movie/play wins" decision is **INVERTED**: the unified `creative-work`
   (`type` enum film/short-film/play) **wins** and is the single catalog of
   record; events-manager's `movie`/`play` content types are **RETIRED**. People
   graph = `person` + `character` content types + a NEW `credit-role` content
   type (RBAC-safe name); `cast[]` (→ person, character) and `credits[]`
   (→ person, credit-role) are repeatable COMPONENTS on creative-work; `videos[]`
   gains a `videoType` enum. No dynamic zone (rejected). Both catalogs EMPTY → a
   pure schema change, no data migration. ✅ `user-engagement.user-watchlist.creativeWork`
   is now **unaffected** — `creative-work` survives the inversion. The
   `2c-2-...md` audit is retained as superseded history; `2c-3-...md` is rewritten
   to this inverted (simpler) target.
2. **Inventory concurrency** — addressed below (was critical until resolved).

**Nice-to-have:** dependency-rule lint (grep-based CI check for foreign UIDs);
ADR extraction of R1–R5 into docs/ for non-BMad readers.

### Validation Issues Addressed

**Oversell race under concurrent orders.** A read-then-write availability check
inside `strapi.db.transaction` is insufficient at READ COMMITTED isolation —
two concurrent transactions can both pass the check. **Resolution — the
Transaction Pattern is amended:** `events-manager.public-api.adjustInventory`
performs an atomic conditional update at the query-builder level:

```sql
UPDATE screenings SET tickets_sold = tickets_sold + :qty
WHERE id = :id AND tickets_sold + :qty <= tickets_available
```

— zero rows affected → throw `TICKET_SOLD_OUT`, rolling back the order. This is
the **one sanctioned exception** to the Document-Service-only rule, confined to
this single facade method and commented as such. (Redis locks from the original
architecture remain an option for checkout _reservations_ later — FR64 territory
— but DB-level atomicity is the correctness floor and needs no new moving parts.)
Step 3 checklist gains: concurrency test (two parallel orders for the last seat
— exactly one succeeds).

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (inherited + verified)
- [x] Integration patterns defined
- [x] Performance considerations addressed (atomic inventory, no new infra)

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY — steps 1, 3, 4 immediately implementable; step 2's
data audit (2C.2) is done and its model decided (REVISED 2026-06-15: unified
`creative-work` wins, `movie`/`play` retired), so step 2 is implementable too.

**Confidence Level:** High — grounded in verified code analysis of all 7
plugins, not assumptions.

**Key Strengths:** cuts follow requirement seams (epics ↔ plugins 1:1);
zero table migrations (collectionName preserved); each step independently
shippable; rules codify an already-consistent codebase.

**Areas for Future Enhancement:** CI lint for dependency rules; screening/
performance unification revisit if a third sub-event kind appears; payments
plugin lands with Epic 6.

### Implementation Handoff

**AI Agent Guidelines:** follow this amendment for backend module structure;
the original architecture for everything else; project-context.md rules always.
Run strapi-reviewer on plugin changes.

**First Implementation Priority:** Step 1 — sibling-clone `geography` →
`venues`, per the Step 1 checklist.

---

## Addendum (2026-06-16): Venues Plugin Rich Venue Model + Admin UI

> Source: `sprint-change-proposal-2026-06-16.md` (new feature: venue + property
> authoring UI). Consistent with — not superseding — this amendment.

The `venues` plugin's `venue` content type is **extended from the lean migrated
shape** (`name`, `address`, `geo`, `capacity`, `slug`, `events`) **to the rich
model**: `city`/`region`, `phone`, `email`, `website`, `type` (enum), `status`
(enum), `logo`/`images` (media), `manager` (relation), plus a **repeatable
`property-value` component field** for attaching configurable amenities. New fields
are additive (dev-only data, no table migration).

The `venues` plugin owns the **canonical venue admin UI** (replacing its placeholder
HomePage). The existing events-manager venue form (`VenueFormModal` +
`useVenuesEnhanced`, which already assume the rich model) is **relocated** into the
venues plugin — there is exactly one venue form, and `plugin::venues.venue` is the
single source of venue truth. Tracked as **Epic 2D**.
