# Epic 3: Event Discovery & Browsing [MVP]

Users can browse and search cinema showtimes across Tunisia without creating an account.

> **MVP Focus (revised 2026-08-06, sprint-change-proposal-2026-08-06):**
> Multi-category aggregation — story 3.2 (category filtering: theater,
> concerts, exhibitions) is back in v1 scope. New story 3.12 gates the
> purchase surfaces shipped by Epic 6 stories 6.1/6.2/6.3 behind a
> default-off feature flag: no route or visible control in the v1 client may
> initiate a purchase; flipping the flag restores them without code changes;
> existing ticketing tests keep passing. Geolocation (3.9) remains deferred.

> **Story 3.1 split (2026-07-05):** The original "Homepage with Curated Event
> Listings" was a full-stack vertical slice that exceeded a single unattended
> dev pass (timed out, then finished without a committable result). Per
> `sprint-change-proposal-2026-07-05.md` it is split along its data/presentation
> seam into **Story 3.1a — Public Events Browse API & Data Foundation** (backend,
> sprint key `3-1`) and **Story 3.1b — Homepage with Curated Event Listings**
> (frontend, sprint key `3-11`). 3.1b depends on 3.1a. The four scoping decisions
> resolved on 2026-07-04 (3.1 owns the public events browse API; `featured`
> boolean; trending = `sum(screening.ticketsSold)`; fix-and-wire the existing
> homepage) carry forward unchanged.

## Story 3.1a: Public Events Browse API & Data Foundation [MVP]

As a **frontend consumer of the events-manager plugin**,
I want a public REST API that lists cinema events with the fields, filters, and
popularity signal the discovery surfaces need,
So that every Epic-3 browsing surface (homepage, filters, search) has a real
data foundation to build on.

**Acceptance Criteria:**

**Given** the `events-manager` plugin is running
**When** a client requests the public content-api events endpoint
**Then** it returns published `event`s in the Strapi v5 response shape (`data`, `meta.pagination`)
**And** it supports date-range filtering (`startDateTime`), `eventStatus` filtering, sorting, and relation populate (`venue`, `screenings`, `screening.movie` → creative-work)
**And** the `event` content-type has an additive `featured` boolean (types regenerated, seed support added) so a featured/hero slice can be queried
**And** a custom `trending` service/endpoint returns upcoming events ranked by `sum(screening.ticketsSold)` desc
**And** cross-plugin access stays behind the plugin's public-api facade / plugin route prefixes
**And** the endpoints are exercised against seeded data (`yarn seed:fresh`) and return populated results

---

## Story 3.1b: Homepage with Curated Event Listings [MVP]

> **Depends on Story 3.1a** (public events browse API + `featured` + trending must exist).

As a **visitor**,
I want to see curated event listings on the homepage,
So that I can quickly discover what's happening culturally in Tunisia.

**Acceptance Criteria:**

**Given** I visit the Tiween homepage
**When** the page loads
**Then** I see a hero section with featured events
**And** I see a "Ce soir" section with today's events
**And** I see a "Cette semaine" section with upcoming events
**And** I see a "Tendances" section with popular events
**And** each section uses the EventCard component
**And** the page loads in under 3 seconds (NFR-P1)
**And** content is rendered via SSR for SEO
**And** structured data (JSON-LD) is included for events
**And** the existing `HomePageWithVenue`/`EventSection`/`FilmHero`/`EventCard` UI is fixed-and-wired to the real API (not rebuilt), with the frontend data layer aligned to the real plugin schema

---

## Story 3.2: Category Filtering [MVP]

> **Un-deferred 2026-08-06 (sprint-change-proposal-2026-08-06):** v1 widened
> to multi-category aggregation; this story is back in v1 scope.

As a **visitor**,
I want to filter events by category,
So that I can focus on the type of cultural content I'm interested in.

**Acceptance Criteria:**

**Given** I am on the events listing page
**When** I tap on a category tab (Cinéma, Théâtre, Courts-métrages, Musique, Expositions)
**Then** the event list filters to show only events of that category
**And** the URL updates to reflect the filter (e.g., `/events?category=cinema`)
**And** the active category tab is highlighted in yellow
**And** the filter persists during the session
**And** "Tout" shows all categories
**And** filtering happens without full page reload

---

## Story 3.3: Date Range Filtering [MVP]

As a **visitor**,
I want to filter events by date,
So that I can find events happening when I'm available.

**Acceptance Criteria:**

**Given** I am on the events listing page
**When** I select a date filter (Aujourd'hui, Demain, Ce weekend, or custom range)
**Then** the event list filters to show only events on those dates
**And** the URL updates to reflect the date filter
**And** the selected date option is highlighted
**And** custom date range opens a calendar picker
**And** events are sorted by showtime within the selected date
**And** filtering is instant (client-side when data is cached)

---

## Story 3.4: Region and City Filtering [MVP]

As a **visitor**,
I want to filter events by location,
So that I can find events near me or in a specific area.

**Acceptance Criteria:**

**Given** I am on the events listing page
**When** I open the location filter
**Then** I see a list of regions (Grand Tunis, Sfax, Sousse, etc.)
**And** I can select a specific city within a region
**And** selecting a location filters the event list
**And** the URL updates with the location filter
**And** a "near me" option uses geolocation (with permission)
**And** selected location is remembered for future visits

---

## Story 3.5: Venue Filtering [MVP]

As a **visitor**,
I want to filter events by venue,
So that I can see what's playing at a specific place.

**Acceptance Criteria:**

**Given** I am on the events listing page
**When** I select a venue from the filter
**Then** the event list shows only events at that venue
**And** I can search venues by name in the filter
**And** popular/nearby venues appear at the top
**And** venue filter can be combined with other filters
**And** clearing the venue filter shows all events again

---

## Story 3.6: Keyword Search with Algolia [MVP]

As a **visitor**,
I want to search for events by keyword,
So that I can find specific films, plays, or artists.

**Acceptance Criteria:**

**Given** I tap on the search icon or navigate to search
**When** I type a search query
**Then** I see instant search results as I type (300ms debounce)
**And** results include events, creative works, venues, and people
**And** search is powered by Algolia for fast, fuzzy matching
**And** recent searches are shown when the search field is focused
**And** "No results" state shows suggestions
**And** search results page shows full results with filters

---

## Story 3.7: Event Detail Page [MVP]

As a **visitor**,
I want to view complete details about an event,
So that I can decide if I want to attend.

**Acceptance Criteria:**

**Given** I tap on an EventCard
**When** the event detail page loads
**Then** I see the FilmHero component with poster/backdrop
**And** I see the synopsis/description
**And** I see cast and crew information (for films/plays)
**And** I see all available showtimes grouped by venue
**And** I see venue information with address
**And** I can tap on a showtime to begin ticket purchase
**And** the page has proper SEO meta tags
**And** the URL is shareable (e.g., `/events/film-name-slug`)

---

## Story 3.8: Venue Location on Map [MVP]

As a **visitor**,
I want to see the venue location on a map,
So that I can plan how to get there.

**Acceptance Criteria:**

**Given** I am on an event detail page or venue page
**When** I view the venue information
**Then** I see an interactive map showing the venue location
**And** the map uses Leaflet or Mapbox
**And** I can tap to open directions in Google Maps/Apple Maps
**And** the venue address is displayed
**And** nearby public transport is indicated (if available)

---

## Story 3.9: Geolocation "Near Me" Filtering [Phase 2]

> **Deferred:** Region filtering sufficient for MVP. Geolocation added in Phase 2.

As a **visitor**,
I want to find events near my current location,
So that I can easily attend without traveling far.

**Acceptance Criteria:**

**Given** I am on the events listing
**When** I tap "Près de moi" / "Near me"
**Then** the browser requests my location permission
**And** if granted, events are sorted by distance from my location
**And** each event card shows distance (e.g., "2.3 km")
**And** if denied, I see a message to enable location or choose a region
**And** location is cached for the session (not constantly requested)

---

## Story 3.10: Share Event Details [MVP]

As a **visitor**,
I want to share an event with friends,
So that we can plan to attend together.

**Acceptance Criteria:**

**Given** I am on an event detail page
**When** I tap the share button
**Then** the native share sheet opens (Web Share API)
**And** the shared link includes the event URL
**And** shared preview includes event image and title (Open Graph tags)
**And** if Web Share API is not available, copy-to-clipboard fallback is shown
**And** sharing to WhatsApp/Facebook/Twitter works correctly

---

## Story 3.12: Gate Ticketing Entry Points for V1 [MVP]

> **Added 2026-08-06 (sprint-change-proposal-2026-08-06):** v1 is an
> aggregation-only platform, but Epic 6 stories 6.1/6.2/6.3 already shipped
> live purchase surfaces (ticket type/price display, quantity selection,
> Konnect checkout). This story hides them behind a feature flag, default off,
> without removing or breaking the underlying code.

As a **platform operator**,
I want all ticket-purchase entry points hidden behind a default-off feature flag,
So that the v1 aggregation launch exposes no checkout while the shipped ticketing code stays intact for post-v1.

**Acceptance Criteria:**

**Given** the ticketing feature flag is off (default)
**When** a visitor browses any event, showtime, or venue page in the v1 client
**Then** no ticket prices, quantity selectors, purchase CTAs, or checkout routes are rendered or reachable
**And** direct navigation to checkout/purchase routes returns a not-found or redirect (no live payment flow)
**And** event and venue pages remain fully informational (dates, times, details, map, share)

**Given** the ticketing feature flag is turned on
**When** the same pages are loaded
**Then** the 6.1/6.2/6.3 purchase surfaces are restored without code changes

**And** existing ticketing unit/integration tests continue to pass with the flag on
**And** the flag state is configurable per environment (env var or Strapi config), not hardcoded

---
