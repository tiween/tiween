# Change: Events Manager Admin UI

## Why

The Events Manager plugin currently has only a placeholder homepage. Venue managers need a visual scheduling interface to plan events, manage showtimes, and import schedules from external sources. The wireframes show a complete event planning workflow that significantly improves the content management experience.

## What Changes

### New Plugin: `tmdb-integration`

- **TMDB API Client:** Server-side service to query TMDB API (single source of truth for movie metadata)
- **Movie Search:** Search movies by title with localized results (fr, ar, en)
- **Movie Details:** Fetch full metadata (title, poster, backdrop, synopsis, duration, release date, genres, cast, crew, ratings)
- **Image URL Builder:** Construct TMDB image URLs at various sizes
- **Rate Limiting:** Respect TMDB API rate limits with request queuing
- **Caching:** Cache API responses to reduce redundant requests

### Movie Cache (Redis)

- **Persistent Cache:** Store full movie metadata when added to schedule
- **TMDB ID Indexed:** Fast lookup by TMDB ID for deduplication
- **Reduce API Calls:** Serve cached data for frequently accessed movies

### Events Manager Admin UI

- **New Planning View:** Weekly calendar grid showing events by time slot for a selected venue with date range navigation
- **Movie Selection Card:** Selectable card component showing movie poster, title, duration, and metadata with hover/active states and star icon for favoriting
- **Movie Search Panel:** Search TMDB for movies, results cached when selected
- **Event Edit Form:** Multi-step form for creating/editing events with movie selection, showtime configuration (format, language, subtitles, price), and date/time inputs
- **Add Event Wizard:** Step-by-step flow: Search TMDB → Select movie → Configure showtimes → Review & confirm
- **Import Screen:** Table view of published/draft events with pagination, filtering by status
- **Bulk Showtime Import:** Import showtimes from Pathé.tn (movie matching via fuzzy title search to cached movies or TMDB)
- **Delete Confirmation:** Modal dialog for confirming event/showtime deletions

## Impact

- Affected specs (6 new capabilities):
  - `calendar-planning` - Weekly calendar view and event block display
  - `movie-selection` - Movie cards, favorites, and content type search
  - `event-creation` - Event/showtime creation wizard and recurring showtimes
  - `showtime-import` - Bulk import from external sources
  - `movie-cache` - Redis caching for TMDB movie metadata
  - `tmdb-integration` - TMDB API client and services
- Affected code:
  - `apps/strapi/src/plugins/tmdb-integration/` - New plugin (entire directory)
  - `apps/strapi/src/plugins/events-manager/admin/src/` - All admin UI files
  - `apps/strapi/src/plugins/events-manager/server/src/services/` - Scraper and import services
  - `apps/strapi/src/plugins/events-manager/server/src/routes/` - New API endpoints

## Dependencies

- `creative-works` plugin for storing imported movie data
- `tmdb-integration` plugin for TMDB API access (new)
- Redis for movie metadata cache
- External: TMDB API (requires API key), Pathé.tn website for showtime scraping

## Constraints

- **MANDATORY:** All UI components MUST use `@strapi/design-system` v2 exclusively. No Tailwind, Bootstrap, Chakra, MUI, or other UI libraries allowed.
- **TMDB is single source of truth** for movie metadata - never scrape movie data from other sites
