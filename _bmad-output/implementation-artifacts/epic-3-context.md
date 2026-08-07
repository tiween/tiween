# Epic 3 Context: Event Discovery & Browsing

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Visitors can browse and search cultural events across Tunisia without creating an account. As of the 2026-08-06 strategic pivot, v1 is a **multi-category aggregation platform** (cinema, theater, concerts, exhibitions) with **no ticketing**: category filtering (3.2) is back in v1 scope, geolocation (3.9) stays deferred, and a new story (3.12) hides the already-shipped purchase surfaces behind a default-off feature flag. Epic 3 is the discovery heart of the v1 launch — the platform's core value is "find what's happening — films, theater, concerts, exhibitions — across Tunisia."

## Stories

- Story 3.1a (key `3-1`): Public Events Browse API & Data Foundation — done
- Story 3.1b (key `3-11`): Homepage with Curated Event Listings — done
- Story 3.2: Category Filtering — backlog (un-deferred 2026-08-06)
- Story 3.3: Date Range Filtering — done
- Story 3.4: Region and City Filtering — done
- Story 3.5: Venue Filtering — done
- Story 3.6: Keyword Search with Algolia — done
- Story 3.7: Event Detail Page — done
- Story 3.8: Venue Location on Map — done
- Story 3.9: Geolocation "Near Me" Filtering — deferred (Phase 2)
- Story 3.10: Share Event Details — done
- Story 3.12: Gate Ticketing Entry Points for V1 — backlog (added 2026-08-06)

## Requirements & Constraints

- Anonymous browsing: all discovery features work without an account.
- Filters: category, date range (today/tomorrow/weekend/custom), region/city, venue — combinable, reflected in the URL, persisted for the session (not across sessions). Keyword search covers events, creative works, venues, and people.
- Event detail: showtimes grouped by venue, venue info with map, shareable SEO-friendly slug URLs, Open Graph tags, JSON-LD structured data, SSR rendering.
- **Aggregation-only v1 (critical):** no route or visible control in the v1 client may initiate a purchase. Purchase surfaces shipped by Epic 6 stories 6.1/6.2/6.3 (ticket prices, quantity selection, Konnect checkout) must sit behind a feature flag, default off, configurable per environment (env var or Strapi config). Flipping the flag restores them with zero code changes; existing ticketing tests must keep passing with the flag on. Direct navigation to checkout routes returns not-found/redirect. No rollback of ticketing code — it stays dormant.
- Performance: page load < 3s on mobile 4G, LCP < 2.5s, search results < 1s, CLS < 0.1.
- i18n: AR/FR/EN with RTL for Arabic, language-prefixed URLs, fallback to French; events display in the user's preferred language when available.
- Accessibility: WCAG 2.1 AA, 44px minimum touch targets, keyboard navigation, visible focus.
- Graceful degradation: core browsing must work when payments/backends are unavailable.

## Technical Decisions

- Backend: Strapi v5 plugin monolith. Epic 3 lives in `events-manager` (event, screening, performance — scheduling only), `creative-works` (unified `creative-work` catalog with type enum film/short-film/play; person/character/credit-role; legacy movie/play retired), `venues` (venue + property types), and `geography` (region, city).
- Cross-plugin law: acyclic dependency graph; cross-plugin calls only through each plugin's single `public-api` facade service; never `strapi.documents()` with a foreign UID. Module-level UID constants, Document Service API only, hand-rolled service factories, Zod validation in `server/src/validation/`, error responses carry codes (not prose) — client translates.
- Public events API (built in 3.1a): Strapi v5 response shape (`data`, `meta.pagination`), date-range/eventStatus filtering, sorting, relation populate (venue, screenings, screening.movie → creative-work), additive `featured` boolean, and a `trending` endpoint ranked by `sum(screening.ticketsSold)` desc. All Epic-3 surfaces build on it.
- Frontend: Next.js 16.1 App Router, SSR for SEO, `lib/api/content/*` as the data layer (plugin route prefixes, e.g. `/venues/*`). Existing homepage components (`HomePageWithVenue`/`EventSection`/`FilmHero`/`EventCard`) are fixed-and-wired, not rebuilt.
- Search: Algolia. Maps: Leaflet or Mapbox. Media: ImageKit CDN. API responses cached ~5-minute TTL.
- Inventory signal (`ticketsSold`/`ticketsAvailable`) lives on events-manager sub-events; ticketing writes to it via the events-manager facade — discovery only reads it (trending).

## UX & Interaction Patterns

- Dark-first single theme: Tiween Green (#032523) + Yellow (#F8EB06); Lalezar display type, Inter body, Noto Sans Arabic. Mobile-first (65% Chrome Android).
- Navigation: bottom tab bar on mobile (Home, Search, Tickets, Account — 64px, persistent); desktop header with logo, horizontal category tabs, expandable search, AR/FR/EN toggle.
- Category filter: horizontal always-visible tabs — Tout / Cinéma / Théâtre / Courts-métrages / Musique / Expositions; active tab highlighted in yellow; filtering without full page reload.
- Filters: date via sticky selector, location/genre via bottom sheets; active filters shown as dismissible chips with count badge and "Effacer tout".
- Search: 300ms debounce instant results, last-5 recent searches on focus (stored locally), no-results state with suggestions.
- Cards are poster-forward (visuals lead, text secondary); skeleton loaders match content shape, never blank screens or spinners-first; empty states have one clear message + single CTA.
- Discovery-first: sub-10-second path from open to relevant content; core actions are one tap; detail pages preserve list scroll on back.

## Cross-Story Dependencies

- 3.1b depends on 3.1a (public API + `featured` + trending). Both done — all remaining stories build on that API.
- 3.12 gates surfaces shipped by Epic 6 stories 6.1/6.2/6.3 (done, dormant). It must not remove or break that code, and ticketing tests must still pass with the flag on.
- Epic 3 depends on Epic 2A (components) and Epic 2B (Strapi backend); endpoint prefixes reflect the Epic 2C plugin decomposition (e.g. venues at `/venues/*`).
- Downstream: Epic 4 (auth), Epic 9 (admin), and Epic 10 (PWA) branch off Epic 3 on the v1 critical path. Remaining v1 work in this epic: 3.2 and 3.12.
