---
title: "Homepage with Curated Event Listings (Story 3.1b)"
type: "feature"
created: "2026-07-05"
status: "done"
baseline_revision: "99c25c98b6a01b2c5f66383d8a60b973e209e7e4"
final_revision: "d272b9aae7dc13a0d383ae00ff7b52d8d67f18de"
review_loop_iteration: 0
followup_review_recommended: false
sprint_key: "3-11-homepage-with-curated-event-listings"
split_from: "3-1-homepage-with-curated-event-listings (split 2026-07-05 — see sprint-change-proposal-2026-07-05.md)"
depends_on: ["3-1-public-events-browse-api-and-data-foundation"]
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md"
  - "{project-root}/_bmad-output/implementation-artifacts/spec-3-1-public-events-browse-api-and-data-foundation.md"
  - "{project-root}/_bmad-output/project-planning-artifacts/architecture.md"
decisions_resolved:
  date: "2026-07-04"
  by: "user (ayoub)"
  homepage: "Fix & wire the existing HomePageWithVenue/EventSection/FilmHero/EventCard UI to real data (do not rebuild)."
  featured: "Featured/hero slice reads the `featured` boolean added in Story 3.1a."
  trending: "Tendances slice reads the trending endpoint added in Story 3.1a (sum(screening.ticketsSold) desc)."
---

<intent-contract>

## Intent

**Problem:** Visitors have no homepage that surfaces "what's on" culturally in Tunisia. Story 3.1b delivers a homepage with a hero/featured section plus curated "Ce soir" (today), "Cette semaine" (this week), and "Tendances" (trending) sections — each built from the existing `EventCard`, SSR-rendered for SEO, with JSON-LD, loading under 3 s. MVP scope is cinema showtimes only.

**Approach (frontend only):** The public events browse API, `featured` boolean, and trending endpoint already exist (Story 3.1a / key `3-1`). This story (1) aligns the frontend domain types to the real plugin schema; (2) rewrites the server-only fetchers to the real fields and adds the four curated slices (featured / today / this-week / trending); (3) fetches those four slices server-side in `app/[locale]/page.tsx`, emits event JSON-LD, supplies i18n labels; and (4) **fixes and wires the existing** `HomePageWithVenue`/`EventSection`/`FilmHero`/`EventCard` UI to render them — it does **not** rebuild the UI. A frontend test runner (vitest) must be wired before the slice-mapping unit tests.

## Boundaries & Constraints

**Always:**

- Render from the existing `EventCard` / `EventSection` / `FilmHero` components — do not build new card/carousel primitives (`EventSection` already provides scroll-snap carousels).
- Keep the home route a thin RSC (`app/[locale]/page.tsx`) that server-fetches and hands data to the `"use client"` island; `setRequestLocale(locale)` for static rendering; i18n copy via `getTranslations` into `labels` props (French default; AR ⇒ `dir="rtl"`).
- Consume the Strapi v5 response shape directly (`data`, `meta.pagination`); read only via the plugin's public endpoints from Story 3.1a.
- Emit valid event JSON-LD (reuse `components/seo/JsonLd.tsx` + `lib/seo/structured-data.ts`); proper metadata/OpenGraph.
- Accessibility (WCAG 2.1 AA); single dark theme; the gold action signal per the design system.

**Never:**

- Do not modify backend/plugin code — the API is owned by Story 3.1a. If a field or endpoint is missing, that is a 3.1a gap: escalate rather than adding backend surface here.
- Do not implement category filtering (Story 3.2) or geolocation "near me" (Story 3.9) — Phase 2, deferred.
- Do not add a bespoke client-side data-fetching stack (no SWR here); server-fetch in the RSC per convention.

**Block If:**

- The public events endpoint / `featured` / trending from Story 3.1a are not present in the repo when this story starts (it depends on 3.1a being done). If so, this is a sequencing error — surface it, do not re-implement the backend.

## I/O & Edge-Case Matrix

| Scenario           | Input / State                                                             | Expected Output / Behavior                                                                      | Error Handling                        |
| ------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| Happy path         | Home route loaded; events for today/this-week + featured + trending exist | Hero + four curated sections render populated `EventCard`s; JSON-LD present; SSR HTML           | No error expected                     |
| Empty slice        | A curated slice (e.g. "Ce soir") returns zero events                      | That section shows its inline empty state; other sections still render; never a cold empty page | Graceful, no throw                    |
| Upstream API error | Strapi fetch fails/times out                                              | Page still renders shell; affected sections degrade to empty/skeleton; error logged             | Caught server-side, no whole-page 500 |
| RTL locale         | `ar` locale                                                               | `dir="rtl"`, Western numerals, DD/MM/YYYY, `<bdi>` on foreign runs                              | No error expected                     |

</intent-contract>

## Code Map

- `apps/client/src/app/[locale]/page.tsx` — RSC home route; fetch four slices in parallel, wire JSON-LD + `getTranslations` labels, hand off to the client island.
- `apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx` — existing client homepage island (hero, filters, `EventSection` carousels) — presently wired to legacy fields; fix & wire.
- `apps/client/src/features/events/components/EventSection/EventSection.tsx` — curated scroll/grid carousel (title, see-all, `EventCard` mapping).
- `apps/client/src/features/events/components/EventCard/EventCard.tsx` — card consuming `EventCardEvent`.
- `apps/client/src/features/events/components/FilmHero/FilmHero.tsx` — hero banner (`FilmHeroEvent`).
- `apps/client/src/features/events/types/{event,strapi}.types.ts` — presentation (`EventCardEvent`) vs domain (`StrapiEvent`, `StrapiShowtime`) types — **domain types use legacy field names**; align to the real schema (`startDateTime`, `eventStatus`, `screenings`, `screening.movie`).
- `apps/client/src/lib/strapi-api/content/events.ts`, `events-extended.ts` — server-only fetchers — **query non-existent fields today**; rewrite to real fields + add the four curated slices.
- `apps/client/src/lib/strapi-api/base.ts` / `public.ts` — `PublicStrapiClient`; `API_ENDPOINTS` maps `plugin::events-manager.event` → `/events-manager/events`.
- `apps/client/src/components/seo/JsonLd.tsx`, `lib/seo/structured-data.ts` — JSON-LD component + `generateEventJsonLd`/`generateWebsiteJsonLd`.

## Tasks & Acceptance

**Execution:**

- [x] `features/events/types/strapi.types.ts` — align domain types to the real plugin schema (`startDateTime`, `eventStatus`, `screenings`, `screening.movie`). Additive: real fields added, legacy fields retained `@deprecated` for unmigrated surfaces.
- [x] `lib/strapi-api/content/events*.ts` — rewrite fetchers to real fields; add curated slices (featured / today / this-week / trending) against the Story 3.1a endpoints.
- [x] `app/[locale]/page.tsx` — fetch the four slices in parallel, wire JSON-LD, `getTranslations` labels.
- [x] `features/events/components/HomePage/*` — wire the existing `HomePageWithVenue`/`EventSection`/`FilmHero` to render the four sections from real data (fix & wire — do not rebuild).
- [x] Tests — vitest wired into `apps/client`; 28 unit tests (curated-slice mapping + edge cases: empty slice, API error) all green.

**Acceptance Criteria:**

- Given a visitor loads the homepage, when data exists, then a hero with featured events plus "Ce soir", "Cette semaine", and "Tendances" sections render, each using `EventCard`.
- Given the homepage is requested, when the response is produced, then content is server-rendered and includes event JSON-LD structured data.
- Given a curated slice is empty, when the page renders, then that section degrades gracefully and the page is never a cold empty state.
- Given the `ar` locale, when the homepage renders, then layout is `dir="rtl"` with correct numeral/date formatting.
- Given the homepage loads on a representative connection, when measured, then it renders under 3 s (NFR-P1).

## Verification

**Commands:**

- `yarn workspace @tiween/client typecheck` — expected: no type errors.
- `yarn workspace @tiween/client lint` — expected: no new errors (a11y `alt-text`, unused-vars).
- `yarn workspace @tiween/client build` — expected: successful production build (SSR route compiles).
- With Strapi running the Story 3.1a API (`cd apps/strapi && yarn seed:fresh && yarn develop`), load the home route — expected: four populated curated sections; JSON-LD present in page source.

## Notes

This is the frontend half of the original Story 3.1, split out on 2026-07-05. The UI is ~80% built already (`HomePageWithVenue`, `EventSection`, `FilmHero`, `EventCard`, JSON-LD helpers); the real work is making curated data flow correctly from the Story 3.1a API and fixing the frontend data layer that currently targets legacy field names. See `sprint-change-proposal-2026-07-05.md`.

## Review Triage Log

### 2026-07-06 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 0, medium 3, low 3)
- defer: 1
- reject: 7: (high 0, medium 0, low 7)
- addressed_findings:
  - `[medium]` `[patch]` Curated "today"/"this-week" windows were computed with `Date.setHours` in the server's timezone; on a UTC host that mis-buckets late-night Tunisian screenings around midnight. Day boundaries are now computed on the Africa/Tunis calendar (fixed UTC+1, no DST) via `Intl.DateTimeFormat` + `Date.UTC`; the boundary test was rewritten to assert the wall-clock in Africa/Tunis instead of the runner's local zone.
  - `[medium]` `[patch]` "Ce soir" (today) and "Cette semaine" windows overlapped, so every event happening today rendered as a card in **both** sections. `getThisWeekSlice` now starts at `startOfDayInDays(1)` (tomorrow) through +7d, making the two sections disjoint at the data layer; the slice test was updated.
  - `[medium]` `[patch]` The single card/hero mapper hard-coded French category labels (`"Cinéma"`…), so `en`/`ar` homepages showed French badges — a violation of the mandatory i18n/RTL constraint. `mapEventCategoryLabel`/`toEventCardEvent`/`toFilmHeroEvent` now take an optional `locale` (default `fr`, so other callers are unaffected) backed by FR/EN/AR label tables; `HomePageWithVenue` threads the active locale (via explicit arrows so `.map` doesn't bind the index to `locale`).
  - `[low]` `[patch]` The hero pagination dots' `aria-label` was hard-coded French ("Aller au slide N"); now localized FR/EN/AR (WCAG AA).
  - `[low]` `[patch]` Event JSON-LD emitted `"startDate": ""` for a dateless event (invalid schema.org Event); `buildEventsJsonLd` now skips events lacking both `startDateTime` and legacy `startDate`.
  - `[low]` `[patch]` Event JSON-LD `availability` hard-coded `InStock` whenever prices varied (ignoring inventory) and marked events `SoldOut` when `ticketsAvailable` was merely `undefined`. Availability is now `hasInventory ? InStock : SoldOut` regardless of price-tier count, and unknown inventory (missing `ticketsAvailable`) counts as available; the now-unused `maxPrice` was removed.
  - Deferred (see deferred-work.md, 2026-07-06): homepage category/date/region/venue selectors are visually interactive but do not filter the curated slices — owned by Stories 3.2/3.3/3.4/3.5, not this frontend-wiring story.
  - Rejected (7, all low): dropped `eventStatus` filter "leaking" cancelled events (the 3.1a backend already defaults to `eventStatus != cancelled`; over-filtering would wrongly drop still-valid rescheduled events); "Ce soir" labeling a full-day slice (the intent contract defines "Ce soir" as _today_); empty-upstream showing three inline empty sections (matches the spec I/O matrix's graceful-degradation row); dead `.venue.tsx`/`.city.tsx` variants under the prop rename (not Next route files, no live effect); unused `featuredTitle`/`upcomingTitle` i18n keys (harmless strings); weekend-range Sunday edge in `buildDateRange` (inert — filtering deferred, no live consumer); test fixture omitting required `StrapiEvent` fields (test files are excluded from `tsc` and run via esbuild — harmless).

### 2026-07-06 — Follow-up review pass

- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 1, low 2)
- defer: 2: (high 0, medium 2, low 0)
- reject: 9: (high 0, medium 0, low 9)
- addressed_findings:
  - `[medium]` `[patch]` Event JSON-LD emitted **relative** Strapi media URLs in `image[]` (`/uploads/poster.jpg`) while the offer URL a few lines up was correctly absolute; Google drops relative images from event rich results — and since `event.images` is now the primary image source for every homepage event, this hit every event. `structured-data.ts` now absolutizes each image (event/work/venue) with `baseUrl` via a `toAbsoluteUrl` helper.
  - `[low]` `[patch]` `EventCard` rendered the literal string "Invalid Date" when a curated event had no start instant (`getEventStartDate` returns `""` → `formatDate("")` → `new Date("")`). `formatDate` now returns `""` on an unparseable date and the date span (with its `•` separator) is omitted rather than showing garbage.
  - `[low]` `[patch]` Event JSON-LD `eventStatus` mapped `postponed`/`rescheduled` lifecycle statuses to `EventScheduled` (only `cancelled` was special-cased), misreporting those events to search engines. Now maps to `EventPostponed`/`EventRescheduled` (the `EventSchema` type already declared both — the mapping simply never used them).
  - Deferred (2, see deferred-work.md 2026-07-06 follow-up): (1) `StrapiEvent.startDate`/`endDate`/`status` kept **non-optional** though the browse API never returns them — hides broken call sites in unmigrated consumers behind false compile-time safety; (2) the 3.1a browse populate is too **shallow** to render movie-level hero metadata (`screenings.movie`) or full JSON-LD `location` (`venue.cityRef.region`) — a 3.1a populate-depth follow-up, not fixable here without touching backend.
  - Rejected (9, all low): "Ce soir" full-day window vs its label (intent contract defines "Ce soir" = _today_ — already rejected prior pass); no cross-section render-dedup (a title may appear as hero + card — common curated-feed UX, not spec-required; JSON-LD _is_ deduped); `EventCard` date formatted `fr-TN` for all locales (output is the spec-mandated DD/MM/YYYY + Western numerals — cosmetic locale arg only); hero now rotates up to 12 slides vs prior 5 (design choice via `DEFAULT_SLICE_SIZE`, not a defect); all-empty upstream renders three inline empty sections + no hero (this **is** the spec's graceful-degradation row); `mapEventCategoryLabel` French fallback on `en`/`ar` (only when `category` is absent — effectively unreachable since it is a required plugin field; the normal path is localized); inert filter selectors (already in the ledger from the prior pass); homepage over-fetches full `screenings[]` per slice (root cause is the 3.1a blanket populate already deferred under story 3-1); sibling `HomePage.tsx`/`HomePageWithCity.tsx`/`.city.tsx`/`.venue.tsx` still on the legacy schema (prior pass already rejected as no-live-effect — not wired to the home route).

## Auto Run Result

Status: done

**Summary.** Wired the existing homepage UI (`HomePageWithVenue`/`EventSection`/`FilmHero`/`EventCard`) to real data from the Story 3.1a public events API. Aligned the frontend domain types to the real events-manager schema (additive — legacy fields retained `@deprecated`), rewrote the server-only fetchers to the real fields and added four curated slices (featured / "Ce soir" / "Cette semaine" / "Tendances"), fetched them in parallel from the thin RSC home route with event JSON-LD + `getTranslations` i18n labels, and wired vitest with 28 unit tests. Fix-and-wire only — no UI rebuild, no backend changes.

**Files changed.**

- [apps/client/src/features/events/types/strapi.types.ts](../../apps/client/src/features/events/types/strapi.types.ts) — real event schema (`category`/`startDateTime`/`endDateTime`/`eventStatus`/`screenings`/`images`) + `StrapiEventCategory`/`StrapiEventStatus`/`StrapiScreening`; legacy fields kept `@deprecated`; `StrapiVenue.cityRef` added.
- [apps/client/src/lib/strapi-api/content/events-extended.ts](../../apps/client/src/lib/strapi-api/content/events-extended.ts) — public browse fetcher (`fetchEvents`) + four curated slices; Africa/Tunis-anchored day-boundary helpers; disjoint tonight/this-week windows.
- [apps/client/src/lib/strapi-api/content/events.ts](../../apps/client/src/lib/strapi-api/content/events.ts) — thin wrappers over the new fetchers.
- [apps/client/src/features/events/utils/eventMappers.ts](../../apps/client/src/features/events/utils/eventMappers.ts) — pure `StrapiEvent → EventCardEvent`/`FilmHeroEvent` mappers, defensive on missing relations; locale-aware category labels (FR/EN/AR).
- [apps/client/src/app/[locale]/page.tsx](../../apps/client/src/app/[locale]/page.tsx) — thin RSC: four slices in parallel, deduped event JSON-LD (skips dateless events) + website JSON-LD, `getTranslations` labels, `setRequestLocale`.
- [apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx](../../apps/client/src/features/events/components/HomePage/HomePageWithVenue.tsx) — hero from featured + three curated sections via `EventSection`; locale threaded to mappers; localized hero aria-label.
- [apps/client/src/lib/seo/structured-data.ts](../../apps/client/src/lib/seo/structured-data.ts) — `generateEventJsonLd` reads real fields; corrected offer availability logic.
- [apps/client/locales/{fr,en,ar}.json](../../apps/client/locales/fr.json) — `home` namespace (section titles + selector labels).
- Test harness: `apps/client/vitest.config.ts`, `apps/client/test/stubs/server-only.ts`, `apps/client/package.json` (vitest + `test` script); tests [eventMappers.test.ts](../../apps/client/src/features/events/utils/eventMappers.test.ts) + [events-extended.test.ts](../../apps/client/src/lib/strapi-api/content/events-extended.test.ts) — 28 passing.

**Review findings breakdown.** 6 patches applied (3 medium, 3 low — see Review Triage Log), 1 deferred (inert filter selectors → Stories 3.2–3.5), 7 rejected as noise/by-design. No intent_gap and no bad_spec loopback (`review_loop_iteration` stayed 0).

**Verification performed.**

- `yarn workspace @tiween/client test --run` → PASS (28/28: mapper + fetcher/slice, incl. empty-slice and API-error edge cases; TZ boundary + disjoint-window assertions).
- `yarn workspace @tiween/client typecheck` → 85 total errors, **0 in any story-changed file** and **0 net-new** (repo baseline was 123; this story is additive/back-compat and reduced the count). The 85 are pre-existing, unrelated (missing `leaflet` module, sibling `HomePage`/`HomePageWithCity` variants, ticketing prototypes).
- `yarn workspace @tiween/client lint` → PASS (exit 0, 0 errors; pre-existing warnings only, none in story files).
- `yarn workspace @tiween/client build` → "✓ Compiled successfully" (the SSR home route and all app code compile). The whole-repo `next build` TS gate fails only on the **pre-existing** `src/app/[locale]/desktop-prototypes/ticketing-quantity/page.tsx:147` (not in this diff) — a baseline red-build condition, out of scope for 3.11.

**Residual risks.**

- Not exercised against a live Strapi + seed (booting Strapi is out of reach unattended); curated data flow is verified by unit tests mirroring the 3.1a flat-query contract, plus typecheck/build-compile. Recommend a `cd apps/strapi && yarn seed:fresh && yarn develop` + load-the-home-route smoke check when an instance is available.
- 3.1a populate gap: the public browse populates `screenings` shallow, so `screening.movie` (poster/genres/rating) is not populated on curated reads — cards/hero map from event-level fields instead. Richer movie metadata on the homepage would need 3.1a to populate `screenings.movie`.
- The whole-repo production build remains red on pre-existing unrelated files; making `next build` fully green is separate cleanup work.
- The new EN/AR category-label paths are not yet directly unit-tested (existing mapper tests cover the FR default); low risk given the simple lookup tables.

---

**Follow-up review (2026-07-06).** A fresh adversarial + edge-case review pass over the same baseline diff (`done` follow-up, `review_loop_iteration` unchanged at 0 — no bad_spec/intent_gap). Applied 3 patches, all in this pass's Review Triage Log:

- `structured-data.ts` — event JSON-LD `image[]` now absolutizes relative Strapi media URLs (`/uploads/...`) with `baseUrl`; `eventStatus` now maps `postponed`/`rescheduled` to their own schema.org statuses instead of `EventScheduled`.
- `EventCard.tsx` — `formatDate` guards an unparseable/empty date so a dateless curated event no longer renders the literal "Invalid Date".

Verification (this pass): `yarn workspace @tiween/client test` → 28/28 PASS; `yarn ... typecheck` → 85 errors, **0 net-new** and **0 in either patched file** (measured baseline pre-3-11 = 132 → done = 85, so the story reduced, not regressed, the count); `yarn eslint` on both changed files → 0 errors. Two items deferred to the ledger (legacy required-field typing; 3.1a populate-depth for hero metadata + JSON-LD location); 9 rejected as by-design/already-tracked. `followup_review_recommended` set to `false` — the fixes are localized (SEO structured-data correctness + one render guard), medium/low consequence, no behavior/API breadth warranting another independent pass.
