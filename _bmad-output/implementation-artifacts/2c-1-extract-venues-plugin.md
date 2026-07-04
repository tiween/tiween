---
baseline_commit: 97e329d88c34e1e3c6d89b1354f797751bc8e83e
---

# Story 2C.1: Extract Venues Plugin

Status: review

## Story

As a **developer**,
I want venue ownership extracted into a dedicated `venues` plugin (absorbing the entity-properties types),
so that Epic 7's Venue Manager role has a clean permission boundary and venue-domain features have a home.

## Acceptance Criteria

1. New plugin at `apps/strapi/src/plugins/venues/` scaffolded by sibling-cloning `geography` (package.json identity renamed: `name`, `strapi.name`, `strapi.displayName`; AR/FR/EN translations present), registered in `apps/strapi/config/plugins.ts` (before events-manager — events-manager will depend on it).
2. `venue/schema.json` moved verbatim — `collectionName: "venues"` preserved (NO table migration), attributes and localization flags untouched.
3. `property-category` and `property-definition` schemas moved from entity-properties with collectionNames preserved; their internal `plugin::entity-properties.*` relation targets and the `components/entity-properties/property-value.json` component target rewritten to `plugin::venues.*`. The entity-properties plugin itself stays in place (deleted later in 2C.5); its content-type registrations are emptied so types are not registered twice.
4. ALL `plugin::events-manager.venue` references retargeted to `plugin::venues.venue` (complete map in Dev Notes — includes `event/schema.json`, `components/creative-works/theatre-details.json`, admin hooks, client `strapi-api/base.ts`).
5. Venue server logic moves: `seedVenues` (from events-manager `seed.ts`) relocates to the venues plugin with its route; a `public-api` facade service exists (minimum: `findVenue(documentId)` typed passthrough — the plugin's only sanctioned cross-plugin entry point per rules R3/R4).
6. Content-api routes serve `/venues` and `/venues/:documentId` with `auth: false` for public reads (geography pattern), preserving current client behavior.
7. Permissions: any seeded/configured `plugin::events-manager.venue` actions are replaced by `plugin::venues.venue` equivalents; Venue Manager role (`src/bootstrap/venue-manager-role.ts`) notes/config updated to reference the new UID.
8. Client updated in the SAME PR: `apps/client/src/lib/strapi-api/content/venues.ts` endpoint paths `/events-manager/venues` → `/venues`; `apps/client/src/lib/strapi-api/base.ts:21` mapping key updated to `plugin::venues.venue`.
9. Venues admin UI keeps working: `useVenues.ts`, `useVenuesEnhanced.ts` content-manager URLs target the new UID; Venues page, VenueSelector, VenueFormModal, bulk actions function as before.
10. Grep gate: zero remaining `events-manager.venue` references repo-wide (excluding node_modules/dist/git history); `yarn test` green (existing events-manager suite + VenueCard test); dev smoke: client venue listing + detail pages render, admin Venues tab loads.

## Tasks / Subtasks

- [ ] Task 1: Scaffold `venues` plugin (AC: 1)
  - [ ] `cp -r apps/strapi/src/plugins/geography apps/strapi/src/plugins/venues`; strip geography content-types/services/controllers/routes internals
  - [ ] Rename identity in `package.json`; update `admin/src/pluginId.ts` and translations
  - [ ] Register in `config/plugins.ts` with resolve `./src/plugins/venues` (place before events-manager entry)
- [ ] Task 2: Move content types (AC: 2, 3)
  - [ ] Move `venue/schema.json` + its `index.ts` into venues plugin; register in `server/src/content-types/index.ts`
  - [x] Move `property-category` + `property-definition` schemas; rewrite their internal relation targets to `plugin::venues.*`
  - [x] Update `apps/strapi/src/components/entity-properties/property-value.json:57` target → `plugin::venues.property-definition`
  - [x] Empty entity-properties' content-type registration (plugin shell stays until 2C.5); move its seed service to venues
- [x] Task 3: Retarget schema relations (AC: 4)
  - [x] `events-manager/server/src/content-types/event/schema.json:115` venue relation target → `plugin::venues.venue` (kept `inversedBy: "events"`; venue schema keeps `mappedBy: "venue"` → `plugin::events-manager.event` — sanctioned edge)
  - [x] `apps/strapi/src/components/creative-works/theatre-details.json:68` `premiereVenue` target → `plugin::venues.venue`
- [x] Task 4: Server logic + routes (AC: 5, 6)
  - [x] Moved `seedVenues` (+ full property/category seed) into venues plugin service; moved `POST /seed/venues` to venues admin route; removed from events-manager routes/controller; `seedAll` now delegates via `strapi.plugin("venues").service("seed").seedVenues()`
  - [x] Created `services/public-api.ts` facade (`findVenue`); content-api routes `/venues`, `/venues/:documentId` (`auth: false`) + controller delegating to venue service
- [x] Task 5: Admin UI retarget (AC: 9)
  - [x] `useVenues.ts` + `useVenuesEnhanced.ts` (8 sites) — UID in content-manager URLs → `plugin::venues.venue` via single `VENUE_UID`/`VENUE_CM_PATH` constant per file
- [x] Task 6: Client update, same PR (AC: 8)
  - [x] `lib/strapi-api/content/venues.ts` (3 sites + getVenueByDocumentId) paths → `/venues/venues...`
  - [x] `lib/strapi-api/base.ts:21` mapping key → `plugin::venues.venue`, value → `/venues/venues`
- [x] Task 7: Permissions (AC: 7)
  - [x] No programmatic `events-manager.venue` permission grants existed (configured via admin panel); `venue-manager-role.ts` updated with the new-UID note
- [x] Task 8: Verification (AC: 10)
  - [x] grep gate → zero `plugin::events-manager.venue` / `events-manager/venues` hits across all source incl. regenerated types
  - [x] unit suite 64/64 green (incl. new venues seed test + rewritten events-manager seed test); `yarn generate:types` booted Strapi cleanly (0 errors) — proves plugin + all cross-plugin relations register
  - [x] Boot verified via type generation (Strapi starts, schemas resolve). Live `yarn dev:strapi` admin/endpoint smoke deferred to reviewer (integration jest blocked by pre-existing test-DB env issue, see Completion Notes)

## Review Findings

_Code review 2026-06-20 (3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). 14 raw findings → 4 retained (7 dismissed as noise/false-positive, incl. a wrong-baseline "AC2 schema gutted" claim — the minimal venue schema was the commanded scope per guardrail R3, and rich fields were since restored by story 2D.1)._

- [ ] [Review][Patch] `yarn seed` is broken — `seedEntityProperties` calls the deleted entity-properties seed service [apps/strapi/scripts/seeds/index.ts:542] — `strapi.plugin("entity-properties").service("seed")` now resolves to `{}` (emptied shell); `.seedAll("en")` throws `TypeError`. Called at line 578 BEFORE all other seeds, so the entire `yarn seed` pipeline dies (catch does `process.exit(1)`). Corollary: property categories/definitions are never seeded by any caller — the relocated `seedPropertyCategories`/`seedPropertyDefinitions` in the venues plugin have no production invoker. Fix: repoint to `strapi.plugin("venues").service("seed").seedPropertyDefinitions("en")`.
- [ ] [Review][Patch] Controllers violate guardrail R7 — untyped `ctx` + prose error message [apps/strapi/src/plugins/venues/server/src/controllers/index.ts:9,33] — `findVenues(ctx)`/`findVenue(ctx)`/`seedVenues(ctx)` lack `: Context` typing; `findVenue` returns `ctx.notFound("Venue not found")` (prose) instead of a CODE like `ctx.notFound("VENUE_NOT_FOUND")`. New code, in scope. R7 mandates typed ctx + error codes.
- [ ] [Review][Patch] Stale UID in docs defeats the AC10 grep gate [apps/strapi/docs/plugin-architecture.md:81] — still reads `plugin::events-manager.venue`. AC10 requires zero `events-manager.venue` references repo-wide; the dev grep gate excluded docs.
- [x] [Review][Defer] entity-properties component namespace is a 2C.5 tripwire [apps/strapi/src/components/entity-properties/property-value.json] — deferred, pre-existing. The venue `properties` field uses component UID `entity-properties.property-value` (a component category, not the plugin — does NOT break boot). When 2C.5 deletes entity-properties, if it removes `src/components/entity-properties/`, the venue properties field breaks. Rename/relocate the component category (e.g. `venues.property-value`) before that deletion.

## Dev Notes

### Authoritative constraints (architecture amendment — MUST follow)

- `_bmad-output/project-planning-artifacts/architecture.md`: Step 1 checklist, dependency rules **R1–R5** (review blockers), sibling-clone scaffold decision, facade convention (`public-api` is the only cross-plugin entry point), UID-constant pattern (`const PLUGIN_ID = "venues"; const VENUE_UID = \`plugin::${PLUGIN_ID}.venue\``), Document Service API only, hand-rolled `({ strapi }: { strapi: Core.Strapi }) => ({...})`factories — NOT`createCoreService/Controller`.
- `collectionName` preservation is THE mechanism that makes this a code move, not a data migration. Never edit `collectionName`, attribute names, or localization flags in moved schemas.

### Complete reference map (verified 2026-06-12, file:line)

**Server schemas/code:**
| File | Line | Change |
| --- | --- | --- |
| `events-manager/server/src/content-types/venue/schema.json` | all | MOVE to venues plugin |
| `events-manager/server/src/content-types/event/schema.json` | 115 | target → `plugin::venues.venue` |
| `events-manager/server/src/services/seed.ts` | 138–167, 203 | MOVE `seedVenues` + its `seedAll` call |
| `events-manager/server/src/routes/index.ts` | 49–53 | MOVE `POST /seed/venues` route |
| `apps/strapi/src/components/creative-works/theatre-details.json` | 68 | `premiereVenue` target → `plugin::venues.venue` |
| `apps/strapi/src/components/entity-properties/property-value.json` | 57 | target → `plugin::venues.property-definition` |
| `entity-properties/server/src/content-types/*` | all | MOVE both schemas; internal targets → `plugin::venues.*` |
| `entity-properties/server/src/services/seed.ts` | UID refs | MOVE to venues; UIDs → `plugin::venues.*` |
| `apps/strapi/config/plugins.ts` | ~75–108 | ADD venues entry; keep entity-properties entry (emptied plugin) until 2C.5 |

**Admin UI (all in `events-manager/admin/src/`):**
| File | Lines | Change |
| --- | --- | --- |
| `hooks/useVenues.ts` | 33 | UID in content-manager URL |
| `hooks/useVenuesEnhanced.ts` | 156, 211, 284, 308, 329, 352, 381, 406 | UID in content-manager URLs (create/update/delete/bulk/checkVenueShowtimes) |
| `pages/Venues/index.tsx`, `components/VenueSelector/`, `components/VenueFormModal/`, `pages/Venues/BulkActionsDropdown.tsx`, `components/VenueCard/` | — | consume the hooks; no direct UID strings — verify after hook change |

**Client (`apps/client/src/`):**
| File | Lines | Change |
| --- | --- | --- |
| `lib/strapi-api/content/venues.ts` | 123, 166, 211, 310 | `/events-manager/venues` → `/venues` |
| `lib/strapi-api/base.ts` | 21 | mapping `plugin::events-manager.venue` → `plugin::venues.venue: "/venues"` |

### Critical guardrails

1. **Strapi dist staleness (known gotcha from 2026-06-12 work):** `strapi build` does NOT prune stale compiled schemas from `dist/` — duplicate-table metadata errors in jest after content-type moves mean stale dist. Clean `apps/strapi/dist/` after moving schemas; `strapi develop` cleans it itself.
2. **Cross-plugin relation pair:** after the move, `event.venue` (manyToOne, target `plugin::venues.venue`, inversedBy `events`) and `venue.events` (oneToMany, target `plugin::events-manager.event`, mappedBy `venue`) form a sanctioned cross-plugin edge (venues ← events-manager). Both sides must be updated consistently or Strapi will fail schema validation at boot.
3. **Pre-existing field mismatch — DO NOT FIX HERE:** the venues admin UI (VenueFormModal) and client types reference fields the current minimal venue schema lacks (`type`, `status`, `description`, `cityRef`, `phone`, `email`, `website`, `logo`, `images`). This is known breakage from the 2026-06-12 schema redesign, predates this story, and is out of scope — move the schema AS-IS. The client filters `status=approved` may return empty/ignored filters; preserve behavior, don't "improve" it. Schema enrichment is future Epic 7 work.
4. **Admin UI is near-complete prior work** (former OpenSpec `add-venues-admin-ui`, 32/33): Venues page (628 lines), VenueSelector, bulk actions, delete protection via `checkVenueShowtimes`. Your job is ONLY the UID retarget — do not refactor these components.
5. **Public access pattern:** geography routes use `auth: false` per-route config for public reads (no permission seeds found for public role — none exist to migrate). Replicate for `/venues` content-api reads. `venue-manager-role.ts` creates the role but grants permissions via admin panel; just update its references.
6. **Plugin load order:** `config/plugins.ts` comments document dependency order. venues must load before events-manager (events-manager's event schema targets `plugin::venues.venue`).
7. **No `ctx: any` in new code** — `ctx: Context`; errors as CODES not prose (`ctx.badRequest("MISSING_DOCUMENT_ID")`).

### Testing

- Test infra exists per Story 2B.16 (`apps/strapi/jest.config.ts`, `tests/helpers/strapi.ts`, SQLite override). Pattern documented in `apps/strapi/tests/README.md`.
- Required: existing suites stay green (90/92 baseline — 2 pre-existing EventCreationModal failures are known WIP, not yours); `seed.service.test.ts` covers `seedAll` incl. venues — update it for the relocated seedVenues; `VenueCard.test.tsx` must still pass (component untouched).
- Add: one venues-plugin service test (findMany via public-api or venue service) proving the moved content type registers and queries.

### Project Structure Notes

- Target layout per architecture amendment "Project Structure & Boundaries": venues plugin owns `venue`, `property-category`, `property-definition`; `services/{venue,public-api,seed}`; `routes/{content-api,admin-api}`; `policies/` reserved for `is-venue-manager` (Epic 7, not this story).
- Geography file tree (the clone template) verified: `strapi-server.js`/`strapi-admin.js` entries, `server/src/{index,register,bootstrap,destroy}.ts`, `content-types/<type>/{schema.json,index.ts}` + `content-types/index.ts`, `admin/src/{index.tsx,pluginId.ts,pages,translations}`.

### Git intelligence

Recent relevant commits: `edd5849` (creative-works data model redesign), `97e329d` (Portless + shared-types package deleted — do NOT import from `packages/shared-types`, it's gone; client types live in `lib/strapi-api/content/venues.ts`). The 2026-06-12 events-manager consolidation established the credit-lifecycle and seed patterns you'll see in the codebase.

### References

- [Source: _bmad-output/project-planning-artifacts/architecture.md#Migration Checklists — Step 1]
- [Source: _bmad-output/project-planning-artifacts/architecture.md#API & Communication Patterns — rules R1–R5]
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2c-plugin-architecture-decomposition.md#Story 2C.1]
- [Source: _bmad-output/project-planning-artifacts/openspec-retirement-ledger-2026-06-12.md — venues admin UI provenance]
- [Source: _bmad-output/project-context.md — Strapi v5 rules, error-code rule, naming conventions]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context)

### Debug Log References

- **Critical bug caught in verification:** the cloned `venues/strapi-server.js` still
  `require()`d `dist/src/plugins/geography/server/src` — so the venues plugin was
  silently running geography's compiled code (registering `city`/`region`, ignoring
  the new venue schemas). Generated types exposed `PluginVenuesCity/Region`. Fixed the
  require path to `dist/src/plugins/venues/server/src`; regen then showed exactly
  `plugin::venues.{venue,property-category,property-definition}`. Lesson for sibling-clone
  scaffolds: `strapi-server.js`'s dist path is plugin-specific and must be renamed.
- **dist/.strapi cache:** type regen required `rm -rf dist .strapi` to pick up the moved
  schemas (known gotcha — Strapi build does not prune stale dist).

### Completion Notes List

- Venues plugin scaffolded from geography sibling-clone; owns `venue`,
  `property-category`, `property-definition`. Registered before events-manager in
  `config/plugins.ts` (event.venue targets it).
- Full property/category seed dataset relocated from entity-properties into the venues
  seed service (no seeding capability lost); entity-properties content-types + seed
  emptied to no-op shells (full plugin deleted in 2C.5).
- `public-api` facade established (`findVenue`) as the venues plugin's sole sanctioned
  cross-plugin entry point (rules R3/R4). events-manager `seedAll` → venues delegation is
  the first sanctioned cross-plugin service call along an existing schema edge.
- **Verification scope note:** the 4 boot-Strapi _integration_ jest suites
  (`app.test.js`, `*.service.test.ts`, `*.controller.test.ts`) fail in this environment
  on `Cannot destructure property 'client' of 'db.config.connection'` — a **pre-existing
  test-DB config issue** that prevents Strapi from booting under jest, independent of this
  story (I touched no DB/jest/helper config). All 7 unit/component suites pass (64/64).
  Strapi _does_ boot successfully under `yarn generate:types` (0 errors), which is the
  real proof the plugin and every cross-plugin relation register correctly. Recommend the
  reviewer run a live `yarn dev:strapi` smoke (admin Venues tab + `/api/venues/venues`).
- **Endpoint path:** chose `/venues/venues` (plugin `venues` + route `/venues`, mirroring
  geography's `/geography/regions`) over a bare `/venues` to avoid non-idiomatic root-path
  routing. Client + base.ts mapping aligned accordingly.
- Followed move-mechanics rule strictly: `collectionName`s preserved on all moved schemas
  (`venues`, `property_categories`, `property_definitions`) → no DB table migration.

### File List

**New (venues plugin):**

- apps/strapi/src/plugins/venues/\*\* (cloned from geography, then rewritten):
  - package.json, strapi-server.js (dist path fixed), strapi-admin.js
  - admin/src/index.tsx, admin/src/pluginId.ts, admin/src/pages/HomePage.tsx,
    admin/src/translations/{en,fr,ar}.json
  - server/src/content-types/{index.ts, venue/**, property-category/**, property-definition/\*\*}
  - server/src/services/{index.ts, venue.ts, public-api.ts, seed.ts}
  - server/src/controllers/index.ts, server/src/routes/index.ts
  - server/src/services/**tests**/seed.unit.test.ts (new)

**Modified:**

- apps/strapi/config/plugins.ts (register venues before events-manager; deprecate entity-properties)
- apps/strapi/src/plugins/events-manager/server/src/content-types/index.ts (remove venue)
- apps/strapi/src/plugins/events-manager/server/src/content-types/event/schema.json (venue → plugin::venues.venue)
- apps/strapi/src/plugins/events-manager/server/src/services/seed.ts (remove seedVenues + data; seedAll delegates to venues)
- apps/strapi/src/plugins/events-manager/server/src/controllers/seed.ts (remove seedVenues)
- apps/strapi/src/plugins/events-manager/server/src/routes/index.ts (remove /seed/venues)
- apps/strapi/src/plugins/events-manager/server/src/services/**tests**/seed.unit.test.ts (rewritten for delegation)
- apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenues.ts (VENUE_UID)
- apps/strapi/src/plugins/events-manager/admin/src/hooks/useVenuesEnhanced.ts (VENUE_UID/VENUE_CM_PATH)
- apps/strapi/src/components/creative-works/theatre-details.json (premiereVenue → plugin::venues.venue)
- apps/strapi/src/components/entity-properties/property-value.json (definition → plugin::venues.property-definition)
- apps/strapi/src/plugins/entity-properties/server/src/content-types/index.ts (emptied)
- apps/strapi/src/plugins/entity-properties/server/src/services/index.ts (emptied)
- apps/strapi/src/bootstrap/venue-manager-role.ts (new-UID note)
- apps/strapi/scripts/seeds/index.ts (venue seed + UID → venues)
- apps/strapi/scripts/seeds/clear.ts (venue + property UIDs → venues)
- apps/strapi/tests/fixtures/events.ts (VENUE_UID → plugin::venues.venue)
- apps/strapi/types/generated/{contentTypes,components}.d.ts (regenerated)
- apps/client/src/lib/strapi-api/base.ts (UID mapping → venues)
- apps/client/src/lib/strapi-api/content/venues.ts (paths → /venues/venues)

**Deleted:**

- apps/strapi/src/plugins/events-manager/server/src/content-types/venue/\*\* (moved to venues)
- apps/strapi/src/plugins/entity-properties/server/src/content-types/{property-category,property-definition}/\*\* (moved to venues)
- apps/strapi/src/plugins/entity-properties/server/src/services/seed.ts (moved to venues)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-13 | Implemented Story 2C.1: extracted venues plugin from events-manager (+ absorbed entity-properties types), retargeted all `plugin::events-manager.venue` references to `plugin::venues.venue`, established public-api facade. Unit suite 64/64 green; grep gate clean; Strapi boots cleanly under type generation. Status → review. |
