---
title: "DW-21: Make StrapiEvent legacy startDate/endDate/status optional"
type: "refactor"
created: "2026-07-13"
status: "in-review"
baseline_revision: "834cfb4471db23a141cc61d32e79ad24febfbaae"
review_loop_iteration: 0
followup_review_recommended: false # no review-driven code changes this pass; localized type-honesty refactor
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `StrapiEvent.startDate`, `endDate`, and `status` are declared **required** (`string` / non-optional), but the Story 3.1a public browse API never returns them. The type gives unmigrated consumers false compile-time safety: reads like `date: event.startDate` type-check as `string` yet are `undefined` at runtime.

**Approach:** Mark the three legacy fields optional (`startDate?`, `endDate?`, `status?`) so the typing reflects reality, then fix the read-sites that break under strict mode by routing them through the existing `getEventStartDate` helper (real `startDateTime` first, legacy `startDate` fallback).

## Boundaries & Constraints

**Always:** Preserve the `@deprecated` JSDoc on each legacy field; keep the fields present (optional), not deleted. Reuse the existing canonical helper `getEventStartDate` rather than inlining a new `?? ""` chain. Keep the public browse / real-schema code paths untouched.

**Block If:** Making the fields optional surfaces a consumer that genuinely requires a legacy field to be present with no real-schema equivalent (i.e. cannot be satisfied by `startDateTime`/`endDateTime`/`eventStatus`) — halt rather than fabricate data.

**Never:** Do not delete the legacy fields or their consumers. Do not change `EventCardEvent`, `EventSchema`, or any real-schema field. Do not touch `apps/client/src/app/sitemap.ts` (it uses its own local inline response type, not `StrapiEvent`). Do not edit the deferred-work ledger.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| -------- | ------------- | -------------------------- | -------------- |
| Browse-slice event (no legacy fields) | `StrapiEvent` with `startDateTime` set, `startDate` undefined | `getEventStartDate` returns `startDateTime`; card `date` is populated | No error expected |
| Legacy event (only legacy fields) | `startDate` set, `startDateTime` undefined | `getEventStartDate` returns `startDate` | No error expected |
| Neither present | both undefined | `getEventStartDate` returns `""`; card renders empty date, no crash | No error expected |
| Detail date range | `event.startDate && event.endDate` both undefined | Existing truthy guard skips the date-range block (unchanged) | No error expected |

</intent-contract>

## Code Map

- `apps/client/src/features/events/types/strapi.types.ts` -- `StrapiEvent`; the 3 legacy fields to make optional + update their block comment.
- `apps/client/src/features/events/utils/eventMappers.ts` -- exports `getEventStartDate` (`event.startDateTime ?? event.startDate ?? ""`); already optional-safe, no change.
- `apps/client/src/features/events/components/HomePage/HomePage.tsx` -- `toEventCardEvent` line ~122 `date: event.startDate` (unguarded read).
- `apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx` -- same pattern line ~138.
- `apps/client/src/features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx` -- related-cards line ~211 `date: e.startDate`; guarded date-range reads (~371/451) need no change.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx` -- related-cards line ~234 `date: e.startDate`; guarded reads (~465) need no change.
- `apps/client/src/lib/seo/structured-data.ts`, `apps/client/src/lib/algolia/events.ts` -- already read via `?? ` / `getEventStartDate`; verified no change needed.

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/src/features/events/types/strapi.types.ts` -- Change `startDate: string`, `endDate: string`, `status: "..."` to optional (`startDate?`, `endDate?`, `status?`); update the "kept required to preserve back-compat" block comment to state they are now optional because the browse API never returns them. Keep each `@deprecated` line.
- [x] `apps/client/src/features/events/components/HomePage/HomePage.tsx` -- Import `getEventStartDate` from `../../utils` and replace `date: event.startDate` with `date: getEventStartDate(event)`.
- [x] `apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx` -- Same change (import + `date: getEventStartDate(event)`).
- [x] `apps/client/src/features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx` -- Import `getEventStartDate` from `../../utils` and replace `date: e.startDate` with `date: getEventStartDate(e)`.
- [x] `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx` -- Same change (import + `date: getEventStartDate(e)`).

**Acceptance Criteria:**

- Given the legacy fields are optional, when the client is type-checked (`tsc --noEmit`), then it compiles with no new errors.
- Given a `StrapiEvent` from the browse API (no `startDate`), when a homepage/detail card is built, then `date` is derived from `startDateTime` (not silently `undefined`).
- Given the guarded detail date-range blocks, when the legacy fields are undefined, then the block is skipped exactly as before (behavior unchanged).
- Given existing unit tests (eventMappers, structured-data, algolia, search), when the suite runs, then all pass without modification.

## Design Notes

The four unguarded sites all assign to `EventCardEvent.date` (`string | Date`, required), so an optional `startDate` (`string | undefined`) is the only thing that would fail `tsc`. `getEventStartDate` is the codebase's canonical resolver (`event.startDateTime ?? event.startDate ?? ""`) and is already exported from the `../../utils` barrel — reuse it instead of inlining, to keep one source of truth. Guarded reads (`event.startDate && event.endDate && …`) narrow to `string` inside the `&&`, so they need no change.

## Verification

**Commands:**

- `cd apps/client && npx tsc --noEmit` -- expected: no errors (baseline is clean).
- `cd apps/client && yarn test run src/features/events src/lib/seo src/lib/algolia src/lib/strapi-api` -- expected: all affected suites pass.
- `cd apps/client && yarn lint` -- expected: no new lint errors in touched files.

## Spec Change Log

_No bad_spec loopback occurred. Empty._

## Review Triage Log

### 2026-07-13 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 4: (high 0, medium 2, low 2)
- reject: 6: (high 0, medium 0, low 6)
- addressed_findings:
  - none

All three reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) confirmed the touched
lines are correct and type-safe (`tsc` error count 64→64, zero new errors introduced). No finding
faulted the change itself; every substantive finding concerns the *broader* schema migration that
DW-21 explicitly scopes out ("surfaces — event detail, search, watchlist — that migrate under
their own stories"). Deferred items are recorded under `## Auto Run Result` for the orchestrator
to ingest — the invocation directive forbids editing the deferred-work ledger directly.

## Auto Run Result

Status: done

### Summary

Made `StrapiEvent.startDate`/`endDate`/`status` optional so the type reflects reality (the Story
3.1a public browse API never returns them), removing a compile-time "type lie" that gave
unmigrated consumers false safety. Routed the four unguarded `date: <event>.startDate` card-mapping
read-sites through the existing canonical resolver `getEventStartDate` (`startDateTime ?? startDate
?? ""`). Guarded reads (`event.startDate && event.endDate && …`) were correctly left unchanged.

### Files changed

- `apps/client/src/features/events/types/strapi.types.ts` — 3 legacy fields made optional; block comment rewritten to state they are optional/possibly-absent with real fields as source of truth.
- `apps/client/src/features/events/components/HomePage/HomePage.tsx` — `date: getEventStartDate(event)` + import.
- `apps/client/src/features/events/components/HomePage/HomePageWithCity.tsx` — same.
- `apps/client/src/features/events/components/EventDetailPageDesktop/EventDetailPageDesktop.tsx` — related-cards `date: getEventStartDate(e)` + import.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPageWithMap.tsx` — same.

### Review findings breakdown

- Patches applied: none (no finding faulted the touched code).
- Rejected (6, all low): `status` has no unmigrated consumer; `""`→`date` fully guarded by `EventCard.formatDate`; `sitemap.ts` uses its own query+local type (spec forbids touching it); date-only→datetime shift has no keying/sorting consumer; comment-accuracy nit is cosmetic; `getEventEndDate` absence folded into defer #1.
- Deferred (4) — **for orchestrator to record in the ledger** (not written directly per invocation directive):
  1. `[medium]` Detail-page date-range UI and related-card `title`/`poster`/`category` still read legacy `creativeWork`/`startDate`/`endDate`; needs a `getEventEndDate` counterpart and full migration of the detail/search/watchlist surfaces to the real schema. Evidence: `EventDetailPageDesktop.tsx:371/451`, `EventDetailPageWithMap.tsx:465` gate on `event.startDate && event.endDate`, dead on real API data.
  2. `[medium]` Four hand-rolled `toEventCardEvent` copies (HomePage, HomePageWithCity, and inline `relatedCards` maps in both detail pages) duplicate — and drift from — the canonical tested `eventMappers.toEventCardEvent`. Evidence: local copies differ in `price`/`category` handling from `eventMappers.ts:142`.
  3. `[low]` No component-level test pins the card `date` mapping at the four sites; a regression to `e.startDate` would ship green (`getEventStartDate` is unit-tested, but these integration sites are not). Evidence: no test file references these four components; `EventDetailPage.test.tsx` mocks `../../utils` wholesale.
  4. `[low]` Detail-page JSON-LD builder (`app/[locale]/events/[documentId]/page.tsx`) lacks the empty-`startDate` guard the homepage builder has (`page.tsx:135`), so a detail event with neither `startDateTime` nor `startDate` emits invalid `"startDate": ""` schema.org output. Reachable-but-unlikely.

### Verification performed

- `npx tsc --noEmit` — 64 errors before AND after (verified by stash/diff); **zero new errors**, none at edited lines. (Repo baseline is not clean — 64 pre-existing errors unrelated to DW-21; the spec's "baseline is clean" note was inaccurate but the real criterion "no new errors" is met.)
- `yarn test run src/features/events src/lib/seo src/lib/algolia src/lib/strapi-api` — 25 files, 332 tests, all pass.
- `yarn lint` — 0 errors; no new warnings in touched files.

### Residual risks

- The four card sites remain untested at the integration level (defer #3).
- The broader detail/search/watchlist migration remains outstanding (defer #1) — intentionally out of DW-21 scope.
