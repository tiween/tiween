# Story 2C.3: Consolidate Catalog on Creative-Works

Status: ready-for-dev

> **REWRITTEN 2026-06-15** to the inverted catalog model (see
> `sprint-change-proposal-2026-06-15.md`). The previous version of this story
> moved events-manager's normalized `movie`/`play`/`credit` types into
> creative-works and retired the unified `creative-work`. That direction is
> **reversed**: `creative-work` (type enum) is the catalog of record and
> `movie`/`play` are retired. The earlier 2C.2 decision is preserved as
> superseded history.

## Story

As a **developer**,
I want events-manager's normalized `movie`/`play` catalog retired and the unified `creative-work` (type: film | short-film | play) established as the single catalog of record — with a `person`/`character`/`credit-role` people graph and `cast[]`/`credits[]`/`videos[]` components,
so that the read-only GTM directory renders rich work pages from one queryable catalog and events-manager becomes scheduling-only.

## Decision context (authoritative)

- **GTM = read-only informative directory** of plays, screenings, and short films. Ticketing ships **post-GTM** (2C.4 done & independent; concurrency deferred — see `deferred-work.md`).
- The unified **`creative-work`** content type (June-12 redesign, `type` enum) is the **catalog of record**. events-manager's `movie`/`play` are **RETIRED**.
- Both catalogs confirmed **EMPTY** (2C.2 §1) → **pure schema change, no data migration**.
- The shorts client (`apps/client/.../shorts/`) is already built on `creative-work` (`type: short-film`) and ~production-ready — this model keeps it aligned.

## Settled model (from `catalog-model-creative-work-wins`)

- **`creative-work`** = rich shared core: title, synopsis, duration, releaseYear, genres, rating, ageRating, poster/backdrop/photos, `videos[]` (component; `videoType` enum: trailer/teaser/clip/…), distinctions, externalIds, links, theatreDetails (play-specific). Variation lives in **enums + typed components**, NOT a dynamic zone (rejected — opaque to filtering) and NOT separate content types.
- **`person`**, **`character`** = content-type hubs.
- **`credit-role`** = NEW content type (crew vocabulary: director/writer/composer/playwright…). **Named `credit-role` to avoid the Strapi RBAC `role` collision** (`admin::role` / `plugin::users-permissions.role`).
- **`cast[]`** = repeatable COMPONENT on creative-work → `{ person, character }`.
- **`credits[]`** = repeatable COMPONENT on creative-work → `{ person, creditRole }`.
- Cast (actors) and credits (crew) are SEPARATE fields. A person can both act in and direct works (person is a hub; role is contextual, never a person attribute).

## Acceptance Criteria

1. **Retire events-manager `movie`/`play`:** delete the `movie` and `play` content types from `events-manager/server/src/content-types/` (no data → no migration). Deregister them from `events-manager/server/src/content-types/index.ts`.
2. **`creative-work` is the catalog of record:** the unified `creative-work` (type enum film/short-film/play) stays in creative-works as the single work type. Confirm it carries the rich core fields + `videos[]` with a `videoType` enum.
3. **People graph as content types:** `person` and `character` are content types in creative-works. Add a NEW **`credit-role`** content type (crew vocabulary enum/records). Do NOT name it `role` (RBAC collision).
4. **Cast/credits as components:** model `cast[]` (repeatable component → `person`, `character`) and `credits[]` (repeatable component → `person`, `credit-role`) on `creative-work`. These are SEPARATE repeatable component fields.
5. **No XOR credit lifecycle:** events-manager's movie⊻play `credit` XOR lifecycle is retired with `movie`/`play` — there is nothing to enforce. Remove any leftover `lifecycles/credit.ts` + bootstrap registration for it.
6. **No dynamic zone:** keep the model structured (enums + typed components). Reject any dynamic-zone shaping of `creative-work`.
7. **Retarget scheduling relations:**
   - `screening.movie` target → `plugin::creative-works.creative-work` (keep inversedBy).
   - `performance.play` target → `plugin::creative-works.creative-work` (keep inversedBy).
   - (Optional, implementer's call) rename these relation fields to `work`/`creativeWork` for clarity, or keep `movie`/`play` field names pointing at `creative-work` — do the lower-churn option and note it.
8. **Watchlist UNCHANGED:** `user-engagement.user-watchlist.creativeWork` already targets `plugin::creative-works.creative-work`, which **survives**. No relation change needed (this is a net simplification vs the prior story version).
9. **Retarget admin hooks + client:** events-manager admin `useCreativeWorks.ts`, `usePeople.ts` (and Catalog/WorkForm/Works admin components) resolve to the `creative-work`/`person` UIDs (they largely already do — verify, don't rewrite blindly). Client `apps/client` refs and `lib/strapi-api/base.ts` mapping reconcile to the `creative-work` shape (already the shorts model).
10. **Register/deregister:** `creative-work`, `person`, `character`, `credit-role` registered in `creative-works/server/src/content-types/index.ts`; `movie`, `play` removed from `events-manager/server/src/content-types/index.ts`.
11. **Grep gate:** zero `plugin::events-manager.(movie|play)` references repo-wide (excluding node_modules/dist/git history/generated types pre-regen). No `credit-role` content type named `role`.
12. **Verify:** `yarn test --testPathPattern unit` green; `rm -rf dist .strapi && yarn generate:types` boots Strapi with 0 errors (proves all retargeted relations resolve).

## Tasks / Subtasks

- [ ] Task 1: Retire events-manager movie/play (AC: 1, 5)
  - [ ] Grep users of `plugin::events-manager.movie`/`.play` + the credit XOR lifecycle — inventory before deleting
  - [ ] Delete `movie`, `play` content types + the movie⊻play `credit` XOR lifecycle + its bootstrap registration; remove from events-manager `content-types/index.ts`
- [ ] Task 2: Establish creative-work catalog shape (AC: 2, 6)
  - [ ] Confirm `creative-work` rich core fields; add/confirm `videos[]` component with `videoType` enum
  - [ ] Confirm no dynamic zone; variation via enums + components only
- [ ] Task 3: People graph + components (AC: 3, 4)
  - [ ] Ensure `person`, `character` content types in creative-works
  - [ ] Add `credit-role` content type (RBAC-safe name)
  - [ ] Add `cast[]` (→ person, character) and `credits[]` (→ person, credit-role) repeatable components on `creative-work`
  - [ ] Register `credit-role` (and any new components) in creative-works content-types/components indices
- [ ] Task 4: Retarget scheduling relations (AC: 7)
  - [ ] `screening.movie` / `performance.play` targets → `plugin::creative-works.creative-work`; note any field rename chosen
- [ ] Task 5: Admin + client reconciliation (AC: 9)
  - [ ] Verify events-manager admin hooks (useCreativeWorks, usePeople, Catalog/WorkForm/Works) resolve to creative-work/person UIDs
  - [ ] Client base.ts mapping + content modules reference `creative-work`
- [ ] Task 6: Verification (AC: 11, 12)
  - [ ] grep gate (events-manager movie/play = zero; no `role`-named credit type)
  - [ ] `yarn generate:types` boots clean; unit suite green

## Dev Notes

### Authoritative constraints (architecture amendment — MUST follow)

- `_bmad-output/project-planning-artifacts/architecture.md`: **D2 (REVISED 2026-06-15)**, Step 2 checklist (inverted), dependency rules R1–R5, move-mechanics rules.
- `sprint-change-proposal-2026-06-15.md` — THE change spec for this inversion.
- `2c-2-...md` is **superseded** (its §3 decision is reversed) but its §1/§2 facts (empty catalogs, collision surface) remain valid.
- `collectionName` preservation = code change, not data migration. Never edit collectionName/attribute names/localization flags on retained schemas.
- Document Service API only. Hand-rolled service factories. Module-level UID constants.

### Current layout (verified 2026-06-15, on main — RE-VERIFY before starting)

- events-manager content-types include `movie`, `play` (+ the movie⊻play `credit` XOR lifecycle) — **RETIRE these**.
- creative-works content-types include `creative-work`, `person`, `genre`, `category` (+ `credit` component, theatre-details/distinction/external-ids components from the June-12 redesign) — **KEEP**; ensure `character` + `credit-role` exist and `cast[]`/`credits[]`/`videos[]` components are modeled as above.
- `screening.movie` / `performance.play` target `events-manager.movie`/`.play` — **RETARGET to `creative-work`**.
- `user-watchlist.creativeWork` → `plugin::creative-works.creative-work` — **NO CHANGE** (survives).

### Critical guardrails

1. **dist staleness** (known): `rm -rf dist .strapi` before type-gen after schema changes.
2. **RBAC name collision:** the crew-vocabulary type MUST be `credit-role`, never `role` (`admin::role` / `users-permissions.role` exist). Ayoub flagged this explicitly.
3. **Components are not independently queryable** — `person → works` filmography is NOT directly queryable through `cast[]`/`credits[]`. Accepted for GTM (directory renders work→people). Person-profile/filmography is a deferred consideration; do NOT add reverse-relation hacks now.
4. **No dynamic zone** — rejected; keep `creative-work` structured/filterable.
5. **events-manager admin already imports creative-works UIDs** — verify, don't blindly rewrite.
6. **No data migration** — schema-only (both catalogs empty).

### Testing

- Drop/retire events-manager movie/play/credit-XOR tests with their types; keep/adjust creative-work catalog tests.
- Unit suite must stay green; type-gen boot is the integration-level proof.
- Follow the 2B.16 test infra pattern.

### Project Structure Notes

- Target: creative-works owns `creative-work` (type enum), `person`, `character`, `credit-role`, `genre`, `category` + `cast[]`/`credits[]`/`videos[]` components. events-manager owns `event`, `screening`, `performance`, `feature`, `event-group` only (scheduling).
- This completes architecture amendment D2 (single catalog of record), inverted direction.

### ⚠️ Sequencing note

- The events-manager admin UI rebuild and creative-works admin UI must be (re)planned AFTER this story lands, against the post-consolidation UIDs (per the OpenSpec retirement ledger).
- 2C.4 (ticketing UoW) is done and independent — no interaction. Ticketing + concurrency remain post-GTM.

### References

- [Source: _bmad-output/project-planning-artifacts/sprint-change-proposal-2026-06-15.md — THE change spec]
- [Source: _bmad-output/project-planning-artifacts/architecture.md — D2 (REVISED), Step 2 checklist, R1–R5]
- [Source: _bmad-output/implementation-artifacts/2c-2-catalog-collision-data-audit.md — superseded audit (§1/§2 still valid)]
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2c-plugin-architecture-decomposition.md#Story 2C.3]
- [Source: _bmad-output/project-context.md — Strapi v5 rules, error codes]
- [Decision memory: catalog-model-creative-work-wins]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
