# Story 2C.3: Catalog Move into Creative-Works

Status: ready-for-dev

## Story

As a **developer**,
I want the catalog types (movie, play, person, character, credit) moved from events-manager into creative-works — replacing creative-works' existing redesigned catalog,
so that the platform has a single normalized catalog of record (the events-manager model) and events-manager becomes scheduling-only.

## Decision context (from story 2C.2 — authoritative)

`_bmad-output/implementation-artifacts/2c-2-catalog-collision-data-audit.md` decided:
**the events-manager normalized model wins wholesale.** No catalog data exists in
either plugin (confirmed empty) → this is a **pure schema change, no data migration**.
creative-works' June-12 redesign catalog (`creative-work` type-enum, component-credit,
theatre-details/distinction/external-ids components) is RETIRED and REPLACED by
events-manager's movie/play/person/character/credit (separate types, normalized).

## Acceptance Criteria

1. **Move** these content types from `events-manager/server/src/content-types/` into
   `creative-works/server/src/content-types/`, collectionNames preserved verbatim
   (`movies`, `plays`, `people`, `characters`, `credits`): `movie`, `play`,
   `person`, `character`, `credit`. New UIDs `plugin::creative-works.{movie,play,person,character,credit}`.
2. **Retire creative-works' existing catalog:** delete the `creative-work` content
   type and the `creative-works.credit` component. Delete redesign components
   (`theatre-details`, `distinction`, `external-ids`) UNLESS a moved type references
   them (verify per-component; the moved events-manager types do NOT use these, so
   they should be deletable — confirm via grep before deleting).
3. **Person collision resolved:** creative-works already has a `person` (collectionName
   `persons`); events-manager's `person` (collectionName `people`) is the one that
   wins. Since no data exists: delete creative-works' old `person` (the `persons`
   table) and move events-manager's `person` in (keeps `people`). All `person`
   references across the codebase resolve to the moved type.
4. **Keep in creative-works unchanged:** `genre`, `category`.
5. **Move the credit XOR lifecycle** (`events-manager/server/src/lifecycles/credit.ts`
   + its `bootstrap.ts` registration) into creative-works. It stays valid (movie/play
   remain separate). events-manager's bootstrap stops registering it.
6. **Retarget relations:**
   - `screening.movie` target → `plugin::creative-works.movie` (keep inversedBy)
   - `performance.play` target → `plugin::creative-works.play` (keep inversedBy)
   - Any component/schema referencing the moved UIDs (e.g. credit's person/character/
     movie/play relations become creative-works-internal).
7. **Watchlist relation dropped:** `user-engagement.user-watchlist.creativeWork`
   targets the retired `creative-work` — REMOVE this relation from the user-watchlist
   schema (Ayoub: watchlist can be dropped as a feature). Drop the relation so the
   catalog move isn't blocked; the user-watchlist content type can keep its other
   fields or be emptied — do the minimal change to unblock (full Epic-5 watchlist
   removal is a separate product decision, out of scope here). Update user-engagement
   `watchlist` service/controller refs that touch `creativeWork` so the plugin still
   compiles.
8. **Retarget admin hooks + client:** events-manager admin `useCreativeWorks.ts`,
   `usePeople.ts` (and any Catalog/WorkForm/Works admin components) → moved UIDs.
   Client `apps/client` refs to `plugin::creative-works.creative-work` /
   `creative-works/creative-works` endpoints reconciled to the new catalog shape
   (movie/play). Update `lib/strapi-api/base.ts` mapping.
9. **Register** the moved types in `creative-works/server/src/content-types/index.ts`;
   DEREGISTER them from `events-manager/server/src/content-types/index.ts`.
10. **Grep gate:** zero `plugin::events-manager.(movie|play|person|character|credit)`
    and zero `plugin::creative-works.creative-work` references repo-wide (excluding
    node_modules/dist/git history/generated types pre-regen). Regenerate types.
11. **Verify:** `yarn test --testPathPattern unit` green; `rm -rf dist .strapi &&
    yarn generate:types` boots Strapi with 0 errors (proves all retargeted relations
    resolve). Move the events-manager credit + catalog tests along with the types.

## Tasks / Subtasks

- [ ] Task 1: Retire creative-works' redesigned catalog (AC: 2, 3)
  - [ ] Grep for users of `plugin::creative-works.creative-work`, `creative-works.credit`
        component, theatre-details/distinction/external-ids — inventory before deleting
  - [ ] Delete creative-works `creative-work` content type + old `person` + `credit`
        component + redesign components (per grep — keep any a moved type needs)
- [ ] Task 2: Move catalog types into creative-works (AC: 1, 9)
  - [ ] Move movie, play, person, character, credit content-type folders; rewrite their
        internal relation target UIDs (`plugin::events-manager.*` → `plugin::creative-works.*`)
  - [ ] Register in creative-works content-types/index.ts; remove from events-manager index.ts
- [ ] Task 3: Move credit XOR lifecycle (AC: 5)
  - [ ] Move `lifecycles/credit.ts` + bootstrap registration into creative-works;
        remove from events-manager bootstrap; update the UID it subscribes to
- [ ] Task 4: Retarget relations (AC: 6)
  - [ ] `screening.movie` / `performance.play` targets → creative-works UIDs
- [ ] Task 5: Drop watchlist relation (AC: 7)
  - [ ] Remove `creativeWork` relation from user-watchlist schema; fix watchlist
        service/controller so user-engagement compiles
- [ ] Task 6: Retarget admin + client (AC: 8)
  - [ ] events-manager admin hooks (useCreativeWorks, usePeople, Catalog/WorkForm/Works)
  - [ ] client base.ts mapping + content modules referencing creative-work/person
- [ ] Task 7: Verification (AC: 10, 11)
  - [ ] grep gates (events-manager catalog UIDs + creative-work = zero)
  - [ ] `yarn generate:types` boots clean; unit suite green; move catalog tests

## Dev Notes

### Authoritative constraints (architecture amendment — MUST follow)

- `_bmad-output/project-planning-artifacts/architecture.md`: Step 2 checklist, D2
  (single catalog of record), dependency rules R1–R5, move-mechanics rules.
- **2C.2 decision doc is the spec** — read it fully before starting.
- `collectionName` preservation = code move, not data migration. Never edit
  collectionName/attribute names/localization flags on moved schemas.
- Document Service API only. Hand-rolled service factories. Module-level UID constants.

### Current layout (verified 2026-06-15, on main)

- events-manager content-types: character, credit, event, event-group, feature,
  movie, performance, person, play, screening (+ index.ts). MOVE the 5 catalog ones.
- creative-works content-types: category, creative-work, genre, person (+ index.ts).
  DELETE creative-work + person; KEEP category, genre.
- credit lifecycle: `events-manager/server/src/lifecycles/credit.ts` (enforces movie⊻play XOR).
- `user-watchlist.creativeWork` → `plugin::creative-works.creative-work` (manyToOne) — DROP.
- screening.movie / performance.play target events-manager.movie/play — RETARGET.

### Critical guardrails

1. **dist staleness** (known): `rm -rf dist .strapi` before type-gen after moving schemas.
2. **strapi-server.js dist path** (lesson from 2C.1): not applicable here (no new
   plugin), but watch that creative-works' own strapi-server.js points at its own dist.
3. **Person merge:** both define `person`; events-manager's wins (collectionName `people`).
   Since creative-works' old `person` (collectionName `persons`) is deleted and no data
   exists, no row migration — but ensure the credit component (being deleted) and the
   moved credit content-type's `person` relation both end up pointing at the surviving
   `plugin::creative-works.person`.
4. **events-manager admin already imports creative-works UIDs** (useCreativeWorks/usePeople) —
   these were anticipating this move; they mostly already point at creative-works,
   so verify rather than rewrite blindly.
5. **Watchlist:** do the MINIMAL change to drop the relation and keep user-engagement
   compiling. Do NOT attempt to remove Epic 5 wholesale — that's a separate product call.
6. **No data migration** — schema-only (both catalogs empty).

### Testing

- Move the events-manager catalog/credit tests (`__tests__`) along with their types.
- Unit suite must stay green; type-gen boot is the integration-level proof.
- Follow 2B.16 test infra pattern.

### Project Structure Notes

- Target: creative-works owns movie, play, person, character, credit, genre, category
  + the credit XOR lifecycle. events-manager owns event, screening, performance,
  feature, event-group only (scheduling).
- This completes architecture amendment D2 (single catalog of record).

### ⚠️ Sequencing note

- The events-manager admin UI rebuild (former OpenSpec `add-events-manager-admin-ui`)
  and creative-works admin UI must be (re)planned AFTER this story lands, against the
  post-move UIDs (per the OpenSpec retirement ledger).
- 2C.4 (ticketing UoW) is already done and independent — no interaction.

### References

- [Source: _bmad-output/implementation-artifacts/2c-2-catalog-collision-data-audit.md — THE decision spec]
- [Source: _bmad-output/project-planning-artifacts/architecture.md — D2, Step 2 checklist, R1–R5]
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2c-plugin-architecture-decomposition.md#Story 2C.3]
- [Source: _bmad-output/project-context.md — Strapi v5 rules, error codes]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
