# Epic 3: Event Discovery & Browsing

Users can browse, filter, and search all cultural events across Tunisia without creating an account.

## Story 3.1: Homepage with Curated Event Listings

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

---

## Story 3.2: Category Filtering

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

## Story 3.3: Date Range Filtering

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

## Story 3.4: Region and City Filtering

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

## Story 3.5: Venue Filtering

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

## Story 3.6: Keyword Search with Algolia

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

## Story 3.7: Event Detail Page

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

## Story 3.8: Venue Location on Map

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

## Story 3.9: Geolocation "Near Me" Filtering

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

## Story 3.10: Share Event Details

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
