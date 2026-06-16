---
baseline_commit: 54c092c1b14f20281792eb607173a1529a609a92
---

# Story 2C.3: Consolidate Catalog on Creative-Works

Status: in-progress

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

- [x] Task 1: Retire events-manager movie/play (AC: 1, 5)
  - [x] Grep users of `plugin::events-manager.movie`/`.play` + the credit XOR lifecycle — inventory before deleting
  - [x] Delete `movie`, `play` content types + the movie⊻play `credit` XOR lifecycle + its bootstrap registration; remove from events-manager `content-types/index.ts`
- [x] Task 2: Establish creative-work catalog shape (AC: 2, 6)
  - [x] Confirm `creative-work` rich core fields; add/confirm `videos[]` component with `videoType` enum
  - [x] Confirm no dynamic zone; variation via enums + components only
- [x] Task 3: People graph + components (AC: 3, 4)
  - [x] Ensure `person`, `character` content types in creative-works
  - [x] Add `credit-role` content type (RBAC-safe name)
  - [x] Add `cast[]` (→ person, character) and `credits[]` (→ person, credit-role) repeatable components on `creative-work`
  - [x] Register `credit-role` (and any new components) in creative-works content-types/components indices
- [x] Task 4: Retarget scheduling relations (AC: 7)
  - [x] `screening.movie` / `performance.play` targets → `plugin::creative-works.creative-work`; note any field rename chosen
- [x] Task 5: Admin + client reconciliation (AC: 9)
  - [x] Verify events-manager admin hooks (useCreativeWorks, usePeople, Catalog/WorkForm/Works) resolve to creative-work/person UIDs
  - [x] Client base.ts mapping + content modules reference `creative-work`
- [x] Task 6: Verification (AC: 11, 12)
  - [x] grep gate (events-manager movie/play = zero; no `role`-named credit type)
  - [x] `yarn generate:types` boots clean; unit suite green

### Review Findings (code review 2026-06-16)

_Adversarial review of commit `1058c76` — Blind Hunter + Edge Case Hunter + Acceptance Auditor. All 12 ACs judged SATISFIED by the Auditor; findings below are deviations/risks, not AC failures._

**Decision needed:**

- [x] [Review][Decision → Deferred 2026-06-16] Admin WorkForm is a runtime break, not just a stale mapping — all three layers flagged this. `WorkForm/schema.ts:261-267` (`workToApiPayload`) still POSTs `credits: [{ person, role, character, customRole, billing }]` to the `creative-work` content-manager API, but the reworked `credit` component dropped `role`/`character` and added `creditRole` as a **required** relation. Saving any work with a credit fails validation (missing required `creditRole`) or silently drops `role`/`character`. The admin build stays green only because `useCreativeWorks.ts:35-42` hand-rolls its own `Credit` interface. Folds in: stale `Catalog/options.ts:13-34,98` enum vocab + `credit.creditRole required:true` burden. **Deferred — reason: catalog empty + GTM read-only; admin WorkForm rebuild is a sequenced follow-up story, no live data at risk** (already tracked in deferred-work.md).
- [x] [Review][Decision → Dismissed 2026-06-16] AC7 literally says "keep inversedBy" but the dev dropped it on both `screening.movie`/`performance.play` retargets — keeping it would break type-gen (creative-work has no inverse). All layers agree the drop is technically correct; no reverse `work → screenings/performances` query exists. **Resolved: accepted — one-way relations are correct for GTM (forward rendering only; reverse lookups deferred per guardrail #3). Nothing to fix.**

**Patch (unambiguous fixes):**

- [x] [Review][Patch → Fixed 2026-06-16] `videoType` enum `default: "trailer"` persisted alongside legacy `type` on every admin video write → inconsistent dual-enum data before the migration story runs [apps/strapi/src/components/common/video.json]. **Fixed: dropped the `videoType` default so the field stays null until a consumer/migration sets it intentionally. Type-gen 0 errors.**
- [x] [Review][Patch → Fixed 2026-06-16] Test helper `cleanupContent` didn't clean the new `character`/`credit-role` content-types → row leakage once tests seed cast/credits [apps/strapi/tests/fixtures/events.ts]. **Fixed: added `CHARACTER_UID` + `CREDIT_ROLE_UID` to the cleanup loop, ordered after `WORK_UID` so component references release first. Unit suite green (50/50).**

> **Also generalize (no new fix needed):** `credit.billing` (`cast.json` sibling in `credit.json`) shares the same `default:99`/no-tiebreak shape as the deferred `cast.billing` item below — covered under that same deferral.

**Deferred (pre-existing or out of scope):**

- [x] [Review][Defer] `credit-role` has no unique/required `slug` guard and `department` is optional+nullable → duplicate/ambiguous vocabulary rows possible [apps/strapi/.../credit-role/schema.json] — deferred, data-integrity hardening for an empty catalog
- [x] [Review][Defer] Seed `index.ts:307-308` writes phantom `directors`/`trailer` fields (silently dropped) and never populates the new `cast[]`/`credits[]` components [apps/strapi/scripts/seeds/index.ts] — deferred, pre-existing at baseline 54c092c
- [x] [Review][Defer] `cast.billing` default 99 / no max / optional `character` → unbilled cast collapse with no sort tiebreak [apps/strapi/src/components/creative-works/cast.json] — deferred, no current consumer of billing sort

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

claude-opus-4-8 (Opus 4.8, 1M context)

### Debug Log References

- Unit gate: `yarn test --testPathPattern unit` → 6 suites / 50 tests passed (3.3s). Pre-existing `jest-haste-map` collisions + `ts-jest isolatedModules` deprecation warnings only (stale `dist/`, unrelated to this change).
- Integration-level proof: `rm -rf dist .strapi && yarn generate:types` → Strapi booted, all plugins registered, "0 warning(s) and 0 error(s)". Confirms every retargeted relation resolves.
- Generated-type spot checks: `screening.movie` → `manyToOne plugin::creative-works.creative-work`; `CreativeWorksCast` = {person, character, billing}; `CreativeWorksCredit` = {person, creditRole, customRole, billing}; `PluginEventsManagerMovie/Play/Credit` absent (0); `PluginCreativeWorksCharacter`/`CreditRole` present.

### Completion Notes List

**Implementation summary** — pure schema consolidation (both catalogs empty → no data migration), per architecture amendment D2 (REVISED 2026-06-15) and `sprint-change-proposal-2026-06-15.md`.

- **AC1/AC5 — Retired events-manager catalog:** deleted `movie`, `play`, `credit`, `person`, `character` content-types (the people graph also lived in events-manager) + the movie⊻play `credit` XOR lifecycle + its bootstrap registration; deregistered from `content-types/index.ts`. Now-empty `lifecycles/` dir removed.
- **AC2/AC6 — creative-work is the catalog of record:** confirmed rich core fields; added a `videoType` enum to the `videos[]` (`common.video`) component **additively** (kept legacy `type` to avoid breaking the not-yet-rebuilt admin/client — see deferred-work). No dynamic zone.
- **AC3 — People graph:** `person` already in creative-works; added **`character`** and **`credit-role`** content-types (RBAC-safe name, never `role`).
- **AC4 — cast/credits components (decision: relations carrying extras):** new relation-based **`cast`** component `{person, character, billing}`; reworked **`credit`** component from the old enum shape to `{person, creditRole, customRole, billing}`. Wired `cast[]` + `credits[]` as separate repeatable components on `creative-work`. Components are app-level (auto-discovered) — no index registration needed.
- **AC7 — Scheduling relations (decision: keep field names, lowest churn):** `screening.movie` and `performance.play` retargeted to `plugin::creative-works.creative-work`, field names kept, `inversedBy` dropped (one-way — creative-work carries no scheduling inverse, respecting the dependency boundary). Service/controller (`event-manager.ts`) needed **zero changes** — they reference `movie`/`play` only as field names + a `movieId` documentId param.
- **AC8 — Watchlist:** verified `user-watchlist.creativeWork` already targets the surviving `creative-work` — unchanged.
- **AC9 — Admin/client (verify, don't rewrite):** re-verified directly — admin `useCreativeWorks.ts`/`usePeople.ts` resolve to `plugin::creative-works.creative-work`/`.person`; client `base.ts` maps `/creative-works/creative-works`; shorts hit `/creative-works` with `type:short-film`. Zero admin/client refs to retired UIDs. The admin `WorkForm` _component mapping_ is stale against the new relation-based credit shape — the admin rebuild the story's sequencing note **explicitly defers**; recorded in deferred-work.md (does not affect the AC12 gates).
- **AC10 — Register/deregister:** `creative-work`, `person`, `character`, `credit-role` registered in creative-works `content-types/index.ts`; `movie`/`play`/credit/person/character removed from events-manager `content-types/index.ts`. Updated `scripts/seeds/clear.ts` (dropped retired `events-manager.credit`; added `character` + `credit-role`).
- **AC11 — Grep gate:** zero `plugin::events-manager.(movie|play)` repo-wide (excl node_modules/dist/git/generated/planning/legacy); zero retired credit/person/character UID refs; `credit-role` not named `role`.
- **AC12 — Verify:** unit suite green (50/50); `yarn generate:types` boots with 0 errors.

**Deferred (recorded in deferred-work.md):** events-manager admin WorkForm rebuild against the new component shapes; migrate `common.video` consumers from legacy `type` to `videoType`. Both are post-2C.3 per the story's sequencing note; neither affects the gates (admin/src compiles via Vite, not type-gen/unit).

### File List

**Deleted (retired):**

- `apps/strapi/src/plugins/events-manager/server/src/content-types/movie/` (schema.json, index.ts)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/play/` (schema.json, index.ts)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/credit/` (schema.json, index.ts)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/person/` (schema.json, index.ts)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/character/` (schema.json, index.ts)
- `apps/strapi/src/plugins/events-manager/server/src/lifecycles/credit.ts` (+ now-empty `lifecycles/` dir)

**Added:**

- `apps/strapi/src/plugins/creative-works/server/src/content-types/character/schema.json`
- `apps/strapi/src/plugins/creative-works/server/src/content-types/character/index.ts`
- `apps/strapi/src/plugins/creative-works/server/src/content-types/credit-role/schema.json`
- `apps/strapi/src/plugins/creative-works/server/src/content-types/credit-role/index.ts`
- `apps/strapi/src/components/creative-works/cast.json`

**Modified:**

- `apps/strapi/src/components/creative-works/credit.json` (enum → relation-based: person/creditRole/customRole/billing)
- `apps/strapi/src/components/common/video.json` (added `videoType` enum, additive)
- `apps/strapi/src/plugins/creative-works/server/src/content-types/creative-work/schema.json` (added `cast[]`)
- `apps/strapi/src/plugins/creative-works/server/src/content-types/index.ts` (register character, credit-role)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/index.ts` (deregister movie/play/credit/person/character)
- `apps/strapi/src/plugins/events-manager/server/src/bootstrap.ts` (drop credit XOR subscriber)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/screening/schema.json` (movie → creative-work, drop inversedBy)
- `apps/strapi/src/plugins/events-manager/server/src/content-types/performance/schema.json` (play → creative-work, drop inversedBy)
- `apps/strapi/tests/fixtures/events.ts` (seedMovie → creative-work type:film; cleanup UID)
- `apps/strapi/scripts/seeds/clear.ts` (drop retired credit UID; add character + credit-role)
- `apps/strapi/types/generated/contentTypes.d.ts` (regenerated)
- `apps/strapi/types/generated/components.d.ts` (regenerated)
- `_bmad-output/implementation-artifacts/deferred-work.md` (recorded deferred admin rebuild + videoType migration)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-16 | Implemented 2C.3 catalog consolidation: retired events-manager movie/play/credit/person/character + XOR lifecycle; established creative-work as catalog of record with relation-based cast[]/credits[] components, new character/credit-role content-types, videoType enum; retargeted screening.movie/performance.play → creative-work. Unit suite green (50/50); type-gen 0 errors. |
