---
title: "DW-12/DW-13 — Catalog schema guards and seed integrity"
type: "bugfix"
created: "2026-08-03"
status: "done"
baseline_revision: "5a8fcd7afedd6ca4b2b129ce8b905b98ebbe9246"
final_revision: "38d6fe0ec5c4f60bacb59f1b1c44ccbed91e19ef"
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ["multiple-goals"]
---

<intent-contract>

## Intent

**Problem:** `credit-role` (the crew vocabulary added in story 2C.3) has no required/unique `slug` and a nullable `department`, so duplicate and ambiguous vocabulary rows can be created (DW-12). Separately, `scripts/seeds/index.ts` writes `directors` and `trailer` keys to `creative-work` — neither exists on the schema, so Strapi silently drops them, and the `cast[]`/`credits[]`/`videos[]` components that replaced them are never populated (DW-13).

**Approach:** Add integrity guards to the `credit-role` schema (required `slug`, required `department` with a safe default). Seed a small `credit-role` vocabulary, then map the existing seed data onto the real component fields: `directors` → `credits[]` (person + director credit-role), `cast` → `cast[]` (person), `trailer` → `videos[]` with `videoType: "trailer"`. Extract the mapping into pure helpers so it is unit-testable without booting Strapi.

## Boundaries & Constraints

**Always:**

- `credit-role` keeps its RBAC-safe name — never rename it to `role`.
- Seeded credit-role slugs are written explicitly (never left to Strapi's `name`-derived UID) so downstream code can key on them; the catch-all record MUST use slug `autre` or `other` to stay compatible with `GENERIC_CREDIT_ROLE_SLUGS` in `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts`.
- Seed functions stay idempotent: look up by `slug` first, skip if present (the pattern every existing seeder uses).
- `credit` component requires both `person` and `creditRole`; never emit a credit entry missing either.
- Seed data is authored in French (`config.defaultLocale === "fr"`).

**Block If:**

- The `credit_roles` or `creative_works` tables turn out to hold real (non-seed) rows, making the required-column migration destructive.

**Never:**

- Do not edit `_bmad-output/implementation-artifacts/deferred-work.md` — the orchestrator records resolution.
- Do not rebuild or touch the admin `WorkForm` (separate, already-finalized DW-10 work).
- Do not add `character` records or `character` relations to seeded cast entries — no character seed data exists and inventing it is out of scope.
- Do not touch the legacy `common.video.type` enum (`FULL_LENGTH`/`TEASER`/`CLIP`); `videoType` is what consumers read.

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                                                                                 | Expected Output / Behavior                                                                                                     | Error Handling                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Work with directors          | `directors: ["kaouther-ben-hania"]`, person id-map resolves it, director credit-role id known | `credits: [{ person: <docId>, creditRole: <directorDocId>, billing: 1 }]`                                                      | No error expected                                                       |
| Work with cast               | `cast: ["yahya-mahayni", "dea-liane"]`, both resolve                                          | `cast: [{ person: <docId1>, billing: 1 }, { person: <docId2>, billing: 2 }]` — billing is 1-based position, no `character` key | No error expected                                                       |
| Work with trailer            | `trailer: "https://youtu.be/x"`                                                               | `videos: [{ url: "https://youtu.be/x", videoType: "trailer" }]`                                                                | No error expected                                                       |
| Work without trailer         | `trailer` absent / `null` / `""`                                                              | `videos: []`                                                                                                                   | No error expected                                                       |
| Unresolvable person slug     | `directors: ["ghost-person"]` not in the id map                                               | That entry is dropped; remaining entries still map                                                                             | Silently filtered (matches existing `.filter(Boolean)` seed convention) |
| Missing director credit-role | director credit-role id is `undefined`                                                        | `credits: []` — no credit emitted with a null `creditRole`                                                                     | Returns empty array rather than an invalid component                    |

</intent-contract>

## Code Map

- `apps/client/src/app/api/contribute/play/route.ts` + `apps/client/src/features/contribute/components/steps/CreditsStep.tsx` -- the play-contribution wizard resolves crew credits by credit-role SLUG against the seeded vocabulary; `credit.creditRole` is required, so an unseeded slug rejects the whole submission. Constrains `credit-roles.json`.
- `apps/strapi/src/plugins/creative-works/server/src/content-types/credit-role/schema.json` -- DW-12 target; `slug` (uid) and `department` (enumeration) need guards.
- `apps/strapi/src/components/creative-works/credit.json` -- credit component shape: `person` (required), `creditRole` (required), `customRole`, `billing` (default 99, min 1).
- `apps/strapi/src/components/creative-works/cast.json` -- cast component shape: `person` (required), `character` (optional), `billing`.
- `apps/strapi/src/components/common/video.json` -- `url` (required) + `videoType` enum incl. `trailer`.
- `apps/strapi/scripts/seeds/index.ts` -- DW-13 target; `seedCreativeWorks` (~L295-311) writes phantom `directors`/`trailer`. `idMaps` at L48-68, seeder order in `seed()` at L609-626.
- `apps/strapi/scripts/seeds/data/creative-works.json` -- 25 works carrying `directors[]`, `cast[]`, and (5 of them) `trailer`; all referenced person slugs exist in `persons.json`.
- `apps/strapi/scripts/seeds/clear.ts` -- already clears `plugin::creative-works.credit-role`; no change needed.
- `apps/strapi/src/plugins/events-manager/admin/src/components/WorkForm/schema.ts` -- `GENERIC_CREDIT_ROLE_SLUGS = {"other","autre"}`; constrains the catch-all seed slug.
- `apps/strapi/jest.config.cjs` -- unit gate is `**/*.unit.test.ts`; `scripts/` is not ignored, so seed helpers are testable.

## Tasks & Acceptance

**Execution:**

- [x] `apps/strapi/src/plugins/creative-works/server/src/content-types/credit-role/schema.json` -- add `"required": true` to `slug`; add `"required": true` and `"default": "other"` to `department` -- DW-12: closes the null-slug duplicate hole and the ambiguous-department hole.
- [x] `apps/strapi/scripts/seeds/data/credit-roles.json` -- NEW: compact French crew vocabulary with explicit `slug` + `department`, including `{ slug: "director", department: "directing" }` and a catch-all `{ slug: "other", department: "other" }` -- gives `credits[]` a real vocabulary target, keeps the admin generic-role rule firing, and covers every crew slug the play-contribution wizard emits (widened during review).
- [x] `apps/strapi/scripts/seeds/utils/types.ts` -- NEW: shared `IdMap` type -- generic seed type, kept out of the creative-work-specific module.
- [x] `apps/strapi/scripts/seeds/utils/creative-work-relations.ts` -- NEW: pure helpers `buildCredits`, `buildCast`, `buildVideos` implementing the I/O matrix, plus `buildCreativeWorkData` assembling the whole `create()` payload -- keeps mapping AND the write contract unit-testable without booting Strapi.
- [x] `apps/strapi/scripts/seeds/utils/creative-work-relations.unit.test.ts` -- NEW: cover every row of the I/O & Edge-Case Matrix -- the mapping is the whole fix; regressions here are silent.
- [x] `apps/strapi/scripts/seeds/index.ts` -- add `creditRoles` to `idMaps`, add a `seedCreditRoles` seeder (idempotent by slug, `status: "published"`), call it in the reference-data phase before `seedCreativeWorks`; in `seedCreativeWorks` replace `directors`/`trailer` with `credits`/`cast`/`videos` built via the new helpers -- DW-13.

**Acceptance Criteria:**

- Given the `credit-role` schema, when it is inspected, then `slug` is `required: true` and `department` is `required: true` with `default: "other"`, and the content type is still registered as `credit-role` (not `role`).
- Given a fresh `yarn seed:fresh`, when it completes, then the seed summary reports a non-zero `creditRoles` count and no `directors`/`trailer` key is passed to `strapi.documents(...).create` for `creative-work`.
- Given a seeded creative work that has directors in the source data, when it is fetched with `credits` populated, then each credit resolves to a real `person` and the `director` credit-role record.
- Given a seeded creative work whose source data has a `trailer`, when it is fetched with `videos` populated, then it has exactly one video with that URL and `videoType: "trailer"`.
- Given the seed script is run twice in a row, when the second run finishes, then credit-roles report as skipped rather than duplicated.
- Given the repo, when the `apps/strapi` unit gate (`yarn test`) and `npx prettier --check` on the changed files run, then both pass with no new failures. (`apps/strapi` has no `lint` script and its `.eslintrc.js` is eslintrc-format against hoisted ESLint 9 — `npx eslint` fails identically on untouched files. Pre-existing; out of scope here.)

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 1, medium 3, low 4)
- defer: 3: (high 0, medium 2, low 1)
- reject: 12: (high 0, medium 2, low 10)
- addressed_findings:
  - `[high]` `[patch]` `credit-roles.json` was the only in-repo source of the vocabulary the play-contribution wizard resolves crew credits against (`apps/client/src/app/api/contribute/play/route.ts` → `resolveCreditRoleId`), but it missed 7 of the wizard's slugs and used `autre` where the wizard sends `other`. Since `credit.creditRole` is a required relation, submissions with those roles would be rejected on any seeded environment. Fixed: vocabulary expanded 14 → 21 records covering every wizard crew slug; catch-all slug is now `other` (still inside `GENERIC_CREDIT_ROLE_SLUGS`).
  - `[medium]` `[patch]` The unit tests covered only the pure helpers, not the actual defect class ("payload keys that don't exist on the schema") — re-adding `directors: directorIds` would have kept the suite green. Fixed: extracted `buildCreativeWorkData` and asserted the assembled payload's key set against `creative-work/schema.json` plus the `credit`/`cast`/`video` component schemas read from disk. Mutation-verified: re-introducing a `directors` key fails 2 tests.
  - `[medium]` `[patch]` No guard tied `credit-roles.json` to its consumers. Fixed: tests assert slug uniqueness, enum-valid departments, presence of `director`, and coverage of every wizard crew slug.
  - `[medium]` `[patch]` Silent degradation reproduced the very failure mode DW-13 was about — a missing `director` credit-role or an unresolvable person slug produced empty components with a "success" summary. Fixed: added a `WarnFn` sink; unresolved slugs and a missing director role now emit `console.warn` lines, asserted in tests.
  - `[low]` `[patch]` `IdMap` (used by all 9 id maps) was imported from the creative-work-specific helper module. Fixed: moved to `scripts/seeds/utils/types.ts`.
  - `[low]` `[patch]` `CreativeWorkSeed` looked exhaustive but omitted `title_ar`/`synopsis_ar`, which the source data carries and the seeder discards. Fixed: declared with a comment stating they are not consumed.
  - `[low]` `[patch]` Re-running `yarn seed` never backfills works seeded before the fix (all seeders skip-if-slug-exists). Fixed: documented in the seed runner header — `yarn seed:fresh` is required.
  - `[low]` `[patch]` The spec's `grep "directors:\|trailer:"` verification passed for a reason unrelated to what it asserted. Fixed: replaced with the mutation-verified schema guard test.

Deferred findings (the invocation for that pass forbade editing the ledger; the follow-up pass below transcribed them as DW-148, DW-147 and DW-154 respectively):

- `[medium]` The client shorts feature still reads the phantom fields this change removed from the write path: `apps/client/src/features/shorts/types/shorts.types.ts:61,63,246` declares/maps `trailer` and `directors`, consumed in `ShortsHero.tsx`, `ShortFilmDetail.tsx`, `ShortFilmDetailPage.tsx` and `shorts/[slug]/page.tsx`. Pre-existing and out of this spec's scope (seeds + schema); the events feature already derives directors from `credits[]` in `eventMappers.ts:377-387`, so shorts should follow.
- `[medium]` No backfill migration accompanies the `credit-role` required-column tightening. `apps/strapi/database/migrations/` holds only `.gitkeep`, so the NOT NULL sync is left to Strapi's auto schema sync. Harmless against the empty catalog this change targets, but a database already holding credit-role rows with NULL `slug`/`department` could fail the alter, and `seedCreditRoles` (slug-keyed, skip-if-exists) never backfills them.
- `[low]` The seed source data is thin: of 25 works only 12 carry `directors`, 6 `cast`, and 5 `trailer`, so after this fix 13 works still have empty `credits[]`, 19 empty `cast[]`, and 20 empty `videos[]`. The plumbing is correct; the content is the remaining gap for exercising the admin WorkForm and detail pages.

### 2026-08-03 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 3, low 2)
- defer: 8: (high 0, medium 5, low 3)
- reject: 11: (high 0, medium 2, low 9)
- addressed_findings:
  - `[medium]` `[patch]` The real-seed-data test was tautological: it built the genre id map by iterating the very works it then mapped, so every slug resolved by construction and the `genres:` warning list was always empty — deleting `data/genres.json` entirely would not have failed it. It also passed `persons: {}` and filtered the warn calls down to `genres:` messages, so the person-slug invariant the Code Map asserts had zero coverage. Fixed: the maps are now built from `genres.json` and `persons.json` and the test asserts the warn sink recorded nothing at all. Mutation-verified: pointing one director at `ghost-person` fails it.
  - `[medium]` `[patch]` The write-contract guard checked key NAMES against the schema but never VALUES, so an enumeration typo (`type`, `ageRating`, `videoType`) passed the gate and would only be rejected by a live Strapi. Fixed: added a test asserting every real work's enum values against `creative-work/schema.json` and `common/video.json`. Mutation-verified: `type: "movie"` fails it.
  - `[medium]` `[patch]` `seedCreditRoles` — the seeder this change introduced — spreads `credit-roles.json` straight into `create()` with no schema guard, so the exact phantom-key class DW-13 is about was reintroducible in the new code path with the suite green. Fixed: the vocabulary file's key set is now asserted against `credit-role/schema.json`.
  - `[low]` `[patch]` The component-key loops could pass vacuously — a fixture that lost its director, cast or trailer would run zero loop bodies and report green. Fixed: non-empty preconditions on all three arrays.
  - `[low]` `[patch]` The `warn` sink was defined once outside the work loop, so a run over 25 works emitted unattributed lines like `credits: unresolved slug "x" — entry skipped`. Fixed: scoped per work, prefixed with the work slug.

## Design Notes

`cast[]` is included alongside `credits[]` because the original 2C.3 review finding reads "writes phantom `directors`/`trailer` fields (silently dropped) **and never populates the new `cast[]`/`credits[]` components**" — populating only `credits[]` would leave the ledger item half-closed. Seeded cast entries carry `person` + `billing` only; `character` is an optional relation and no character seed data exists.

Helper shape (mirrors the existing `IdMap` = slug → documentId convention):

```ts
export function buildCredits(
  directorSlugs: string[] | undefined,
  persons: IdMap,
  directorRoleId: string | undefined
): Array<{ person: string; creditRole: string; billing: number }>
```

`billing` is the 1-based position in the source array (the component's `default: 99` only applies when the key is absent, and every seeded entry should carry a deterministic order).

## Verification

**Commands:**

- `cd apps/strapi && yarn test` -- expected: unit gate green, including the new `creative-work-relations.unit.test.ts`.
- `npx prettier --check <changed files>` -- expected: "All matched files use Prettier code style!". (There is no `yarn lint` in `apps/strapi`; see the AC note.)
- `cd apps/strapi && yarn type-check` -- expected: same 3 pre-existing `watchlist.ts` errors as on `baseline_revision`, no new ones (`scripts/` is excluded from tsconfig).
- `cd apps/strapi && npx jest scripts/seeds` -- expected: 33 tests green, including the write-contract guard that asserts every key of the assembled `create()` payload exists on `creative-work/schema.json`. (This replaces an earlier grep-based check that passed for the wrong reason — `directors?:` and `work.directors` do not match the pattern, so the grep could never have caught a re-introduced phantom key. The guard was mutation-verified: adding a `directors` key back to `buildCreativeWorkData` fails 2 tests.)
- `python3 -c "import json; s=json.load(open('apps/strapi/src/plugins/creative-works/server/src/content-types/credit-role/schema.json')); a=s['attributes']; assert a['slug']['required'] and a['department']['required'] and a['department']['default']=='other'"` -- expected: exits 0.

**Manual checks (if no CLI):**

- A live `yarn seed:fresh` against a running Postgres is not part of the automated gate (no DB in this run). Confirm by reading `seedCreativeWorks` that the `data` object passed to `create` contains only keys present in `creative-work/schema.json`.

## Auto Run Result

Status: done

**Summary.** DW-12 and DW-13 remain closed as implemented in `fdca981`: `credit-role` enforces a required `slug` and a required `department` (default `other`), and the seed runner writes the real `credits[]` / `cast[]` / `videos[]` components instead of the phantom `directors` / `trailer` keys Strapi was silently dropping. This follow-up review pass changed no production behaviour; it repaired the verification layer that was supposed to protect the fix. The headline defect was that the "real seed data" test could not fail — it built its genre id map from the works it was checking, and blanked the person map entirely — so the cross-file slug invariant the whole fix depends on was untested.

**Files changed (this pass).**

- `apps/strapi/scripts/seeds/utils/creative-work-relations.unit.test.ts` — real-data test now builds its id maps from `genres.json` / `persons.json` and asserts an empty warn sink; new enum-value guard for `type` / `ageRating` / `videoType`; new key-set guard for `credit-roles.json` against `credit-role/schema.json`; non-empty preconditions on the component-key loops.
- `apps/strapi/scripts/seeds/index.ts` — the degradation-warning sink is scoped per work and prefixed with the work slug.

**Review findings breakdown.** 5 patches applied (3 medium, 2 low), 8 items deferred (5 medium, 3 low — appended to `deferred-work.md` as DW-147…DW-154, per the invocation), 11 rejected. No intent gaps, no spec loopbacks.

The largest rejections, for the record: the missing `/api/credit-roles` REST route that the wizard's slug lookup needs is already tracked as DW-138; `department: required + default "other"` being a weak guard against ambiguity is the design the intent contract explicitly specifies; and the `required: true` on a `uid` slug diverging from `genre`/`person`/`creative-work` is likewise deliberate per the intent contract.

**Verification performed.**

- `cd apps/strapi && yarn test` — 39 suites, 463 tests, all pass (461 before this pass; 2 tests added, 1 rewritten).
- `npx jest scripts/seeds` — 35 tests pass.
- Mutation checks, both restored afterwards: repointing one director at `ghost-person` in `creative-works.json` fails the rewritten real-data test; setting a work's `type` to `"movie"` fails the new enum guard. Both previously passed green.
- Confirmed by script that all genre and person slugs referenced by the 25 works currently resolve against `genres.json` / `persons.json`, so the tightened assertions are green on real data rather than by luck.
- `npx prettier --check` on both changed files — clean.

**Residual risks.**

- Still no live database in this run, so `yarn seed:fresh` has not been executed end to end; the payload is verified against schema JSON, not against a running Strapi. Tracked as DW-150.
- The `credit-role` NOT NULL tightening still ships without a backfill migration (DW-147) — harmless against an empty catalog, a failed ALTER against a populated one.
- Seeded trailers will carry the legacy `video.type` default `TEASER` while the contribution wizard writes `type: null` for the same component. Left as-is because the intent contract's I/O matrix fixes the emitted payload; recorded as DW-149.
