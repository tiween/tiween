---
title: "Public Events Browse API & Data Foundation (Story 3.1a)"
type: "feature"
created: "2026-07-05"
status: "ready-for-dev"
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

- [ ] `.../events-manager/server/src/routes/` — add public `content-api` GET routes for `event` (+ read `screening`) with populate/filter (`startDateTime` range, `eventStatus`) / sort.
- [ ] `.../events-manager/server/src/content-types/event/schema.json` — add `featured` boolean (default false); regenerate types; add seed support.
- [ ] `.../events-manager/server/src/{services,controllers,routes}/` — add a `trending` service/endpoint aggregating `sum(screening.ticketsSold)` desc for upcoming events.
- [ ] `apps/strapi/scripts/seeds/index.ts` — set `featured` on a few events and non-zero `ticketsSold` so featured + trending slices return data.
- [ ] Backend tests where a runner exists — happy path (list/featured/trending), empty-data, invalid-query.

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
