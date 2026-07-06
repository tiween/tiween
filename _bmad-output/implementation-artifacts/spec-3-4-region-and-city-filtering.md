---
title: "Region and City Filtering (Story 3.4)"
type: "feature"
created: "2026-07-06"
status: "done"
baseline_revision: "4dab810d8b553a84856b10712e2e336b7bda5ed4"
final_revision: "e91e6831a790cd1ee207e2b19c4f8c8c7bbbfeb9"
review_loop_iteration: 0
followup_review_recommended: false
sprint_key: "3-4-region-and-city-filtering"
depends_on:
  [
    "3-1-public-events-browse-api-and-data-foundation",
    "3-3-date-range-filtering",
  ]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-1-public-events-browse-api-and-data-foundation.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-3-date-range-filtering.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The `/[locale]/events` listing (built in 3.3) filters by date but not by location, yet the epic requires narrowing discovery "by region and city (Greater Tunis first)". Two gaps block this: (1) the Story 3.1a public events endpoint accepts **no** location param and never traverses `venue → cityRef → region`, so events cannot be filtered by area; (2) the shared `filterParams` only _reserves_ `city` (no `region`) and acts on neither. So a visitor cannot answer "what's on **near me / in my city**?".

**Approach (cross-layer):** Backend — add optional `city`/`region` (Strapi `documentId`) params to the events-manager public browse endpoint, validated and translated into a nested relation filter on the event query (`venue.cityRef.documentId` for city, `venue.cityRef.region.documentId` for region), mirroring the pattern `search.ts` already uses. Frontend — extend the shared `filterParams` with `region` and promote `city`+`region` from reserved to acted-on; forward both through `fetchEvents`; build an `EventLocationFilter` (region `Select` → dependent city `Select`) fed by the existing `getRegions` geography data; wire it into the listing island + SSR page; persist the last-selected location to `localStorage` and restore it **into the URL** on a fresh visit. No geolocation.

## Boundaries & Constraints

**Always:**

- Backend change is additive and minimal: extend the events-manager `listQuerySchema` (already non-`.strict()`) with optional `city`/`region` non-empty string `documentId`s, thread them to the read service, and in `buildFilters` set the nested filter `venue: { cityRef: { documentId: city } }` (city) and/or `venue: { cityRef: { region: { documentId: region } } }` (region). Both may apply together (AND). Keep the existing `EVENT_POPULATE` (filtering needs no new populate). Malformed/unknown input is ignored (never a 500); keep error CODES and the v5 `data`/`meta.pagination` shape.
- Cross-plugin location filtering stays a **relation filter on the event query**, never a foreign-UID `strapi.documents()` call — consistent with the architecture's cross-plugin rule and precedented by `search.ts:99-101`.
- Frontend follows the established URL-state convention: RSC reads validated `searchParams`; the client island uses `useSearchParams` + `router.push(url,{scroll:false})`. **No Zustand, no nuqs.** Extend `filterParams` (add `region`; validate `city`/`region` as opaque non-empty `documentId` tokens; preserve `date` and reserved `venue`).
- Location values are locale-stable `documentId`s (**not** localized `slug`s), so remembered/shared URLs stay valid across FR/EN/AR. Matches `search.ts`/`venues.ts`.
- Region drives a dependent city list: selecting a region filters events to that region and reveals its cities (from the nested `cities` on `getRegions`); selecting a city narrows further; "Clear" resets both. Reuse the existing shadcn `Select` (`components/ui/select.tsx`); mirror `EventDateFilter`'s a11y (grouping + accessible name, ≥44×44px targets, active highlight, all labels via props).
- SSR the route; FR default, `ar` ⇒ `dir="rtl"` with localized region/city names; all copy via `getTranslations`/`useTranslations` (no hardcoded strings).
- Persistence keeps the URL as the single source of truth: on selection save `{region,city}` to `localStorage`; on a fresh `/events` visit with **no** location param, restore the saved value by updating the URL (`router.replace`, `scroll:false`), then the RSC filters from `searchParams` as usual.
- Fail soft: a `getRegions` failure renders the listing with the location filter empty/hidden (date filter still works), never a whole-page error — same contract as the date path.

**Block If:** (none — the relation path, dropdown data source, and value encoding all exist and are precedented; geolocation is resolved by the epic-context deferral below. The one thing to escalate rather than guess: if the nested `venue.cityRef[.region].documentId` filter cannot be expressed/returns wrong results against seeded data, treat it as a genuine backend-capability gap.)

**Never:**

- No geolocation / "near me": the story AC's near-me line is **superseded** by the binding epic context, which defers geolocation to Story 3.9 / Phase 2. Do not add location permission prompts or `navigator.geolocation`.
- No category (Story 3.2, deferred) or venue (Story 3.5) filtering behavior — the listing may pass those params through but must not act on them.
- Do not add an arbitrary `filters`/`populate` passthrough to the public endpoint; add only the two typed `city`/`region` params.
- Do not introduce a cookie/SSR default that competes with the URL as source of truth; persistence only seeds the URL. Do not rebuild `EventCard`/`EventDateFilter` or restyle the homepage.

## I/O & Edge-Case Matrix

| Scenario            | Input / State                             | Expected Output / Behavior                                                                                            | Error Handling                        |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Region selected     | `/events?region=<docId>`                  | Only events whose `venue.cityRef.region.documentId` matches, `startDateTime:asc`; region shown active, cities offered | 200; empty state if none              |
| City selected       | `/events?city=<docId>` (opt. `&region=`)  | Only events whose `venue.cityRef.documentId` matches                                                                  | 200; empty state if none              |
| Location + date     | `/events?date=weekend&region=<docId>`     | AND of both filters; both chips/selects reflect state                                                                 | 200                                   |
| Empty/unknown loc   | `/events?region=` or a bogus id           | Ignored ⇒ no location filter (all areas); valid-but-unmatched id ⇒ empty slice; never a crash                         | Graceful; non-strict strips empties   |
| Remembered visit    | `/events` (no loc param) + `localStorage` | Client restores saved location into the URL (`router.replace`); list re-filters                                       | Graceful; one client URL update       |
| Geography fetch err | `getRegions` throws                       | Listing renders; location filter empty/hidden; date filter still usable                                               | Caught server-side, no whole-page 500 |
| RTL locale          | `ar`                                      | `dir="rtl"`, localized region/city names + labels                                                                     | No error expected                     |

</intent-contract>

## Code Map

- `apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts` — extend `listQuerySchema` with optional `city`/`region` (`z.string().min(1)` documentId); thread into the service params object.
- `apps/strapi/src/plugins/events-manager/server/src/services/events.ts` — `buildFilters`: add the nested `venue.cityRef.documentId` (city) and `venue.cityRef.region.documentId` (region) filters (both may apply). No `EVENT_POPULATE` change.
- `apps/strapi/src/plugins/events-manager/server/src/{controllers,services}/__tests__/events.unit.test.ts` — extend: city-only, region-only, both-together filter shapes; empty/omitted ⇒ no location filter.
- `apps/client/src/features/events/filters/filterParams.ts` — add `region?` to `EventFilters`; validate/parse/serialize `city`+`region` as opaque non-empty tokens; keep `date` round-trip and reserved `venue`.
- `apps/client/src/lib/strapi-api/content/events-extended.ts` — add `city?`/`region?` to `EventQueryParams`; forward them in the `fetchAPI` params object (alongside `startDate`/`endDate`/`sort`).
- `apps/client/src/lib/strapi-api/content/geography.ts` — **reuse** `getRegions(locale)` (regions with nested `cities`) as the dropdown data source; no change expected.
- `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.tsx` — **NEW** `'use client'` control: region `Select` → dependent city `Select`, active highlight, clear, localized labels via props, ≥44px targets; emits `{region?,city?}`; owns `localStorage` save + restore-on-mount (drives URL via `onChange`).
- `apps/client/src/features/events/components/EventsListing/EventsListing.tsx` — render `EventLocationFilter` alongside `EventDateFilter`; pass `regions` + active `city`/`region`; on change, `serializeEventFilters`→`router.push` preserving other params.
- `apps/client/src/app/[locale]/events/page.tsx` — parse `city`/`region`; `getRegions(locale)` in try/catch; forward `city`/`region` to `fetchEvents`; pass `regions` + `activeFilters` to `EventsListing`.
- `apps/client/src/app/[locale]/events/loading.tsx` — add a location-filter skeleton row.
- `apps/client/locales/{fr,en,ar}.json` — add `events.listing` location keys (locationFilter group label, region/city placeholders, allRegions/allCities, clear) in FR/EN/AR.
- Tests: `apps/client/src/features/events/filters/filterParams.test.ts` (extend region/city round-trip incl. empty), `apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.test.tsx` (**NEW**), `apps/client/src/lib/strapi-api/content/events-extended.test.ts` (extend: city/region forwarded).

## Tasks & Acceptance

**Execution:**

- [x] `events-manager/.../services/events.ts` — extend `buildFilters` to apply `venue.cityRef.documentId` (city) and/or `venue.cityRef.region.documentId` (region) nested filters when provided; unchanged otherwise.
- [x] `events-manager/.../controllers/events.ts` — add optional `city`/`region` (`z.string().min(1)`) to `listQuerySchema`; pass to the service. Malformed ⇒ existing 400 `INVALID_QUERY`; absent/empty ⇒ no location filter. _(Implemented as `z.preprocess(v => v === "" ? undefined : v, z.string().min(1).optional())` so a bare `?region=` is ignored per the I/O matrix rather than 400 — honors the contract over the literal `.min(1)`.)_
- [x] `events-manager/.../__tests__/events.unit.test.ts` (services + controllers) — cover city-only, region-only, both-together filter shapes, and omitted ⇒ no location filter.
- [x] `features/events/filters/filterParams.ts` — add `region` to `EventFilters`; parse/serialize `city`+`region` (validate non-empty; preserve `date`/`venue`).
- [x] `lib/strapi-api/content/events-extended.ts` — add `city?`/`region?` to `EventQueryParams` and forward them to the public endpoint.
- [x] `features/events/components/EventLocationFilter/EventLocationFilter.tsx` — build region→dependent-city `Select` control (active highlight, clear, ≥44px, localized labels via props); emit `{region?,city?}`; `localStorage` persist + restore-on-mount via `onChange` (restore uses `router.replace`, selections use `router.push`).
- [x] `features/events/components/EventsListing/EventsListing.tsx` — render `EventLocationFilter` with the date filter; on change `serializeEventFilters`→`router.push({scroll:false})` preserving other params.
- [x] `app/[locale]/events/page.tsx` + `loading.tsx` — parse `city`/`region`; `getRegions(locale)` in a fail-soft try/catch; forward `city`/`region` to `fetchEvents`; pass `regions`+filters to `EventsListing`; add the skeleton row.
- [x] `locales/{fr,en,ar}.json` — add the `events.listing` location labels in FR/EN/AR.
- [x] Tests (Vitest) — `filterParams` region/city round-trip incl. empty/malformed; `EventLocationFilter` renders regions, cascades cities, highlights active, emits the expected value + persists/restores; `events-extended` forwards `city`/`region`.

**Acceptance Criteria:**

- Given a visitor on `/[locale]/events`, when they open the location filter, then they see the list of regions (Grand Tunis, Sfax, Sousse, …) from the geography data and can select a city within the chosen region.
- Given a region and/or city is selected, when the list re-queries, then only events at venues in that region/city are shown, ordered `startDateTime:asc`, and the active selection is highlighted.
- Given a location filter is active, when the list renders, then the URL carries `region`/`city` (`documentId`) and reloading/deep-linking that URL reproduces the same SSR-filtered list.
- Given a returning visitor who previously chose a location, when they open `/events` with no location param, then their last location is restored (localStorage → URL) and applied.
- Given a chosen location has no events, when the page renders, then the inline empty state is shown and the filter bar remains usable (never a whole-page error).
- Given the `ar` locale, when the listing renders, then layout is `dir="rtl"` with localized region/city names and filter labels.

## Design Notes

**Value encoding:** filter values are locale-stable `documentId`s, not localized `slug`s — a remembered/shared URL stays valid across FR/EN/AR (a `slug` is a localized `uid` and would break across locales). This matches `search.ts`/`venues.ts`.

**Backend filter shape (event query):**

```
city   => filters.venue = { cityRef: { documentId: city } }
region => filters.venue = { cityRef: { region: { documentId: region } } }
both   => filters.venue = { cityRef: { documentId: city, region: { documentId: region } } }
```

A nested relation filter on the `event` query — not a foreign-UID `strapi.documents()` call — so the architecture's cross-plugin rule holds. Precedented by `search.ts:99-101` (`venue.cityRef.documentId`).

**Geolocation deferral:** the story AC's "near me" option is superseded by the epic context, which lists Story 3.9 "Geolocation Near Me Filtering" as Phase 2 / deferred. It is out of scope here; only region/city selection ships.

**Persistence:** `localStorage` seeds the URL only on an unfiltered fresh visit (`router.replace`), after which the RSC filters from `searchParams` normally — no cookie/SSR default that would fork the single source of truth.

## Verification

**Commands:**

- `yarn workspace @tiween/client test --run` — expected: PASS incl. new `filterParams`/`EventLocationFilter`/`events-extended` tests.
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in story-changed files (repo has a known pre-existing baseline).
- `yarn workspace @tiween/client lint` — expected: exit 0, no new errors.
- `yarn workspace @tiween/client build` — expected: the `/[locale]/events` route still compiles.
- `cd apps/strapi && yarn type-check && yarn test --testPathPattern events.unit` — expected: PASS incl. the new city/region filter tests.

**Manual checks (if no CLI):**

- With Strapi running the 3.1a API (`cd apps/strapi && yarn seed:fresh && yarn develop`), `curl` `/api/events-manager/events?region=<docId>` and `?city=<docId>` — expected: only events at venues in that region/city; `/fr/events?region=<docId>` and `/ar/events` in the browser — expected: correctly filtered, showtime-ordered lists, active selection highlighted, RTL on `ar`, empty state on an empty area.

## Review Triage Log

### 2026-07-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 2, low 2)
- defer: 0
- reject: 8: (high 0, medium 0, low 8)
- addressed_findings:
  - `[medium]` `[patch]` The restore-on-mount `useEffect` ran **before** the `if (regions.length === 0) return null` guard, so on the fail-soft path (geography fetch failed ⇒ no control) a previously-saved location was still written into the URL — filtering the listing via a hidden, unclearable filter. The effect now bails when `regions.length === 0`; added a regression test.
  - `[medium]` `[patch]` A stale/invalid saved location (a `documentId` deleted or absent for the current locale) was restored unvalidated: the control showed "All regions/cities" while the listing was filtered (and could show empty). The restore now **reconciles** the saved `{region,city}` against the available `regions`/nested `cities`, dropping stale parts and purging storage when nothing survives; added two regression tests (stale-region purge, valid-region/stale-city drop).
  - `[low]` `[patch]` The backend `optionalDocumentId` only coerced the exact empty string, so a whitespace-only `?region=%20` slipped through as a documentId that silently matched nothing. Preprocess now `.trim()`s (blank ⇒ ignored, per the I/O matrix); added a controller test.
  - `[low]` `[patch]` The same `optionalDocumentId` had no upper length bound (a public-endpoint input threaded into a relation filter); added `.max(255)` to match the constrained-input precedent of `sort`/`locale`.
  - Rejected (8, all low): sticky remembered-location on bare `/events` (by design — the epic mandates "location remembered across visits"; `clear` persists an empty value, so it is escapable); mismatched `city`+`region` AND ⇒ empty (hand-crafted inconsistent URL; graceful empty-200 already matches the I/O matrix's "valid-but-unmatched ⇒ empty"; membership cross-validation is MVP over-engineering); Radix Select open/select cascade untested (same documented jsdom pointer-capture limitation 3.3 accepted; the `onChange` contract is covered by the clear/restore tests); nested-`cities` population "unverified" (confirmed: `getRegions` populates nested `cities` — its doc comment says "Used for the region/city filter dropdown"); array-valued location param ⇒ 400 (the existing, spec-sanctioned malformed-query behavior, consistent with `sort`/`locale`); dead `placeholder` prop on `SelectValue` (cosmetic); duplicate "Effacer" accessible name across the two clear buttons (each sits in its own distinctly-labeled `role="group"`, providing AT context); loading skeleton reserves two location selects that vanish on the empty-geography path (cosmetic, rare fail-soft path; common path correct).

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.4 (Region and City Filtering) as a cohesive cross-layer slice. Backend: the events-manager public browse endpoint now accepts optional `city`/`region` (`documentId`) query params, validated and translated into a nested relation filter (`venue.cityRef.documentId` / `venue.cityRef.region.documentId`, ANDed when both present) — the pattern `search.ts` already uses, never a foreign-UID call. Frontend: extended the shared `filterParams` URL-state layer with `region` (promoting `city`+`region` from reserved to acted-on), forwarded both through `fetchEvents`, and built an `EventLocationFilter` (region `Select` → dependent city `Select`) fed by the existing `getRegions` geography data, wired into the SSR `/[locale]/events` listing with localStorage persistence that restores the last location **into the URL** (URL stays the single source of truth). SSR + i18n + RTL; geolocation "near me" is out of scope (epic-context defers it to Story 3.9 / Phase 2).

**Files changed.**

- [apps/strapi/.../events-manager/server/src/services/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/services/events.ts) — `buildFilters` applies the nested `venue.cityRef[.region].documentId` filter when `city`/`region` are provided; `EVENT_POPULATE` unchanged.
- [apps/strapi/.../events-manager/server/src/controllers/events.ts](../../apps/strapi/src/plugins/events-manager/server/src/controllers/events.ts) — added optional `city`/`region` to `listQuerySchema` via `optionalDocumentId` (trims blanks ⇒ ignored, `.max(255)`, present ⇒ non-empty); threaded to the service.
- [apps/client/src/features/events/filters/filterParams.ts](../../apps/client/src/features/events/filters/filterParams.ts) — added `region` to `EventFilters`; parse/serialize `city`+`region` as opaque tokens; `date`/reserved-`venue` intact.
- [apps/client/src/lib/strapi-api/content/events-extended.ts](../../apps/client/src/lib/strapi-api/content/events-extended.ts) — added `city?`/`region?` to `EventQueryParams`; forwarded to the endpoint.
- [apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.tsx](../../apps/client/src/features/events/components/EventLocationFilter/EventLocationFilter.tsx) — NEW `'use client'` region→city `Select` control; a11y group + ≥44px + active highlight + localized labels; localStorage persist and reconciled restore-on-mount.
- [apps/client/src/features/events/components/EventsListing/EventsListing.tsx](../../apps/client/src/features/events/components/EventsListing/EventsListing.tsx) — renders `EventLocationFilter` alongside the date filter; serialize→`router.push`/`replace` preserving other params.
- [apps/client/src/app/[locale]/events/page.tsx](../../apps/client/src/app/[locale]/events/page.tsx) & [loading.tsx](../../apps/client/src/app/[locale]/events/loading.tsx) — `getRegions(locale)` in a fail-soft try/catch; forwards `city`/`region` to `fetchEvents`; passes `regions`+filters to the island; skeleton row.
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — `events.listing` location labels (group, region/city placeholders, allRegions/allCities) in all three locales.
- Tests: `filterParams.test.ts` (+6), `EventLocationFilter.test.tsx` (NEW, 15 incl. reconciliation/fail-soft restore), `events-extended.test.ts` (+2); backend `events.unit` services+controllers (+5 incl. whitespace-ignore).

**Review findings breakdown.** 4 patches applied (2 medium: restore-hidden-filter guard + stale-restore reconciliation; 2 low: whitespace trim + length bound — all test-covered). 0 deferred. 8 rejected as by-design / graceful / jsdom-precedent / verified / cosmetic. No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0).

**Verification performed.**

- `yarn workspace @tiween/client test --run` → PASS (93/93).
- `yarn workspace @tiween/client typecheck` → 85 total = repo baseline, **0 net-new** in story-changed files.
- `yarn workspace @tiween/client lint` → 0 errors in story files.
- `yarn workspace @tiween/client build` → `/[locale]/events` `✓ Compiled successfully`; the whole-repo TS gate stops only on the pre-existing baseline red file `app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx:147` (not in this diff), exactly as documented for 3.11/3.3.
- `cd apps/strapi && yarn type-check` → clean; `events.unit` → **36/36** (run via a temporary CJS mirror of `jest.config.ts`; `ts-node` is not installed in this environment, an env tooling gap, not a code issue).

**Residual risks.**

- Not exercised against a live Strapi + seed (not bootable here); the cross-plugin relation filter is verified by mocked-service unit tests asserting the exact `venue.cityRef[.region].documentId` filter shapes. Recommend a `yarn seed:fresh && yarn develop` + `curl /api/events-manager/events?region=<docId>` smoke check when an instance is available.
- Radix Select open/option-click is not driven in jsdom (documented limitation); selection→emit is covered indirectly via the clear/restore `onChange` assertions.
- A city-only deep-link (`?city=x` with no `region`) filters correctly server-side but shows the city select disabled in the UI (region drives the city list); acceptable degradation, not a spec violation.
- Mismatched or stale hand-edited location URLs degrade to an empty listing (graceful 200), consistent with the I/O matrix.
