---
title: "Story 5.7 — Watchlist Atomic Dedupe (unique (user, creativeWork) constraint)"
type: "hardening"
created: "2026-07-10"
status: "ready-for-dev"
origin: "Epic 5 retrospective (epic-5-retro-2026-07-10.md) — promoted critical-path debt"
context:
  - "{project-root}/_bmad-output/project-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/deferred-work.md"
---

<intent-contract>

## Intent

**Problem:** `watchlist.add(userId, creativeWorkId)` is a check-then-create (a `findMany` for an existing row, then `create` if none). This is a time-of-check/time-of-use race: two concurrent adds for the same `(user, creativeWork)` — the real "cross-device double-add" case the epic calls out — both read empty and both `create`, producing **duplicate watchlist rows**. There is no database-level uniqueness on `(user, creativeWork)`; the pre-check is the only guard and it is not atomic. (Deferred from 5.5 follow-up review, 2026-07-10.)

**Approach:** Add a DB-enforced unique scalar `dedupeKey` (= `"<userId>:<creativeWorkId>"`) to the `user-watchlist` content type, populate it on create, and make `add` **idempotent under concurrency**: keep the cheap pre-check for the common path, but wrap the `create` so a unique-constraint violation is caught and resolved by re-reading and returning the existing row rather than throwing. Backfill existing rows before the index goes live. This makes the last-writer-safe, duplicate-free invariant a property of the schema, not of lucky timing — the same unique-constraint-plus-catch pattern Epic 6 ticketing should follow for its atomic writes.

## Boundaries & Constraints

**Always:**

- The dedupe identity is the pair `(user.documentId, creativeWork.documentId)`; `dedupeKey` is exactly `` `${userId}:${creativeWorkId}` `` and is set on every `create` in `add`.
- `add` stays **idempotent**: a repeat add for an already-saved pair returns the existing row and never creates a second. Under a concurrent race, the create that loses the unique constraint must catch the violation, re-read by the pair, and return that row — never surface a 500.
- Use the Document Service API only (`strapi.documents(WATCHLIST_UID)`), consistent with the existing service. Module-level `WATCHLIST_UID` constant stays.
- Existing rows must be backfilled with a correct `dedupeKey` (and any pre-existing duplicate pairs collapsed to one row) **before** the unique index is enforced, or the sync will fail.

**Block If:**

- Backfill reveals duplicate `(user, creativeWork)` rows that cannot be deterministically collapsed (e.g. conflicting `notifyChanges`) — HALT and surface the ambiguity; do not silently drop rows. (Default collapse rule: keep the earliest `addedAt`, OR-together `notifyChanges`.)

**Never:**

- Do NOT re-target the watchlist off `creativeWork`, change `remove`/`toggle`/`getUserWatchlist` semantics, or touch the controllers/routes. Scope is `add` + schema + migration + tests.
- Do NOT introduce a client change — this is backend-only. The client `add` contract (POST, idempotent) is unchanged.
- Do NOT expose `dedupeKey` in API responses (mark it `private`).

## I/O & Edge-Case Matrix

| Scenario              | Input / State                     | Expected Output                                                                             | Error Handling                                     |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| First add             | pair not present                  | one row created, `dedupeKey` set                                                            | —                                                  |
| Repeat add (serial)   | pair present                      | existing row returned, no create                                                            | pre-check hits it                                  |
| Concurrent add (race) | two adds, pair absent at check    | exactly ONE row; the loser catches the unique violation, re-reads, returns the existing row | catch unique-violation only; rethrow anything else |
| Backfill              | legacy rows, some duplicate pairs | every row gets `dedupeKey`; duplicates collapsed to one                                     | HALT on non-deterministic collapse                 |
| Remove then re-add    | pair removed, added again         | new row created (old one gone), unique holds                                                | —                                                  |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` — `add()` (L10-31) is the check-then-create race; `remove`/`toggle`/`getUserWatchlist` unaffected. **Add `dedupeKey` on create + unique-violation catch.**
- `apps/strapi/src/plugins/user-engagement/server/src/content-types/user-watchlist/schema.json` — no unique constraint today (`user`/`creativeWork` relations, `addedAt`, `notifyChanges`). **Add `dedupeKey` scalar (`string`, `unique: true`, `private: true`).**
- `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` — existing `add` tests mock `findMany`/`create`. **Add: dedupeKey format; idempotent repeat; concurrent create → unique-violation caught → existing row returned.**
- Migration home: `apps/strapi/database/migrations/` (Strapi runs `*.js` migrations at boot) — **NEW** backfill: collapse duplicate pairs, set `dedupeKey` for all rows, before the unique index. (Confirm the repo's actual migrations dir; if none, use a `bootstrap` one-shot guarded by an idempotency flag.)

## Tasks & Acceptance

**Execution (ordered — data before constraint):**

- [ ] Add `dedupeKey` to `user-watchlist/schema.json`: `{ "type": "string", "unique": true, "private": true }`. Keep `draftAndPublish: false`.
- [ ] Write the backfill migration: for every `user_watchlist` row compute `"<user.documentId>:<creativeWork.documentId>"`; collapse duplicate pairs (keep earliest `addedAt`, OR the `notifyChanges` flags, delete the rest); set `dedupeKey`. Idempotent (safe to re-run). HALT on a collapse that isn't deterministic.
- [ ] In `watchlist.add`: set `dedupeKey` in the `create` `data`; wrap the `create` in try/catch — on a unique-constraint violation, re-read by the pair (`findMany` on `user`+`creativeWork`) and return `existing[0]`; rethrow any non-uniqueness error. Keep the existing pre-check as the fast path.
- [ ] Extend `watchlist.unit.test.ts`: (a) `add` sets `dedupeKey = "<userId>:<cwId>"`; (b) repeat add returns existing, no second create; (c) simulated create rejecting with a unique-violation → `add` re-reads and returns the existing row (no throw); (d) a non-unique error still propagates.

**Acceptance Criteria:**

- Given the same `(user, creativeWork)` added twice — serially or concurrently — exactly one `user_watchlist` row exists and both calls resolve without error.
- Given the schema change, `dedupeKey` is unique at the DB level and never appears in any watchlist API response.
- Given pre-existing data (including any duplicate pairs), the migration backfills every row and leaves at most one row per pair; re-running it is a no-op.
- Given `cd apps/strapi && yarn test`, all prior watchlist/notification tests still pass plus the four new `add` cases.

## Design Notes

`dedupeKey` is the pragmatic way to get a composite unique across two Strapi v5 _relations_ (which live in separate link tables and can't take a single composite DB index directly): a derived scalar column carries the uniqueness. The pre-check stays as a cheap common-path optimization, but correctness now rests on the DB constraint + catch — that ordering (attempt the write, let the DB adjudicate the race, reconcile on conflict) is the reference pattern for Epic 6's atomic order/ticket writes. Note the actual ticket-oversell guarantee is separate and already shipped (2C.4 `adjustInventory` conditional UPDATE, `TICKET_SOLD_OUT`); this story hardens the watchlist path and demonstrates the pattern, it does not touch inventory.

## Verification

- `cd apps/strapi && yarn test` — expected: green, +4 new `add` assertions.
- Manual: in a dev DB, run the migration, confirm a unique index on `user_watchlists.dedupe_key`; attempt to insert a duplicate `dedupeKey` → DB rejects; call `add` twice for one pair → one row.
