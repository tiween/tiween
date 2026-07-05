---
title: "Homepage with Curated Event Listings (Story 3.1b)"
type: "feature"
created: "2026-07-05"
status: "ready-for-dev"
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

- [ ] `features/events/types/strapi.types.ts` — align domain types to the real plugin schema (`startDateTime`, `eventStatus`, `screenings`, `screening.movie`).
- [ ] `lib/strapi-api/content/events*.ts` — rewrite fetchers to real fields; add curated slices (featured / today / this-week / trending) against the Story 3.1a endpoints.
- [ ] `app/[locale]/page.tsx` — fetch the four slices in parallel, wire JSON-LD, `getTranslations` labels.
- [ ] `features/events/components/HomePage/*` — wire the existing `HomePageWithVenue`/`EventSection`/`FilmHero` to render the four sections from real data (fix & wire — do not rebuild).
- [ ] Tests — wire vitest (not currently installed in `apps/client/package.json`), then unit-test curated-slice mapping + edge cases (empty slice, API error).

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
