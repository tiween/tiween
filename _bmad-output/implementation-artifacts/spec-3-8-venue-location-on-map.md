---
title: "Venue Location on Map (Story 3.8)"
type: "feature"
created: "2026-07-09"
status: "done"
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: "63549faf0bc3a9160c842f63a00a731d2d037d08"
final_revision: "01e54389080c5a490333b53defc111eba53c057c"
sprint_key: "3-8-venue-location-on-map"
depends_on:
  ["3-7-event-detail-page", "3-1-public-events-browse-api-and-data-foundation"]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-7-event-detail-page.md"
warnings: ["oversized"]
---

<intent-contract>

## Intent

**Problem:** The event detail page (Story 3.7) shows the venue as address/city/region **text only** — the AC "see an interactive map showing the venue location" is unmet. A well-structured Leaflet map scaffold already exists (`Map/VenueMap.tsx` dynamic-`ssr:false` wrapper → `Map/VenueMapClient.tsx` real Leaflet + OSM tiles + a Google-directions link), and the backend already deep-populates `venue.geo` (`{ latitude, longitude }`) via `DETAIL_POPULATE`. But (a) `leaflet`/`react-leaflet` are not installed, (b) `toEventDetail`/`DetailVenue` never carry the venue's `geo` coords or `documentId`, so `EventDetailPage` has no coordinates to feed the map, (c) the map strings ("Itinéraire", "Chargement de la carte…") are hardcoded French, directions are Google-only, and (d) the venue seed sets no coordinates, so nothing can render against seeded data.

**Approach (fix-and-wire — do NOT rebuild):** Install `leaflet` + `react-leaflet` (+ `@types/leaflet`). Thread `venue.geo` → `documentId`/`latitude`/`longitude` through `toEventDetail`/`DetailVenue`. In the live `EventDetailPage` venue section, when coordinates exist, render the existing `<VenueMap venue={…} showDirections />` plus a localized "Get directions" link; when coordinates are absent, keep today's text-only block (graceful degradation). Extract the Google-Maps directions URL into a pure, testable `buildDirectionsUrl` helper that also emits an Apple-Maps URL on Apple platforms (satisfying "Google Maps/Apple Maps"), and use it in both the map popup and the detail page. Localize the map's directions/loading labels via next-intl label props (French defaults preserved). Add real Tunis coordinates to the venue seed so the map is observable end-to-end.

## Boundaries & Constraints

**Always:**

- Reuse the existing `Map/VenueMap` + `Map/VenueMapClient` scaffold and the live `EventDetailPage` — wire the real `venue.geo` data into them; do not rebuild the map, the mapper, or the detail page. `VenueMap` stays a generic reusable component (single-venue + multi-venue props intact).
- Read coordinates only from the real schema path `event.venue.geo.{latitude,longitude}` (Strapi component `shared.geo-point`, decimals). `venue.geo` is already deep-populated by `DETAIL_POPULATE` in `findEvent` — **no backend populate change**. Never a foreign-UID `strapi.documents()` call; never re-read a legacy field (`venue.coordinates`, `venue.lat/lng`, `event.creativeWork`, `venue.city`).
- Coordinate validity gate: treat coords as present only when both `latitude` and `longitude` are finite numbers (a partially-populated or absent `geo` ⇒ no map). The mapper stays pure/resilient (the `toEventDetail` contract): missing venue / missing geo maps without throwing.
- The map is client-only: it must reach the browser exclusively through the existing `next/dynamic(() => import("./VenueMapClient"), { ssr: false })` island inside the `"use client"` `VenueMap`; no Leaflet import may enter the server render path.
- Directions: `buildDirectionsUrl` is pure and unit-tested — Google Maps universal URL by default (`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`), Apple Maps (`https://maps.apple.com/?daddr=<lat>,<lng>`) when a passed platform hint is Apple; opens in a new tab (`target="_blank" rel="noopener noreferrer"`). Reused by both `VenueMapClient` popup and the detail-page directions control (no duplicated URL logic).
- i18n (project rule — no hardcoded strings in rendered output): add `events.*` keys (`getDirections`, `mapLoading`, and a `mapUnavailable`/aria label as needed) at FR/EN/AR parity; the detail route's `getTranslations("events")` bundle passes them into `EventDetailPage`, which forwards `directionsLabel`/`loadingLabel` props to `VenueMap` (French literals kept only as the component's default fallback). Arabic uses Western numerals; RTL inherited from the layout.
- Seed additive-only: add `geo` (real Tunis lat/lng) to the existing `SEED_VENUES` entries + `SeedVenue` interface + the venue-create call; change no other seed field and no venue schema.

**Block If:** (none expected — the map scaffold, the `venue.geo` populate, the `StrapiVenue.geo` type, the dynamic-import island, and the directions pattern all already exist. Escalate rather than guess only if installing `react-leaflet` (React-19 peer) proves incompatible with the pinned `react@19`/`next@16` such that the client build cannot resolve the map import — a dependency conflict a dev pass cannot safely force-resolve.)

**Never:**

- No standalone venue page/route (none exists; the map lives on the event detail page). No Mapbox, no self-hosted tile server, no map-provider API keys — keep OSM tiles.
- No "nearby public transport" data feature: the venue schema has no transit field, so the conditional AC ("if available") resolves to nothing to render — omit it; do not invent a field, scrape transit data, or hardcode transit text. Log a future `venue.publicTransport` field to `deferred-work.md`.
- Do not wire the legacy `EventDetailPageWithMap`/`EventDetailPageDesktop` variants (they read the removed `event.creativeWork`; already logged as deferred). Do not touch the shallow browse populate, `findEvents`, `findTrending`, filters, or search.
- No geolocation / "near me" / distance (Story 3.9, deferred). No multi-venue map on the detail page (one event = one venue).

## I/O & Edge-Case Matrix

| Scenario                     | Input / State                                  | Expected Output / Behavior                                                                                                    | Error Handling             |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Venue with coords            | `venue.geo = { latitude, longitude }` (finite) | Venue section renders address text **and** an interactive `<VenueMap>` marker centered on the venue + a "Get directions" link | 200, no throw              |
| Venue without coords         | `venue.geo` null / partial / non-finite        | Text-only venue block (today's behavior); no map, no directions link                                                          | Graceful, no throw         |
| No venue                     | `event.venue` absent                           | Venue section omitted entirely (unchanged)                                                                                    | Graceful, no throw         |
| Directions tap (non-Apple)   | click "Get directions"                         | Opens Google Maps directions URL (`…/dir/?api=1&destination=lat,lng`) in a new tab                                            | No error                   |
| Directions on Apple platform | platform hint = iOS/mac                        | `buildDirectionsUrl` returns the Apple Maps `maps.apple.com/?daddr=` URL                                                      | No error                   |
| RTL locale                   | `ar`                                           | Localized `getDirections`/loading labels, `dir="rtl"` inherited; Western numerals                                             | No error                   |
| SSR                          | server render of the route                     | No Leaflet on the server; map mounts client-side via the `ssr:false` dynamic import (loading placeholder first)               | No `window is not defined` |

</intent-contract>

## Code Map

- `apps/client/package.json` — add deps `leaflet` (^1.9), `react-leaflet` (^5, React-19 peer); devDep `@types/leaflet`.
- `apps/client/src/features/events/utils/eventMappers.ts` — extend `DetailVenue` with `documentId: string`, `latitude?: number`, `longitude?: number`; in `toEventDetail`, map them from `event.venue.documentId` and `event.venue.geo` (only when both coords are finite via a small `hasCoords` guard). `EventDetailData.venue` type follows.
- `apps/client/src/features/events/utils/directions.ts` (new) — pure `buildDirectionsUrl({ latitude, longitude }, opts?: { platform?: "apple" | "other"; label? })` → Google (default) or Apple Maps URL; encode label if used. Export via `utils/index.ts`.
- `apps/client/src/features/events/utils/directions.test.ts` (new) — cover Google default, Apple platform branch, coordinate formatting/encoding.
- `apps/client/src/features/events/utils/eventMappers.test.ts` — add `toEventDetail` cases: geo mapped when finite; omitted when geo missing/partial/non-finite; `documentId` carried.
- `apps/client/src/features/events/components/Map/VenueMapClient.tsx` — replace the inline `getDirectionsUrl` with the shared `buildDirectionsUrl`; accept an optional `directionsLabel` prop (default `"Itinéraire"`) for the popup link.
- `apps/client/src/features/events/components/Map/VenueMap.tsx` — thread optional `directionsLabel` + `loadingLabel` props (defaults keep the current French literals) to the dynamic loader / client.
- `apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx` — in the venue `<section>`, when `detail.venue.latitude`/`longitude` are set, render `<VenueMap venue={{ documentId, name, address, city, latitude, longitude, type: "cinema" }} height="250px" showDirections directionsLabel={labels.getDirections} loadingLabel={labels.mapLoading} />` and a "Get directions" link built from `buildDirectionsUrl`; keep the text block. Extend `EventDetailPageLabels` with `getDirections`/`mapLoading`.
- `apps/client/src/app/[locale]/events/[documentId]/page.tsx` — add `getDirections`/`mapLoading` to the `getTranslations("events")` labels bundle passed to `<EventDetailPage>`.
- `apps/client/locales/{fr,en,ar}.json` — add `events.getDirections`, `events.mapLoading` (and any aria/`mapUnavailable`) at parity.
- `apps/strapi/src/plugins/venues/server/src/services/seed.ts` — add `geo?: { latitude; longitude }` to `SeedVenue`, real Tunis coords to `SEED_VENUES` entries, and set `geo` in the create payload.
- `apps/client/vitest.config.ts` — if `directions.test.ts` falls outside the current `test.include` allowlist, add its path (mapper test dir is already included).

## Tasks & Acceptance

**Execution:**

- [x] `apps/client/package.json` — install `leaflet` + `react-leaflet` (+ `-D @types/leaflet`); confirm the lockfile resolves against `react@19`/`next@16`.
- [x] `features/events/utils/directions.ts` (+ `utils/index.ts`) — add pure `buildDirectionsUrl` (Google default / Apple branch), exported.
- [x] `features/events/utils/eventMappers.ts` — extend `DetailVenue` (documentId, latitude?, longitude?) and map `venue.documentId` + finite `venue.geo` in `toEventDetail`.
- [x] `features/events/components/Map/VenueMapClient.tsx` + `Map/VenueMap.tsx` — use shared `buildDirectionsUrl`; accept `directionsLabel`/`loadingLabel` props (French defaults).
- [x] `features/events/components/EventDetailPage/EventDetailPage.tsx` — render `<VenueMap>` + directions link when coords exist; extend `EventDetailPageLabels`; text-only fallback otherwise.
- [x] `app/[locale]/events/[documentId]/page.tsx` — thread `getDirections`/`mapLoading` labels into the bundle.
- [x] `locales/{fr,en,ar}.json` — add the new `events.*` map keys at FR/EN/AR parity.
- [x] `apps/strapi/.../venues/server/src/services/seed.ts` — add real Tunis `geo` coords to seeded venues (additive).
- [x] `features/events/utils/{directions,eventMappers}.test.ts` (Vitest) — cover directions URL branches and geo mapping (present / partial / absent); register test path in `vitest.config.ts` if needed.

**Acceptance Criteria:**

- Given a published cinema event whose venue has `geo` coordinates, when the detail page loads, then an interactive Leaflet map (OSM tiles) shows a marker at the venue and the venue address is displayed alongside it.
- Given the venue map (or its directions control), when the user taps "Get directions", then a maps directions URL for the venue's coordinates opens in a new tab (Google Maps by default; Apple Maps on Apple platforms).
- Given a venue with no/partial coordinates, when the detail page renders, then the venue block shows address/city/region text only, with no map and no directions link, and the page does not throw.
- Given SSR of the route, when the server renders, then no Leaflet code runs on the server (the map mounts client-side via the existing `ssr:false` dynamic import) and there is no `window is not defined` error.
- Given the `ar`/`en` locales, when the map area renders, then the directions and loading labels are localized (no hardcoded French in the rendered detail page).

## Spec Change Log

(none — no bad_spec loopback)

## Review Triage Log

### 2026-07-09 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 1, low 3)
- defer: 3
- reject: 7
- addressed_findings:
  - `[medium]` `[patch]` **Coordinate gate only checked finiteness — null-island `(0,0)` and out-of-range values rendered a map/directions pointing at the wrong place; string decimals were silently dropped.** Hardened `toEventDetail`'s `hasCoords` in `eventMappers.ts`: coerce with `Number()` (Strapi decimals may serialize as numeric strings), require finite + `lat∈[-90,90]`/`lng∈[-180,180]`, and reject exactly `(0,0)`. Added mapper tests for null-island, out-of-range, and numeric-string coords.
  - `[low]` `[patch]` **Duplicate "Get directions" affordances with inconsistent providers.** The detail map passed `showDirections` (popup link, always Google) _and_ rendered a standalone link below it (platform-aware) — two controls for the same venue that opened different map apps on iPhone. Dropped `showDirections`/`directionsLabel` from the detail-page `<VenueMap>` call, leaving the single standalone, labeled, platform-aware link.
  - `[low]` `[patch]` **Loading placeholder stayed in the a11y tree after the map mounted.** The always-mounted `absolute inset-0` "Loading map…" div (behind the opaque map) kept being announced by assistive tech. Added `aria-hidden="true"` to it.
  - `[low]` `[patch]` **Platform sniff (Apple-vs-Google) was an untestable local in an untested component.** Extracted `platformFromUserAgent(ua)` into the pure, allowlisted `directions.ts`; `EventDetailPage.detectDirectionsPlatform` now calls it. Added a UA table test (Apple-family ⇒ apple; Android/Windows/Linux/empty ⇒ other).
  - Deferred (3): (a) Leaflet marker icons load from the external `unpkg.com` CDN — self-host from the bundled `leaflet` package for reliability/privacy; (b) no jsdom render test for the `EventDetailPage` map/directions wiring (gate branches + `href` coords + label threading) — needs the component test dir added to the vitest `include` allowlist; (c) `seed.unit.test.ts` asserts only `create` call counts, not that the `geo` payload is written. All appended to `deferred-work.md`.
  - Rejected (7): venue marker `type` hardcoded `"cinema"` (spec-directed; MVP is cinema-only; cosmetic popup badge); seed idempotent-by-slug doesn't backfill `geo` onto already-seeded DBs (dev seed; `yarn seed:fresh` covers it; production data migration is out of scope); empty-string localized label ⇒ icon-only link (locales are populated at parity; defensive-only); macOS-desktop UA classified as Apple (link works; provider preference is subjective); French default-label ellipsis drift `...` vs `…` (cosmetic; defaults unused on the wired path); external links lack an "opens in new tab" cue (low a11y nit; matches the existing codebase pattern); dynamic-import chunk-load-failure has no error boundary (low-probability edge; a full error/retry surface is disproportionate here).

## Design Notes

**Coordinates already flow from the backend — only the client mapper is blind to them.** `DETAIL_POPULATE.venue.populate.geo = true` and `StrapiVenue.geo?: StrapiGeoPoint` already exist; the single missing link is `toEventDetail` copying `venue.geo` into `DetailVenue`. Keep the mapper's finite-number guard so bad/absent geo degrades to text (never `NaN` markers).

**Why a shared `buildDirectionsUrl`.** The Google URL is currently inlined in `VenueMapClient`; the detail page needs the same link, and the AC names both Google and Apple. A pure helper (platform hint passed in, not read from `navigator` inside the helper) keeps it unit-testable and de-duplicates the URL. Example:

```ts
buildDirectionsUrl({ latitude: 36.8, longitude: 10.18 })
// "https://www.google.com/maps/dir/?api=1&destination=36.8,10.18"
buildDirectionsUrl({ latitude: 36.8, longitude: 10.18 }, { platform: "apple" })
// "https://maps.apple.com/?daddr=36.8,10.18"
```

**i18n via label props, not a rewrite.** `VenueMap`/`VenueMapClient` are generic and reused; rather than importing next-intl into them, pass `directionsLabel`/`loadingLabel` (French defaults) so the detail route supplies localized strings while other call sites keep working.

**"Public transport if available" is genuinely N/A.** No `publicTransport` field exists on the venue schema, so the conditional AC has no data to render — omitted by design, future field logged to `deferred-work.md`.

## Verification

**Commands:**

- `yarn workspace @tiween/client add leaflet react-leaflet && yarn workspace @tiween/client add -D @types/leaflet` — expected: installs, lockfile resolves.
- `yarn workspace @tiween/client test --run` — expected: PASS incl. new `directions` + extended `eventMappers` geo tests.
- `yarn workspace @tiween/client typecheck` — expected: no net-new type errors in changed files (known pre-existing baseline).
- `yarn workspace @tiween/client lint` — expected: exit 0, no new errors.
- `yarn workspace @tiween/client build` — expected: the `/[locale]/events/[documentId]` route compiles with the new map imports (dynamic `ssr:false` island resolves; no server-side Leaflet).
- `cd apps/strapi && yarn type-check` — expected: exit 0 (seed `geo` additive).

**Manual checks (if no CLI):**

- With Strapi seeded (`yarn seed:fresh`) + running, open `/fr/events/<documentId>` and `/ar/events/<documentId>` for a venue with coords — expected: an interactive marker map under the venue address, a localized "Get directions" link opening a maps URL in a new tab; a venue without coords shows text only; RTL on `ar`; no console `window is not defined`.

## Auto Run Result

Status: done

**Summary.** Delivered Story 3.8 (Venue Location on Map) as a **fix-and-wire** of the pre-existing but unused Leaflet map scaffold onto the real Story-3.1a schema. The event detail page previously showed the venue as address/city/region text only. **Frontend:** installed `leaflet` + `react-leaflet` (+ `@types/leaflet`); threaded the backend-populated `venue.geo` (`{ latitude, longitude }`) and `documentId` through `toEventDetail`/`DetailVenue`; rendered the existing `Map/VenueMap` (dynamic `ssr:false` Leaflet island, OSM tiles) plus a localized, platform-aware "Get directions" link in the `EventDetailPage` venue section — gated on valid finite/in-range/non-null-island coordinates, degrading to text-only otherwise; extracted a pure, unit-tested `buildDirectionsUrl` (Google default / Apple Maps on Apple platforms) and a pure `platformFromUserAgent` sniff; localized the map's directions/loading labels (fr/en/ar) via label props (no hardcoded French on the rendered page). **Backend:** added real Tunis `geo` coordinates to the venue seed (additive; `DETAIL_POPULATE` already populated `venue.geo`, so no populate change). No backend endpoint, no standalone venue route, no Mapbox, no geolocation. The "nearby public transport if available" AC facet is genuinely N/A (no schema field) — omitted by design and logged.

**Files changed.**

- [apps/client/package.json](../../apps/client/package.json) — `leaflet@^1.9.4`, `react-leaflet@^5.0.0`, `@types/leaflet@^1.9.21`.
- [apps/client/.../utils/directions.ts](../../apps/client/src/features/events/utils/directions.ts) (new) + [directions.test.ts](../../apps/client/src/features/events/utils/directions.test.ts) (new) — pure `buildDirectionsUrl` (Google/Apple) + `platformFromUserAgent`; 12 tests.
- [apps/client/.../utils/eventMappers.ts](../../apps/client/src/features/events/utils/eventMappers.ts) (+ [eventMappers.test.ts](../../apps/client/src/features/events/utils/eventMappers.test.ts)) — `DetailVenue` gains `documentId`/`latitude?`/`longitude?`; `toEventDetail` maps + validates `venue.geo` (finite, in-range, non-`(0,0)`, string-coercing); 38 tests.
- [apps/client/.../utils/index.ts](../../apps/client/src/features/events/utils/index.ts) — export the directions helpers.
- [apps/client/.../components/Map/VenueMap.tsx](../../apps/client/src/features/events/components/Map/VenueMap.tsx) + [VenueMapClient.tsx](../../apps/client/src/features/events/components/Map/VenueMapClient.tsx) — module-scope `ssr:false` island; `directionsLabel`/`loadingLabel` props (French defaults); shared `buildDirectionsUrl`; `aria-hidden` loading placeholder.
- [apps/client/.../components/EventDetailPage/EventDetailPage.tsx](../../apps/client/src/features/events/components/EventDetailPage/EventDetailPage.tsx) — venue map + single platform-aware directions link when coords exist; `EventDetailPageLabels` extended.
- [apps/client/.../events/[documentId]/page.tsx](../../apps/client/src/app/[locale]/events/[documentId]/page.tsx) — thread `getDirections`/`mapLoading` labels.
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — `events.getDirections` + `events.mapLoading` at parity.
- [apps/strapi/.../venues/server/src/services/seed.ts](../../apps/strapi/src/plugins/venues/server/src/services/seed.ts) — real Tunis `geo` on all 8 seed venues (additive).

**Review findings breakdown.** 4 patches applied (1 medium: coordinate gate hardened against null-island/out-of-range/string decimals; 3 low: de-duplicated the directions affordance + fixed popup/page provider inconsistency, `aria-hidden` on the loading placeholder, extracted+tested the platform sniff). 3 deferred (unpkg-CDN marker icons → self-host; no `EventDetailPage` render-wiring test → needs vitest `include` change; `seed.unit.test.ts` doesn't assert the `geo` payload). 7 rejected (spec-directed `type:"cinema"` marker in a cinema-only MVP; dev-seed idempotency; defensive/cosmetic/subjective nits). No intent_gap, no bad_spec loopback (`review_loop_iteration` stayed 0). `followup_review_recommended: false` — the fixes are localized and unit-tested; the sole unverifiable aspect (live Leaflet render) is an environment limit a follow-up code review would not resolve.

**Verification performed (re-run post-patch).**

- `yarn workspace @tiween/client test --run` → PASS **165/165** (9 files; +10 net-new: `directions.test.ts` 12, `eventMappers.test.ts` 38). `directions.test.ts` confirmed matched by the vitest `include` allowlist.
- `yarn workspace @tiween/client typecheck` → **73** errors = the exact pre-existing baseline (**0 net-new**); none in the patched files (`directions.ts`/`eventMappers.ts`/`EventDetailPage.tsx`/`VenueMap.tsx` clean). Residual `EventDetailPageWithMap.tsx` (legacy, unrouted) and `Map/VenueMap.tsx:116-117` (`allVenues[0]` index-access in the untouched `center` useMemo, runtime-guarded by a length check) are pre-existing.
- `yarn workspace @tiween/client lint` → **0 errors** (282 warnings, pre-existing baseline).
- `yarn workspace @tiween/client build` → webpack `✓ Compiled successfully`; the map bundles via the `ssr:false` island with no server-side Leaflet. The build's integrated `tsc` gate then fails only on the pre-existing baseline (`desktop-prototypes/ticketing-quantity/page.tsx`), unchanged by this story.
- `cd apps/strapi && yarn type-check` → exit 0 (seed `geo` additive).

**Residual risks.**

- Not exercised against a live Leaflet render or a booted Strapi + seed (not available here). The `venue.geo` populate, the mapper coordinate validation, the directions URL, and the platform sniff are covered only by mocked unit tests; actual marker placement, tile loading, and the on-page map/directions wiring in `EventDetailPage` were not visually verified. Recommend `yarn seed:fresh && yarn develop`, then a browser pass of `/fr/events/<id>` + `/ar/events/<id>` (map marker at the venue, directions link opens a maps URL) when an instance is available.
- Existing DBs that already ran the venue seed won't get `geo` without a fresh re-seed (`yarn seed:fresh`) — the map silently stays text-only until then.
- Leaflet marker icons load from `unpkg.com` (pre-existing scaffolding; deferred to self-host).
