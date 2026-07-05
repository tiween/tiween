# Epic 3 Context: Event Discovery & Browsing

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let any visitor browse, filter, search, and inspect cultural events across Tunisia without an account, so they can quickly discover what's on and decide what to attend. This epic delivers the public discovery surface — homepage with curated listings, a filterable/searchable events listing, rich event detail pages with cross-venue showtimes, venue maps, and sharing. For MVP the only event type in scope is **cinema showtimes**; multi-category filtering (theater/concerts) and geolocation "near me" are deferred to Phase 2. This is the SEO-critical, first-impression funnel that feeds ticket purchase.

## Stories

- Story 3.1: Homepage with Curated Event Listings [MVP]
- Story 3.2: Category Filtering [Phase 2 — deferred]
- Story 3.3: Date Range Filtering [MVP]
- Story 3.4: Region and City Filtering [MVP]
- Story 3.5: Venue Filtering [MVP]
- Story 3.6: Keyword Search with Algolia [MVP]
- Story 3.7: Event Detail Page [MVP]
- Story 3.8: Venue Location on Map [MVP]
- Story 3.9: Geolocation "Near Me" Filtering [Phase 2 — deferred]
- Story 3.10: Share Event Details [MVP]

## Requirements & Constraints

- Homepage presents curated sections (hero/featured, "Ce soir", "Cette semaine", "Tendances"), all built from a shared EventCard. It is a warm discovery feed pre-filtered to "what's on" — never a cold-start empty state; it should load instantly from cache.
- Performance: homepage renders in under 3 seconds. Filtering feels instant (client-side when data is cached); keyword search debounces at 300ms.
- SEO is critical: listing and event-detail pages are server-rendered, emit JSON-LD structured data for events, and carry proper meta + OpenGraph tags. OG image + title also power share previews.
- Every filter (date, region/city, venue, and Phase-2 category) updates the URL so state is shareable and deep-linkable; active selections are visually highlighted (gold). Filters combine, and clearing one restores the broader set. Selected location is remembered across sessions.
- Date filtering offers quick options (Aujourd'hui, Demain, Ce weekend) plus a custom calendar range; results sort by showtime within the chosen date.
- Search covers events, creative works, venues, and people with fuzzy/typo-tolerant matching; surfaces recent searches on focus and an encouraging no-results state with suggestions/next action.
- Event detail must show hero (poster/backdrop), synopsis, cast & crew, all showtimes grouped by venue, venue info with address, and a tap-to-purchase path per showtime. URLs are slug-based (e.g. `/events/{slug}`).
- Venue maps show location interactively and offer a tap-through to Google/Apple Maps directions.
- Sharing uses the Web Share API with a copy-to-clipboard fallback; shared links carry the event URL and rich OG preview.
- i18n/RTL is mandatory across all screens: AR/FR/EN via next-intl (French default), Arabic flips to `dir="rtl"` with Western numerals and `DD/MM/YYYY`; wrap foreign runs (formats like VOST/VF, venue names, prices) in `<bdi>`/`dir="auto"`. Currency renders as `12,20 DT`.
- Accessibility (WCAG 2.1 AA): status conveyed by icon+text not color alone, ≥44px touch targets, focus rings, live regions for async results, honor `prefers-reduced-motion`, no horizontal scroll at 200% zoom.

## Technical Decisions

- Frontend: Next.js App Router, TypeScript strict, Tailwind v4 + shadcn/ui, next-intl `[locale]` routing. RSC by default; `'use client'` only for interactive islands (filters, carousels, search, map). Zustand for filter state, SWR for server state (~60s dedupe, `revalidateOnFocus:false`), date-fns for formatting.
- Rendering: event listings = SSR + ISR; event detail = SSR (SEO). Mobile-first PWA with offline caching of listings.
- Backend: Strapi v5 plugin monolith, REST only. Consume the Strapi v5 response shape directly (`data`, `meta.pagination{page,pageSize,pageCount,total}`) — no transformation layer. Errors arrive as codes (translated client-side), never prose.
- Relevant plugins: `events-manager`, `creative-works` (catalog of record), `venues`, `geography`. Cross-plugin access only via each plugin's `public-api` facade; client `lib/api/content/*` targets plugin route prefixes.
- Core data models (each has a `slug` uid for detail URLs):
  - `event` — title, description, `category` enum (movie_screening for MVP), start/endDateTime, eventStatus, images, `venue`, `screenings`.
  - `screening` (the MVP cinema showtime) — startDateTime, `videoFormat` (standard/3D/imax/4DX/70mm), audioLanguage, subtitleLanguage, price, ticketsAvailable/Sold, links to `event` and `movie`→creative-work.
  - `creative-work` — title, originalTitle, `type` (film/play/short-film), synopsis, duration, releaseYear, genres, `cast[]` and `credits[]` (→ person, character, credit-role), poster/backdrop/photos, videos, ratings.
  - `venue` — name, address, `cityRef`→city, `geo` (shared.geo-point), contact fields, type, capacity, images.
  - `geography` — `city` (name, region, latitude, longitude) and `region` drive region/city filters and venue coordinates.
- Search: Strapi is the indexing source; the client queries Algolia (`lib/api/algolia.ts`, `features/search/`). Index events, creative-works, venues, people. The detailed index/facet schema is an open design gap to define during implementation.
- Maps: no framework locked in — architecture leaves Leaflet vs Mapbox open. A `VenueMap` slot exists under `features/venues/components/`; coordinates come from `venue.geo` / city lat-lng.
- Component conventions: PascalCase, co-located `*.test.tsx` + `*.stories.tsx`. Shared UI in `components/`; domain code in `features/events/`, `features/venues/`, `features/search/`. Epic-named components: `EventCard`, `FilmHero`.
- Caching: SWR ~1min for events/movies; Redis server-side behind Strapi; search is client-side only.

## UX & Interaction Patterns

- Single dark theme (Midnight Aubergine field, surface-shift elevation, no shadows). The "yellow" active/selected/action signal is **Gold Leaf `#D4A24A`** (`primary`): never white text on gold fill (use dark ink), never a gold focus ring on a gold control. Category color-coding (cinema=gold, théâtre=magenta, courts=teal, music=periwinkle, art=orchid) appears only on card badge + filter-chip dot, never overriding the gold action signal.
- Homepage: horizontal category tabs (momentum/snap, gold underline for selected, arrow-key + RTL-aware), horizontal curated carousels, sticky date + location selectors that persist while scrolling; "Aujourd'hui" preselected by time of day.
- EventCard: whole card is the tap target → detail. 2:3 portrait poster in a reserved box (no layout shift, blur→sharp load), category/rating badge, title, venue • date, price, and an independent optimistic watchlist heart (fills gold). `role="article"`.
- Filters presented as a bottom sheet on mobile / dialog on desktop; active state = gold.
- Search: instant results with 300ms debounce, recent searches, suggestions, and encouraging empty/no-result states that always offer a next action.
- Event detail: FilmHero is a wide image pager (e.g. `01/05`) with title + director, meta chips, a full-pill gold `Réserver` CTA and outline trailer button; then synopsis and cast/crew. **Séances (showtimes) grouped by venue** — the signature cross-venue comparison — with an "Aujourd'hui" tab preselected. Each ShowtimeButton is `role="radio"` in a per-venue radiogroup; selecting shows gold fill + a check glyph (never color alone) and enables a sticky "Choisir cette séance". Sold-out = `aria-disabled` "Complet" kept in the tree; recommended = gold ✲ with accessible label.
- Map and share have only light UX specs — implement per platform: "near me → map" as a discovery entry, deep-linkable event URLs as the sharing primitive, native share sheet with clipboard fallback.

## Cross-Story Dependencies

- EventCard (built in 3.1) is reused by every listing/curated/search surface; FilmHero and the venue-grouped showtime list (3.7) anchor the detail page that filters and search link into.
- Filtering stories (3.3–3.5) share one filter/URL-state mechanism (Zustand `filterStore`) and should compose rather than each reimplement it; region/city (3.4) and venue (3.5) filters depend on the `geography` and `venues` plugins.
- Search (3.6) depends on Strapi→Algolia indexing being populated; its index/facet schema is an undefined design gap to resolve first.
- Event detail (3.7) hands off to ticket purchase (Epic on ticketing) via per-showtime CTAs, and feeds the map (3.8) and share (3.10) stories with venue coordinates and OG metadata.
- All MVP work is scoped to cinema showtimes; category filtering (3.2) and geolocation "near me" (3.9) are Phase 2 and should not block MVP delivery.
