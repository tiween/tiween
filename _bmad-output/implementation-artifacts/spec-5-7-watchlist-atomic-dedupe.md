---
title: "Story 5.7 — Watchlist Atomic Dedupe (unique (user, creativeWork) constraint)"
type: "hardening"
created: "2026-07-10"
status: "done"
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: "43b1009ac31b00a7517ab42626e829072a63105b"
final_revision: "2ea87a94a8dd5947f6ed10b63d0820b0a912bf29"
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

- [x] Add `dedupeKey` to `user-watchlist/schema.json`: `{ "type": "string", "unique": true, "private": true }`. Keep `draftAndPublish: false`.
- [x] Write the backfill migration: for every `user_watchlist` row compute `"<user.documentId>:<creativeWork.documentId>"`; collapse duplicate pairs (keep earliest `addedAt`, OR the `notifyChanges` flags, delete the rest); set `dedupeKey`. Idempotent (safe to re-run). HALT on a collapse that isn't deterministic.
- [x] In `watchlist.add`: set `dedupeKey` in the `create` `data`; wrap the `create` in try/catch — on a unique-constraint violation, re-read by the pair (`findMany` on `user`+`creativeWork`) and return `existing[0]`; rethrow any non-uniqueness error. Keep the existing pre-check as the fast path.
- [x] Extend `watchlist.unit.test.ts`: (a) `add` sets `dedupeKey = "<userId>:<cwId>"`; (b) repeat add returns existing, no second create; (c) simulated create rejecting with a unique-violation → `add` re-reads and returns the existing row (no throw); (d) a non-unique error still propagates.

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

## Review Triage Log

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 3, medium 2, low 5)
- defer: 3: (medium 2, low 1)
- reject: 9
- addressed_findings:
  - `[high]` `[patch]` `dedupeKey` would have leaked in every watchlist API response: Strapi v5's Document Service does not apply `private` (that happens in `strapi.contentAPI.sanitize.output()`, which these custom controllers never call), so the raw row reached `ctx.body`. Added a `stripDedupeKey` helper applied to all four `add` return paths and to `getUserWatchlist`'s rows, keeping the controllers untouched as the contract requires. Directly enforces the contract's `Never: Do NOT expose dedupeKey in API responses`.
  - `[high]` `[patch]` The migration — the highest-risk, explicitly irreversible artifact in the change — had zero tests; inverting `pickKeeper`'s comparator left the whole suite green. Added `server/src/__tests__/watchlist-dedupe-migration.unit.test.ts` (17 cases) driving `up(knex, db)` against real in-memory better-sqlite3: duplicate collapse, earliest-`addedAt` keeper, OR-ed `notifyChanges`, both link tables cleaned, orphans preserved, idempotent re-run, HALT branch. Mutation-verified: inverting the comparator now fails 4 tests.
  - `[high]` `[patch]` A poisoned `dedupeKey` made a pair permanently un-addable. The controller accepts any `creativeWorkId` with no existence check; if Strapi drops an unresolvable relation, the row lands with a key but no link, so the pre-check, the create and the pair re-read all miss forever — a permanent 500 unclearable via `remove`. The recovery path now falls back to a `dedupeKey` lookup before rethrowing.
  - `[medium]` `[patch]` `db.metadata.get()` throws rather than returning undefined (`@strapi/database/dist/metadata/metadata.js:15-19`), so the migration's "plugin not loaded" skip was dead code that would have crashed boot. Now guarded with `db.metadata.has()`.
  - `[medium]` `[patch]` The migration's two `leftJoin`s assumed one link row per side; Strapi's manyToOne link tables carry non-unique FK indexes, so a duplicated link row could place one watchlist row in two key groups and delete it as another group's loser. Now HALTs on a repeated `w.id`.
  - `[low]` `[patch]` `isUniqueViolation` recursed on `cause` with no cycle guard (stack overflow inside a `catch` on a cyclic chain) and early-returned on that branch, masking a unique `details.originalError` behind a non-unique `cause`. Added a visited-set and made both unwrap paths contribute.
  - `[low]` `[patch]` `resolveNames` silently fell back to a hardcoded `"dedupe_key"` when the attribute was absent, which would have produced a stray backfilled column with no unique index and no error. Now throws.
  - `[low]` `[patch]` Orphan rows carrying a stale non-NULL `dedupe_key` could collide with a live row and fail the later index creation; skipped orphans now have their key nulled.
  - `[low]` `[patch]` `toBool("true")` returned `false`, which would have silently merged `notifyChanges` to off for drivers returning stringified booleans. Now handles boolean/number/bigint/Buffer/string forms.
  - `[low]` `[patch]` Documented that `add` must not run inside an outer transaction without a SAVEPOINT — Postgres aborts the transaction on constraint violation, so the recovery re-read would fail with `25P02` and break the "never a 500" guarantee.

### 2026-08-04 — Follow-up review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 1, low 5)
- defer: 3: (medium 1, low 2)
- reject: 14
- addressed_findings:
  - `[medium]` `[patch]` The one flag the whole story rests on had no test. Deleting `"unique": true` from `user-watchlist/schema.json` left all 55 suites green — the race tests inject the driver error rather than provoke it, and `contentTypes.d.ts` is checked-in generated output so `tsc` stays quiet too. Added a `schema.json` sync guard pinning `dedupeKey.unique` and `dedupeKey.private`, following the venue-schema precedent in `src/shared/__tests__/website-url.unit.test.ts`. Mutation-verified: dropping the flag now fails.
  - `[low]` `[patch]` `buildDedupeKey` template-interpolated both ids with no validation. `creativeWorkId` reaches the service straight from the request body (the controller checks truthiness only), so any object body coerced to the SAME key, `"<user>:[object Object]"`, and a `:` inside either half made the encoding ambiguous. Now rejects non-string, empty, and colon-bearing identifiers with `INVALID_WATCHLIST_IDENTIFIER` (`ValidationError`, the repo's existing convention) before any write.
  - `[low]` `[patch]` `isUniqueViolation` classified `SQLITE_CONSTRAINT_PRIMARYKEY` as the dedupe race. A primary-key collision on an auto-increment `id` is corruption, not "a concurrent add won", and routing it into the re-read-and-carry-on branch would mask it. Removed, with a test locking the exclusion.
  - `[low]` `[patch]` The poisoned-key fallback looked up by `dedupeKey` alone. The key already embeds `userId`, so this was only reachable through a malformed key — but the filter is now scoped to the requesting user too, which costs nothing and means no encoding fault can ever hand one user another user's row.
  - `[low]` `[patch]` `toBool` returned `false` for unrecognised shapes (Date, object, an unexpected string) instead of `null`. Every other unknown path in the migration preserves information; a bogus `false` counts as a KNOWN false in the OR-merge and would silently clear `notifyChanges` when it is the only value in its duplicate group. Now returns `null`. Mutation-verified.
  - `[low]` `[patch]` `pickKeeper` tested `added_at` for truthiness, so a driver returning the epoch as numeric `0` — the earliest possible row — read as "undated", sorted last, and would be deleted as a loser: the exact inversion of the collapse rule, on an irreversible delete. Now `== null`. Mutation-verified (both comparator branches).

## Auto Run Result

Status: done

### Summary

`watchlist.add` was a check-then-create TOCTOU race: two concurrent adds for the same `(user, creativeWork)` both read empty and both created, producing duplicate rows with nothing at the database level to stop them. Uniqueness is now a property of the schema. A derived scalar `dedupeKey` (`"<userId>:<creativeWorkId>"`) carries a DB unique index — the pragmatic way to get a composite unique across two Strapi v5 relations, which live in separate link tables. `add` keeps the cheap pre-check as its fast path, but correctness now rests on the constraint plus a catch: the create that loses the race catches the unique violation, re-reads the pair, and returns the winner's row instead of surfacing a 500. A backfill migration collapses any pre-existing duplicate pairs and stamps every row before the index goes live.

This follow-up review pass hardened the key encoding, tightened the violation detector, fixed two information-losing defaults in the migration's collapse helpers, and — most importantly — closed the gap where the story's single load-bearing schema flag could be deleted with a fully green suite.

### Files changed

- `apps/strapi/src/plugins/user-engagement/server/src/content-types/user-watchlist/schema.json` — added the `dedupeKey` attribute (`string`, `unique`, `private`).
- `apps/strapi/src/plugins/user-engagement/server/src/services/watchlist.ts` — `add` validates both identifiers, stamps `dedupeKey`, and recovers from a unique violation (pair re-read, then a user-scoped `dedupeKey` fallback); exported `isUniqueViolation` cross-driver detector; `stripDedupeKey` keeps the key out of every returned row. `remove`/`toggle`/`getUserWatchlist`/`isInWatchlist` semantics unchanged.
- `apps/strapi/database/migrations/2026.08.04T00.00.00.watchlist-dedupe-key.js` — **new**. Idempotent backfill: resolves physical names from `db.metadata`, collapses duplicate pairs (earliest `addedAt`, `id` tie-break, OR-ed `notifyChanges`, losers' link rows deleted), stamps `dedupeKey`, preserves orphans, HALTs rather than dropping rows when a collapse would be ambiguous.
- `apps/strapi/src/plugins/user-engagement/server/src/services/__tests__/watchlist.unit.test.ts` — extended 14 → 39 cases (dedupeKey format, race recovery in both Postgres and SQLite flavours, non-unique and primary-key errors propagating, key stripping, identifier validation, and a `schema.json` sync guard). No existing test weakened.
- `apps/strapi/src/plugins/user-engagement/server/src/__tests__/watchlist-dedupe-migration.unit.test.ts` — **new**, 19 cases driving the migration against real in-memory better-sqlite3.
- `apps/strapi/types/generated/contentTypes.d.ts` — hand-added the `dedupeKey` entry to keep the checked-in generated types in sync (regenerating properly requires a Strapi boot).

### Review findings

Across both passes: 16 patches applied (3 high, 3 medium, 10 low), 6 deferred (`DW-224`–`DW-229`), 23 rejected as noise, already-mitigated, or spec-sanctioned by design. No intent gaps, no spec defects in either pass. See the Review Triage Log above for each finding and its fix.

This pass's rejections were mostly already-covered or unreachable: the NULL-`dedupeKey` exemption and admin-panel writability are `DW-224`; the non-atomic index creation and concurrent-boot `ALTER TABLE` are `DW-225`; unbatched loading and `whereIn` bind limits are `DW-226`. The migration's HALT-with-no-escape-hatch is what the spec's `Block If` mandates. The unscoped unique detector is already guarded downstream — an unrelated unique violation finds nothing on either re-read and rethrows the original error.

### Verification

- `node ../../node_modules/jest/bin/jest.js` in `apps/strapi` → **55 suites / 804 tests, all passing** (before this pass: 55 / 794; baseline before the story: 54 / 769).
- `tsc --noEmit` → clean. `eslint . --max-warnings=0` → clean (exit 0).
- Mutation-verified all three new guards independently: deleting `"unique": true` from `schema.json` fails the new sync guard; reverting `toBool`'s unknown-value default to `false` fails; reverting `pickKeeper` to a truthiness check on `added_at` fails (both comparator branches must be reverted together — mutating only one is masked by V8's argument order, which is itself worth knowing before trusting a single-line mutation here). All mutations reverted and the suite re-verified green.
- Note: this run is an isolated worktree. The asdf `yarn` shim is broken repo-wide ("No version is set for command yarn"), so the gates were run through the workspace binaries directly (`node ../../node_modules/{jest,typescript,eslint}/...`) rather than via `yarn test` / `yarn type-check` / `yarn lint`. `node_modules` was already installed from the implementation run.

### Residual risks

- **The migration has never touched a real database.** It is verified end-to-end against in-memory SQLite with hand-built tables, not against Postgres with Strapi's own generated schema, and the migration → `syncSchema()` seam never executes in any test (`DW-227`). The spec's manual check still stands: run it on a dev DB, confirm the unique index on `user_watchlists.dedupe_key`, and confirm a duplicate insert is rejected.
- **`isUniqueViolation` has never seen a real driver error.** Every case feeds it an error the test constructed, so a Strapi or `pg` upgrade that rewraps the violation would disable the race recovery with a green suite (`DW-227`).
- **Uniqueness is only enforced for rows `add` writes.** NULL `dedupeKey` is exempt from the unique index in both engines, so an admin-panel or seed-script row escapes it (`DW-224`).
- **Cleanup and index creation are not atomic.** A write landing between the migration commit and `syncSchema()` can fail the index creation with the migration already marked applied (`DW-225`).
- **A nonexistent `creativeWorkId` still yields a 200 over an unusable row** (`DW-228`) — bounded to the caller's own account, and fixing it properly means adding a 4xx to the add path, which is a client-contract call rather than a patch.
