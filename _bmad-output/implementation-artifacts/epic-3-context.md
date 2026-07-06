# Epic 3 Context: Event Discovery & Browsing [MVP]

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let any visitor browse and search cinema showtimes across Tunisia without creating an account. This epic delivers the discovery-first heart of the product: a curated homepage, date/venue/region filtering, keyword search, film and venue detail pages, maps, and sharing — so a user can answer "what's on, where, and when?" faster than checking scattered venue Facebook pages. MVP scope is cinema only; multi-category (theater/concerts) and geolocation are explicitly Phase 2. The whole surface builds on one real public events API (Story 3.1a) that every other story consumes.

## Stories

- Story 3.1a: Public Events Browse API & Data Foundation (backend; sprint key `3-1`)
- Story 3.1b: Homepage with Curated Event Listings (frontend; sprint key `3-11`)
- Story 3.2: Category Filtering — [Phase 2, deferred]
- Story 3.3: Date Range Filtering
- Story 3.4: Region and City Filtering
- Story 3.5: Venue Filtering
- Story 3.6: Keyword Search with Algolia
- Story 3.7: Event Detail Page
- Story 3.8: Venue Location on Map
- Story 3.9: Geolocation "Near Me" Filtering — [Phase 2, deferred]
- Story 3.10: Share Event Details

## Requirements & Constraints

- Anonymous access: all browsing, filtering, search, and detail views work with no login.
- Filtering surfaces needed: by date (today/tomorrow/weekend/custom range), by venue/cinema, by region and city (Greater Tunis first). Filter state must reflect in the URL and persist within the session; region/location preference remembered across visits.
- Detail content: film synopsis, trailer, duration, cast/crew, rating; venue location, contact, and map; all showtimes grouped by venue; shareable slugged URLs.
- Search: keyword search across events, creative works, venues, and people with fuzzy matching and ~300ms debounce; recent-search and no-results-with-suggestions states.
- Performance targets: page load <3s and search results <1s on mobile 4G; LCP <2.5s, CLS <0.1. Homepage and detail pages render via SSR with JSON-LD structured data and proper SEO/Open Graph meta tags.
- Internationalization: AR/FR/EN content, full RTL for Arabic, locale-aware date/time formatting, language switching without page reload, French fallback when a translation is missing.
- Mobile-first; touch targets ≥44×44px.

## Technical Decisions

- Backend module ownership (per plugin-decomposition amendment): `events-manager` owns scheduling types (`event`, `screening`, `performance`); `creative-works` is the single catalog of record via unified `creative-work` (type enum film/short-film/play — legacy `movie`/`play` retired); `geography` owns `region`/`city`; `venues` owns `venue`.
- The public events endpoint lives on the `events-manager` content-api and must return the Strapi v5 response shape (`data`, `meta.pagination`). It supports date-range filtering on `startDateTime`, `eventStatus` filtering, sorting, and relation populate (`venue`, `screenings`, `screening.movie` → creative-work).
- Real schema fields to target (NOT the legacy `startDate`/`status`/`creativeWork`/`showtimes.time`): `startDateTime`, `eventStatus`, `screenings`, `screening.movie`. The frontend data layer must be aligned to this real plugin schema.
- `featured` is an additive boolean on `event` (types regenerated, seed support added) driving the hero/featured slice.
- "Trending" needs a custom service/endpoint (Strapi REST can't aggregate relations): upcoming events ranked by `sum(screening.ticketsSold)` desc.
- Cross-plugin access goes only through a plugin's `public-api` facade service / plugin route prefixes — never foreign-UID `strapi.documents()` calls.
- Plugin code conventions: hand-rolled `({ strapi }) => ({...})` factories, module-level UID constants (no inline UID strings), Document Service API only, Zod validation via the shared `validate()` helper, and error CODES (not prose) in responses. Endpoints must be exercised against seeded data (`yarn seed:fresh`) returning populated results.
- Frontend: Next.js SSR; reuse the existing `HomePageWithVenue`/`EventSection`/`FilmHero`/`EventCard` UI (fix-and-wire to the real API, do not rebuild). Search powered by Algolia; maps by Leaflet or Mapbox; sharing via Web Share API with copy-to-clipboard fallback. Standard UI from shadcn/ui; domain components (EventCard, FilmHero, ShowtimePicker, DateSelector) are custom.

## UX & Interaction Patterns

- Discovery-first, content-first (show works, then venues — not venue-first). No blank slates or "search to start" screens; the homepage is pre-filtered and visually rich on first load.
- Homepage sections, each rendered with EventCard: a hero of featured events, "Ce soir" (today), "Cette semaine" (upcoming), and "Tendances" (popular). Target a sub-10-second path from open to relevant evening options.
- Sticky date + location filters that persist while scrolling; filtering feels instant (client-side when data is cached). Active filter states are visibly highlighted (e.g. selected category tab in yellow).
- Cross-venue showtime comparison for one work on a single scrollable screen, with format badges (VF, VOST, 3D) and duration; showtimes sorted within the selected date.
- Core actions (filter, share, tap-through to detail/purchase) are one tap; poster-forward visual hierarchy throughout.

## Cross-Story Dependencies

- Story 3.1b (homepage) depends on Story 3.1a — the public browse API, `featured` boolean, and trending service must exist first.
- The MVP filter stories 3.3, 3.4, 3.5 all consume 3.1a's API and share a common `filterStore`/URL-state mechanism, so build them together after the homepage.
- Recommended sequence: `3-1` (backend) → `3-11` (homepage) → `3-3`/`3-4`/`3-5` (filters) → `3-6`/`3-7`/`3-8`/`3-10`.
- Stories 3.2 (category filtering) and 3.9 (geolocation "near me") are deferred to Phase 2 and set `deferred` in sprint status.
- Cross-plugin: discovery depends on `creative-works` (film catalog/detail data), `geography` (region/city filters), and `venues` (venue detail + map). Plugin route prefixes may shift with the amendment's migration steps; keep client endpoint paths batched with any server route changes.
