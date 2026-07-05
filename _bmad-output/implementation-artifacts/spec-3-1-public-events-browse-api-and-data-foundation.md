---
title: "Public Events Browse API & Data Foundation (Story 3.1a)"
type: "feature"
created: "2026-07-05"
status: "done"
baseline_revision: "77a75d6ce492d1bc8aec392de614376c7c055a37"
final_revision: "cde5824663b4c25f82acc30ff1a9b84226aade56"
review_loop_iteration: 0
followup_review_recommended: false
sprint_key: "3-1-public-events-browse-api-and-data-foundation"
split_from: "3-1-homepage-with-curated-event-listings (split 2026-07-05 — see sprint-change-proposal-2026-07-05.md)"
depended_on_by: ["3-11-homepage-with-curated-event-listings"]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
decisions_resolved:
  date: "2026-07-04"
  by: "user (ayoub)"
  # Carried forward verbatim from the original 3.1 spec; still binding for this backend slice.
  backend_scope: "3.1 owns the public events browse API (add events-manager content-api GET routes for event/screening)."
  featured: "Add a `featured` boolean to the event content-type (additive schema change + regenerate types + seed support)."
  trending: "MVP Tendances = custom trending service aggregating sum(screening.ticketsSold) desc for upcoming events."
---

<intent-contract>

## Intent

**Problem:** Every Epic-3 discovery surface (homepage, date/region/venue filters, search) needs to read cinema events from the `events-manager` plugin, but there is **no public HTTP API** to read them: the plugin registers only `admin` + `seed` routes, there is no `featured` signal on the event content-type, and there is no way to rank events by popularity. This story builds that data foundation as a self-contained backend slice so the frontend story (3.1b, key `3-11`) can wire a real homepage against it.

**Approach (backend only):** (1) add public `content-api` GET routes for `event` (and read access to `screening`) in the `events-manager` plugin, with date-range + `eventStatus` filtering, sorting, and relation populate; (2) add an additive `featured` boolean to the `event` content-type, regenerate types, and add seed support; (3) add a custom `trending` service/endpoint that aggregates `sum(screening.ticketsSold)` desc for upcoming events (Strapi REST cannot sort by a related aggregate without it). No frontend work in this story.

## Boundaries & Constraints

**Always:**

- Return the Strapi v5 response shape directly (`data`, `meta.pagination{page,pageSize,pageCount,total}`) — no transformation layer. Errors as codes, never prose.
- Expose reads via the plugin's public content-api routes / plugin route prefix; cross-plugin access only via each plugin's `public-api` facade (do not reach into another plugin's models directly).
- `featured` is an **additive** schema change (default `false`); regenerate `types/generated/contentTypes.d.ts`; extend the dev seed so featured/trending slices return data.
- Only published events; respect `eventStatus`. MVP scope = cinema (`category = movie_screening`) only.

**Never:**

- Do not build or modify any frontend/client code (that is Story 3.1b / key `3-11`).
- Do not introduce non-cinema categories into MVP data.
- Do not add admin-only surface here — these are public read endpoints.

**Block If:** (all original scoping decisions were resolved 2026-07-04 — see `decisions_resolved`; there should be no remaining product decision to block on. If a genuinely new ambiguity appears, escalate with the specific decision, do not guess.)

## I/O & Edge-Case Matrix

| Scenario       | Input / State                         | Expected Output / Behavior                                            | Error Handling            |
| -------------- | ------------------------------------- | --------------------------------------------------------------------- | ------------------------- |
| List events    | GET events with date-range + populate | `data[]` of published events + `meta.pagination`; relations populated | 200; empty `data` if none |
| Featured slice | filter `featured=true`                | only featured events                                                  | 200; empty if none        |
| Trending       | trending endpoint, upcoming window    | events ranked by `sum(screening.ticketsSold)` desc                    | 200; empty if no upcoming |
| Bad query      | invalid filter/sort param             | validation error code                                                 | 400 with code, no 500     |
| No seed data   | fresh DB, no events                   | `data: []`, valid pagination meta                                     | 200, not an error         |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/routes/index.ts` — **admin + seed routes only today**; add a public `content-api` route group for `event` (+ read `screening`).
- `apps/strapi/src/plugins/events-manager/server/src/content-types/event/schema.json` — real schema (`startDateTime`/`endDateTime`, `eventStatus`, `screenings`, `category`); **add `featured` boolean** here.
- `apps/strapi/src/plugins/events-manager/server/src/content-types/screening/schema.json` — `startDateTime`, `ticketsSold`, `ticketsAvailable`, `movie` → creative-work.
- `apps/strapi/src/plugins/events-manager/server/src/{controllers,services}/` — add a `trending` service (+ controller) aggregating `sum(screening.ticketsSold)`; wire its route.
- `apps/strapi/src/plugins/events-manager/server/src/services/public-api.ts` (or equivalent facade) — keep cross-plugin access behind the facade pattern.
- `apps/strapi/scripts/seeds/index.ts` — dev seed; add `featured` flags + ensure `ticketsSold` values exist so trending is exercisable (`yarn seed:fresh`).
- `types/generated/contentTypes.d.ts` — regenerate after the `featured` addition.

## Tasks & Acceptance

**Execution:**

- [x] `.../events-manager/server/src/routes/` — add public `content-api` GET routes for `event` (+ read `screening`) with populate/filter (`startDateTime` range, `eventStatus`) / sort.
- [x] `.../events-manager/server/src/content-types/event/schema.json` — add `featured` boolean (default false); regenerate types; add seed support.
- [x] `.../events-manager/server/src/{services,controllers,routes}/` — add a `trending` service/endpoint aggregating `sum(screening.ticketsSold)` desc for upcoming events.
- [x] `apps/strapi/scripts/seeds/index.ts` — set `featured` on a few events and non-zero `ticketsSold` so featured + trending slices return data.
- [x] Backend tests where a runner exists — happy path (list/featured/trending), empty-data, invalid-query.

**Acceptance Criteria:**

- Given the plugin runs, when a client GETs the public events endpoint, then it returns published events in v5 shape with pagination and populated relations.
- Given `featured=true`, when queried, then only featured events return.
- Given the trending endpoint, when queried, then upcoming events are ranked by `sum(screening.ticketsSold)` desc.
- Given an invalid query param, when requested, then a 400 error code is returned (no whole-request 500).
- Given `yarn seed:fresh`, when the endpoints are hit, then featured and trending slices return populated data.

## Verification

**Commands:**

- `cd apps/strapi && yarn typecheck` (or workspace equivalent) — expected: no type errors after `featured` + types regen.
- `cd apps/strapi && yarn build` — expected: plugin compiles.
- `cd apps/strapi && yarn seed:fresh && yarn develop`, then `curl` the public events endpoint, a `featured=true` query, and the trending endpoint — expected: populated `data[]` + `meta.pagination`; trending ordered by ticketsSold.

## Notes

This is the backend half of the original Story 3.1, split out on 2026-07-05 because the combined full-stack slice exceeded a single unattended dev pass. The frontend half (fix-and-wire the existing homepage UI to this API, JSON-LD, SSR, perf) is Story 3.1b / sprint key `3-11`, which depends on this story. See `sprint-change-proposal-2026-07-05.md`.

## Review Triage Log

### 2026-07-05 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 5, low 1)
- defer: 2: (high 0, medium 2, low 0)
- reject: 3: (low 3)
- addressed_findings:
  - `[medium]` `[patch]` `findEvent` had no cinema scope → non-`movie_screening` events were retrievable by documentId; now the detail read enforces `category = movie_screening` and treats other categories as not-found (EVENT_NOT_FOUND), matching the list endpoint.
  - `[medium]` `[patch]` Free-string `sort` was forwarded to the Document Service, which throws on an unknown field → uncaught 500, violating the "no whole-request 500 on bad input" AC; `sort` is now a Zod `enum` allowlist (`startDateTime|title` × `asc|desc`) and anything else returns 400 `INVALID_QUERY`.
  - `[medium]` `[patch]` Trending fetched its 500-row window with no deterministic order and no tie-break; added `sort: startDateTime:asc` to the fetch and a stable `documentId` secondary key so ranking/pagination are deterministic across requests.
  - `[medium]` `[patch]` Trending surfaced `cancelled` events; the trending query now excludes `eventStatus = cancelled` (a cancelled show is not "trending").
  - `[medium]` `[patch]` The localized `event` type was read with no `locale`, and `.strict()` schemas 400'd a benign `?locale=` (and any other extra param); schemas now accept an optional validated `locale` (threaded through all reads) and strip unknown params instead of rejecting them.
  - `[low]` `[patch]` `startDate > endDate` silently returned an empty 200; added a Zod `.refine` so an inverted range is a 400 `INVALID_QUERY`.
  - Deferred (see deferred-work.md, 2026-07-05): (1) blanket populate exposes internal `ticketsSold`/`ticketsAvailable` to anonymous callers — correct public field projection depends on the 3.1b data contract; (2) trending in-JS cap-then-rank has no DB rollup/caching/rate-limit — architectural, harmless at MVP volume.
  - Rejected: `count({status} as never)` live-behaviour doubt (v5 `count` honors `status`); ISO-only datetime / `featured` literal brittleness (acceptable); non-transactional count+findMany race (standard Strapi pagination caveat).

### 2026-07-05 — Review pass (follow-up)

- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 2, low 1)
- defer: 0
- reject: 9: (low 9)
- addressed_findings:
  - `[medium]` `[patch]` The `startDate <= endDate` range refine compared the raw ISO strings lexically; because `isoDatetime` allows a timezone offset, a valid mixed-offset range (e.g. `12:00+05:00` = 07:00Z before `09:00Z`) was wrongly rejected as `INVALID_QUERY` (and some inverted ranges slipped through). Now parses both bounds to epoch ms and compares instants; added a mixed-offset acceptance test.
  - `[medium]` `[patch]` The default public browse (`GET /events` with no `eventStatus`) surfaced `cancelled` events, inconsistent with `trending` which already excludes them — a cancelled screening is not a browsable listing. `buildFilters` now defaults to `eventStatus != cancelled` when no explicit status is passed; an explicit `eventStatus=cancelled` still overrides. Added two service tests (default exclusion + explicit override).
  - `[low]` `[patch]` `findEvent` read `ctx.query.locale` raw, bypassing the `min(2).max(10)` guard applied on the list/trending routes; now validated through a shared `detailQuerySchema` (400 `INVALID_QUERY` on a malformed locale), matching the other read paths. Added a malformed-locale test.
  - Rejected (9): trending cap-then-rank dropping top sellers beyond 500, trending `total`/`pageCount` capped at the fetch limit, and the unauthenticated trending heavy-fetch/no-rate-limit surface — all three already covered by the two existing deferred-work entries (field projection + trending scalability), not re-deferred; `endDate` filtering `startDateTime` rather than overlap semantics (a defensible point-in-time-screening design choice, not a defect); unknown-but-well-formed `locale` causing a 500 (unverified — Strapi v5 Document Service returns an empty/default-locale read, it does not throw); no `fields` allowlist on event scalars (same class as the deferred field-projection entry); `page > pageCount` returning empty data (standard Strapi pagination behaviour, 200 per the I/O matrix); negative `ticketsSold` skewing rank (non-negative counter — hypothetical bad data); non-transactional `count`+`findMany` race (standard pagination caveat, already rejected in the prior pass).

## Auto Run Result

Status: done

**Summary.** Implemented the backend data foundation for Epic-3 discovery (Story 3.1a): public `content-api` GET endpoints on the `events-manager` plugin for browsing published cinema events, an additive `featured` flag, and a custom trending ranking — all Strapi v5 Document Service only, returning the v5 response shape directly with error codes and Zod-validated input. No frontend work (that is 3.1b / `3-11`).

**Files changed.**

- [apps/strapi/src/plugins/events-manager/server/src/routes/index.ts](../../apps/strapi/src/plugins/events-manager/server/src/routes/index.ts) — added a public `content-api` route group (`GET /events`, `GET /events/trending` registered before `GET /events/:documentId`, all `auth: false`); existing admin/seed routes untouched.
- [apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts) — new public controller; Zod query validation (page/pageSize/featured/eventStatus/date-range/`sort` allowlist/`locale`) → 400 `INVALID_QUERY`; `findEvent` → `EVENT_NOT_FOUND`; sets the v5 result on `ctx.body`.
- [apps/strapi/src/plugins/events-manager/server/src/services/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/events.ts) — new read service: `findEvents` (published + cinema, filters/populate/pagination + count), `findEvent` (single, cinema-scoped, locale-aware), `findTrending` (upcoming, cancelled excluded, sum `screening.ticketsSold` desc with stable tie-break, JS pagination).
- [apps/strapi/src/plugins/events-manager/server/src/controllers/index.ts](../../apps/strapi/src/plugins/events-manager/server/src/controllers/index.ts) & [services/index.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/index.ts) — wired the new `events` controller/service into the barrels; `public-api.ts` untouched.
- [apps/strapi/src/plugins/events-manager/server/src/content-types/event/schema.json](../../apps/strapi/src/plugins/events-manager/server/src/content-types/event/schema.json) — additive `featured` boolean (default false, `i18n.localized: false`).
- [apps/strapi/types/generated/contentTypes.d.ts](../../apps/strapi/types/generated/contentTypes.d.ts) — manually added the `featured` attribute (`yarn generate:types` needs a full Strapi boot).
- [apps/strapi/scripts/seeds/index.ts](../../apps/strapi/scripts/seeds/index.ts) — mark every 3rd cinema event `featured`; raised screening `ticketsSold` floor to a non-zero range so featured/trending slices return data.
- Tests: [controllers/**tests**/events.unit.test.ts](../../apps/strapi/src/plugins/events-manager/server/src/controllers/__tests__/events.unit.test.ts) and [services/**tests**/events.unit.test.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/__tests__/events.unit.test.ts) — 25 unit tests (happy/featured/trending, empty-data, invalid-query incl. sort allowlist + inverted range, cinema scoping, locale threading, tie-break).

**Review findings breakdown.** 6 patches applied (5 medium, 1 low — see Review Triage Log), 2 items deferred (medium; public field projection + trending scalability), 3 rejected as noise. No intent-gap and no bad-spec loopback (`review_loop_iteration` stayed 0).

**Follow-up review pass (2026-07-05).** A fresh adversarial + edge-case review of the full diff produced 3 additional patches — all applied, all test-covered, no new defers and no spec loopback: (1) range-order validation now compares instants instead of ISO strings (offset-safe); (2) the default public browse now excludes `cancelled` events (consistent with `trending`, overridable via explicit `eventStatus`); (3) `findEvent` now validates `locale` through the same guard as the other read paths. Nine findings were rejected — the trending cap/total/DoS trio is already captured by the two existing deferred-work entries (not re-deferred), and the rest were design choices, standard behaviour, or unverified. Tests grew from 25 → 29 (all green); `yarn type-check` clean. `followup_review_recommended` lowered to `false`: the new surface has now had two review passes and every remaining concern is an already-logged architectural deferral.

**Verification performed.**

- `yarn type-check` → PASS (no type errors).
- `yarn test --testPathPattern events.unit` → PASS (25/25 new tests).
- `yarn test --runInBand` (full suite, serial) → PASS: 12 suites passed / 1 skipped, 103 passed / 4 skipped, 0 failed. (Default parallel `yarn test` shows pre-existing failures from boot-based integration suites colliding on a shared SQLite DB — environmental, not from this change.)
- `yarn build` → PASS (per implementation pass).
- Live `yarn seed:fresh && yarn develop` + curl and `yarn generate:types` require a running DB / full Strapi boot and were not executed in the unattended run; seed and types changes type-check and build.

**Residual risks.**

- Not exercised against a live DB, so runtime pagination totals and the `content-api` route prefix are verified by mirroring the `venues` reference pattern and by unit tests, not by a live request. Recommend a quick `seed:fresh` + curl smoke check when a Strapi instance is available.
- The two deferred items (public field projection of internal sales data; trending scalability/caching) are logged in deferred-work.md and should be addressed with, or before, 3.1b consumes these endpoints.
- `followup_review_recommended: true` — the review pass made six behaviour/API-affecting fixes across the new surface, warranting an independent follow-up review.
