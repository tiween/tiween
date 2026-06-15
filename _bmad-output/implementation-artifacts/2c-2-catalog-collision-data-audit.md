# Story 2C.2: Catalog Collision Data Audit

Status: done

> ⚠️ **SUPERSEDED 2026-06-15** by `sprint-change-proposal-2026-06-15.md` (GTM
> redefined as a read-only directory of plays, screenings, and short films;
> ticketing ships post-GTM). The §3 decision below — "events-manager normalized
> model wins wholesale; retire creative-work" — is **INVERTED**: the unified
> `creative-work` (`type` enum film/short-film/play) is now the catalog of
> record, and `movie`/`play` are **RETIRED**. People graph = `person` +
> `character` content types + a NEW `credit-role` content type; `cast[]`/`credits[]`
> are repeatable COMPONENTS on creative-work; `videos[]` gains a `videoType` enum.
> No dynamic zone. §1 (both catalogs EMPTY → schema-only) and §2 (collision
> surface) remain factually valid. **For the current target, read the rewritten
> `2c-3-catalog-move-into-creative-works.md`.** This file is retained for
> decision history only.

## Story

As a **developer**,
I want a data audit of the person/genre/character/credit/work overlap between events-manager and creative-works,
so that the catalog move (2C.3) has a decided, evidence-based model + merge strategy before any schema moves.

## Outcome (this story's deliverable)

A recorded decision. **No code changes** — this is the investigation that gates 2C.3.

---

## 1. Data Footprint — CONFIRMED EMPTY

**Decision input (Ayoub, 2026-06-15): there is no catalog data yet.**

Evidence:

- events-manager seed (`server/src/services/seed.ts`) seeds only event-groups (venues seed moved to venues plugin in 2C.1). **Zero** seed rows for movie, play, person, character, credit.
- creative-works `bootstrap.ts` is empty; no seed for creative-work, person, genre, category.
- Dev/prod DB is PostgreSQL (not a local file); Ayoub confirms no real rows exist in either catalog.

**Consequence:** 2C.3 is a **pure schema change with no data migration**. The
"merge vs rename-then-migrate" question is moot — there is nothing to migrate.
Risk drops from MEDIUM (live-data migration) to LOW (schema-only).

---

## 2. Collision Surface (from the audit)

Two plugins encode the catalog differently. Table names do NOT collide
(so there is no DB-level forcing function — the choice is purely "which model"):

| Concept   | creative-works (June-12 redesign)                                                       | events-manager                                                                      | collectionNames                                  |
| --------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| Work      | one `creative-work`, `type` enum (film/play/short-film)                                 | separate `movie` + `play`                                                           | `creative_works` vs `movies`/`plays`             |
| Person    | `person` (roles json, externalIds, links)                                               | `person` (jobTitle, sameAs, credits inverse)                                        | `persons` vs `people` — DIFFERENT tables         |
| Credit    | **component** `creative-works.credit` (person oneToOne, role enum 19, character STRING) | **content type** `credit` (person/character relations, role enum 9, movie⊻play XOR) | `components_creative_works_credits` vs `credits` |
| Character | denormalized string in credit component                                                 | first-class content type `character`                                                | (none) vs `characters`                           |
| Genre     | `genre` content type                                                                    | (none)                                                                              | `genres` — only in creative-works                |
| Category  | `category` content type                                                                 | (none)                                                                              | `categories` — only in creative-works            |

Cross-plugin relation references that 2C.3 must retarget:

- `screening.movie` → `plugin::events-manager.movie` (`screening/schema.json:57-60`)
- `performance.play` → `plugin::events-manager.play` (`performance/schema.json:45-49`)
- events-manager admin hooks already import `plugin::creative-works.person/work/genre`
  (`useCreativeWorks.ts:16-18`, `usePeople.ts:15`) — these will retarget to the moved types.

Credit XOR lifecycle: `events-manager/server/src/lifecycles/credit.ts:24-37`
enforces "exactly one of movie/play" via `beforeCreate`/`beforeUpdate`, registered
in `bootstrap.ts:7`.

---

## 3. DECISION (Ayoub, 2026-06-15) — gates 2C.3

**Model chosen: the events-manager (normalized) model wins, wholesale.**

1. **Catalog owner = creative-works plugin.** It becomes the single catalog of
   record (architecture amendment D2). But the _schema design_ that moves in is
   events-manager's, not creative-works' June-12 redesign.
2. **Retire creative-works' redesigned catalog:** delete `creative-works.creative-work`
   (the type-enum work), the `creative-works.credit` **component**, and
   `theatre-details`/`distinction`/`external-ids` components insofar as they belonged
   to that redesign. creative-works KEEPS `genre` and `category`.
3. **Move events-manager's catalog types in as-is (separate types):**
   `movie`, `play`, `person`, `character`, `credit` → become
   `plugin::creative-works.{movie,play,person,character,credit}` with collectionNames
   preserved (`movies`, `plays`, `people`, `characters`, `credits`).
4. **Work shape: keep `movie` and `play` as separate content types** (not a unified
   work-with-discriminator). screening.movie / performance.play retarget to the
   creative-works UIDs but stay pointed at movie/play respectively.
5. **Character: normalized first-class content type** (events-manager's `character`),
   moved into creative-works with its `credit` relation intact.
6. **Credit: content type** (events-manager's), NOT a component. Move with its
   person/character/movie/play relations.
7. **The movie⊻play XOR credit lifecycle moves with the credit type** into
   creative-works (`creative-works/server/src/lifecycles/credit.ts` + bootstrap
   registration). It stays valid because movie and play remain separate.

**Rationale:** no data to lose (both empty); normalization enables cross-work
queries ("all credits for an actor", "every role a character appears in") that fit
the Phase-3 cultural-data-platform vision; events-manager admin UI already points at
creative-works as the source. Tradeoff accepted: this partially reverses the June-12
creative-works redesign (component-credit + creative-work type-enum), which is the
real reconciliation work of 2C.3.

---

## 4. Handoff to 2C.3 (what changes)

- **Delete from creative-works:** `creative-work` content type; `credit` component;
  redesign-specific components (theatre-details, distinction, external-ids) unless a
  moved events-manager type needs them — verify per-component during 2C.3.
- **Keep in creative-works:** `genre`, `category`.
- **Move into creative-works (collectionName preserved):** movie, play, person,
  character, credit + the credit XOR lifecycle.
- **Retarget:** `screening.movie` and `performance.play` relation targets →
  `plugin::creative-works.movie` / `plugin::creative-works.play`.
- **Retarget:** events-manager admin hooks (`useCreativeWorks`, `usePeople`) and any
  client refs to the moved UIDs.
- **user-engagement.user-watchlist.creativeWork** currently targets
  `plugin::creative-works.creative-work` — since that type is RETIRED, this relation
  must be re-pointed (likely to `movie`/`play`, or watchlist gets reworked). **Flag
  for 2C.3: this is a real consequence of retiring creative-work** — watchlist
  references a type that's going away. Decide its new target in 2C.3.
- **Grep gate for 2C.3:** zero `plugin::events-manager.(movie|play|person|character|credit)`
  after the move.
- **No data migration** — schema-only.

### ⚠️ Open item surfaced for 2C.3

Retiring `creative-works.creative-work` breaks `user-engagement.user-watchlist.creativeWork`
(watchlist points at it). 2C.3 must re-target the watchlist relation. Since a watchlist
entry should reference "a thing you want to see," it likely re-points to `movie` (and/or
`play`) — but that's a 2C.3 sub-decision. Noted here so it isn't missed.

## References

- [Source: _bmad-output/project-planning-artifacts/architecture.md — D2 (single catalog of record), Step 2 checklist]
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2c-plugin-architecture-decomposition.md#Story 2C.2]
- Audit evidence: schema.json files cited inline above (verified 2026-06-15).
