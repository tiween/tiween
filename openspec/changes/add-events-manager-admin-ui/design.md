## Context

The Events Manager plugin needs a full admin UI for venue managers to schedule events and import showtimes. Movie metadata comes exclusively from TMDB (single source of truth). The UI must integrate with Strapi's Design System v2 (used in Strapi 5) and follow React 18 patterns (Strapi admin uses React 18, not React 19).

> **⚠️ IMPORTANT: Strapi Design System v2 is MANDATORY**
>
> All UI components MUST use `@strapi/design-system` v2 components. Do NOT use:
>
> - Custom CSS frameworks (Tailwind, Bootstrap, etc.)
> - Third-party UI libraries (Chakra, MUI, Radix, etc.)
> - Raw HTML elements for interactive components
>
> Use only: `Box`, `Flex`, `Grid`, `Typography`, `Button`, `TextInput`, `Select`, `Modal`, `Table`, `Tabs`, `Badge`, `IconButton`, `Card`, `Field`, `Checkbox`, `Radio`, `Switch`, `DatePicker`, `TimePicker`, `Popover`, `Tooltip`, and other components from `@strapi/design-system`.
>
> Reference: [Strapi Design System Storybook](https://design-system-git-main-strapijs.vercel.app/)

### Stakeholders

- **Venue Managers:** Primary users who schedule events
- **Content Editors:** Import and manage showtimes

### Constraints

- Strapi 5 plugin architecture (Design System v2)
- React 18 (Strapi admin context, not client React 19)
- TMDB API rate limits (40 requests per 10 seconds)
- TMDB API key required (environment variable)
- Redis required for movie cache

## Goals / Non-Goals

### Goals

- Provide visual planning view with weekly calendar grid
- Enable quick event creation with TMDB movie search
- Cache movie metadata in Redis when added to schedule
- Support bulk showtime import from Pathé.tn (showtimes only, not movie data)
- Integrate seamlessly with existing content types (Event, Showtime)

### Non-Goals

- Multi-venue simultaneous view (single venue selection only)
- Real-time sync with TMDB (manual search only)
- Multi-screen/room support per venue
- Ticket sales integration (handled by ticketing plugin)
- Scraping movie metadata from external sites (TMDB is single source of truth)

## Decisions

### Decision 1: Data Source Architecture

**Choice:** TMDB is the single source of truth for movie metadata

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TMDB API      │────▶│   Redis Cache   │────▶│  Events Manager │
│ (Movie Data)    │     │ (Movie Metadata)│     │  (Showtimes)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        ▲
┌─────────────────┐                                     │
│   Pathé.tn      │─────────────────────────────────────┘
│ (Showtimes Only)│   Fuzzy match to cached movies
└─────────────────┘
```

**Rationale:**

- TMDB provides consistent, high-quality movie metadata
- Redis cache reduces API calls and provides fast lookups
- Pathé.tn import only extracts showtimes, not movie data
- Fuzzy matching links scraped titles to TMDB movies

### Decision 2: TMDB Plugin Architecture

**Choice:** Separate `tmdb-integration` plugin exposing services

```
apps/strapi/src/plugins/tmdb-integration/
├── admin/
│   └── src/
│       └── index.tsx           # Plugin registration (no UI)
├── server/
│   └── src/
│       ├── config/
│       │   └── index.ts        # Default config
│       ├── services/
│       │   ├── tmdb-client.ts  # HTTP client with rate limiting
│       │   ├── movie.ts        # Movie search/details services
│       │   ├── image.ts        # Image URL builder
│       │   └── cache.ts        # Redis cache service
│       ├── controllers/
│       │   └── tmdb.ts         # Admin API endpoints
│       ├── routes/
│       │   └── index.ts        # Route definitions
│       └── index.ts            # Plugin entry
└── package.json
```

**Rationale:** Separate plugin allows reuse by other plugins. Services are the primary interface; controllers expose admin-only endpoints.

### Decision 3: Movie Cache Architecture

**Choice:** Redis-based cache with TMDB ID indexing

**Data structure:**

```
movie:{tmdbId} -> {
  tmdbId: number,
  title: string,
  originalTitle: string,
  overview: string,
  runtime: number,
  releaseDate: string,
  posterPath: string,
  backdropPath: string,
  genres: Genre[],
  cast: CastMember[],
  crew: CrewMember[],
  voteAverage: number,
  cachedAt: timestamp
}

movie:titles:{normalizedTitle} -> tmdbId  // For fuzzy lookup
```

**Cache behavior:**

- Movies cached when selected for event creation
- TTL: 30 days (configurable)
- Title index for fuzzy matching during import

**Rationale:** Redis provides fast lookups, persistence, and TTL management. Title index enables efficient fuzzy matching.

### Decision 4: Events Manager Component Architecture

**Choice:** Feature-based folder structure with shared components

```
events-manager/admin/src/
├── components/
│   ├── MovieCard/           # Reusable content selection card
│   ├── CalendarGrid/        # Weekly planning grid
│   ├── EventForm/           # Event creation/edit form
│   ├── ContentSearchPanel/  # Dynamic search with type dropdown
│   ├── ImportPreview/       # Showtime import preview table
│   └── ConfirmDialog/       # Reusable confirmation modal
├── pages/
│   ├── Planning/            # Main planning view
│   ├── Import/              # Import management
│   └── HomePage.tsx         # Landing/dashboard
├── hooks/
│   ├── useEvents.ts         # Event CRUD operations
│   ├── useShowtimes.ts      # Showtime operations
│   ├── useTMDB.ts           # TMDB search hooks (movies)
│   ├── useCreativeWorks.ts  # Creative works search (shorts, plays)
│   ├── useMovieCache.ts     # Redis cache hooks
│   └── useFavorites.ts      # Movie favorites
└── api/
    └── events-manager.ts    # API client functions
```

**Rationale:** Matches Strapi plugin conventions and keeps components testable.

### Decision 5: State Management

**Choice:** React Query for server state, local useState for UI state

**Rationale:** Strapi admin already includes react-query. No need for Redux or other state management libraries for this scope.

### Decision 6: Pathé.tn Scraper Implementation

**Choice:** Server-side scraping with cheerio + fuzzy matching

**Implementation:**

```
server/src/services/
├── scraper/
│   ├── pathe-scraper.ts     # Main scraper logic
│   ├── parsers.ts           # HTML parsing utilities
│   └── types.ts             # Scraped data types
├── matcher/
│   ├── fuzzy-matcher.ts     # Fuzzy title matching
│   └── title-normalizer.ts  # Title normalization
```

**Matching algorithm:**

1. Normalize scraped title (lowercase, remove special chars)
2. Search Redis title index for exact/close matches
3. If no cache hit, search TMDB by title
4. Return best match with confidence score
5. Flag low-confidence matches for manual review

**Rationale:** cheerio is lightweight, server-side avoids CORS. Fuzzy matching bridges gap between site titles and TMDB data.

### Decision 7: Calendar Grid Component

**Choice:** FullCalendar library with React bindings

**Package:** `@fullcalendar/react`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`

**Configuration:**

- View: `timeGridWeek` for weekly planning view
- Slot duration: 30 minutes or 1 hour (configurable)
- Event click: Opens edit modal
- Date click: Opens creation modal with pre-filled time
- Event drag/resize: Optional enhancement for rescheduling

**Styling:**

- Custom CSS to match Strapi Design System colors
- Event background colors from poster vibrant extraction
- Event content template for title, time, format badge

**Rationale:** FullCalendar provides robust calendar functionality out of the box including drag-and-drop, responsive layout, and timezone handling. The MIT-licensed open source version covers our needs.

### Decision 8: TMDB ID Storage

**Choice:** Store TMDB ID on Event for reference to cached movie

**Implementation:** Add `tmdbId` field to event schema (integer, optional)

**Rationale:** Events reference movies by TMDB ID, cache provides full metadata. No need to duplicate data in database.

## Data Flow

### Event Creation Flow

```
1. User clicks calendar slot or "Add Event"
2. Content search panel opens with type dropdown
3. User selects content type:
   - Movies (Full-length) → search TMDB
   - Shorts → search creative-works (type=short-film)
   - Plays → search creative-works (type=play)
4. User searches by title
5. User selects content:
   - TMDB movie → Full metadata fetched, cached in Redis
   - Creative work → Existing data used directly
6. Configure showtime (format, language, price, time)
7. Review and confirm
8. Event created with tmdbId (movies) or creativeWorkId reference
```

### Showtime Import Flow (Pathé.tn)

```
1. User clicks "Add Bulk" on Import page
2. Server scrapes Pathé.tn schedule
3. For each scraped showtime:
   a. Normalize movie title
   b. Search Redis cache by fuzzy title match
   c. If no hit, search TMDB and cache result
   d. Link showtime to matched TMDB ID
4. Preview table shows matches with confidence scores
5. User reviews/corrects low-confidence matches
6. User confirms import
7. Events and Showtimes created with tmdbId references
```

### Planning View Data

```
1. User selects venue + date range
2. Fetch events for venue within date range
3. For each event, lookup movie data from Redis cache
4. Populate showtimes into calendar grid
5. Click on time slot → opens event creation wizard
6. Click on existing event → opens edit form
```

## Risks / Trade-offs

### Risk: TMDB API Rate Limits

**Impact:** Blocked requests if rate limit exceeded
**Mitigation:**

- Implement token bucket rate limiter
- Queue requests when approaching limit
- Cache aggressively to reduce API calls

### Risk: Redis Unavailability

**Impact:** Movie data unavailable, import matching fails
**Mitigation:**

- Graceful degradation: fall back to TMDB API
- Health checks and alerts for Redis connection
- Consider in-memory fallback cache

### Risk: Fuzzy Matching Accuracy

**Impact:** Incorrect movie matches during import
**Mitigation:**

- Show confidence scores in preview
- Require manual confirmation for low-confidence matches
- Allow user to search and correct any match

### Risk: Pathé.tn Website Changes

**Impact:** Scraper breaks if HTML structure changes
**Mitigation:**

- Wrap scraper in try-catch with graceful degradation
- Add admin notification if scraping fails
- Design parser to be resilient (multiple selectors)

### Trade-off: Redis vs Database Cache

**Choice:** Redis
**Trade-off:** Requires additional infrastructure, but provides faster lookups, built-in TTL, and better suited for cache patterns.

### Trade-off: Custom Calendar vs Library

**Choice:** Custom implementation
**Trade-off:** More initial work, but smaller bundle and full control over styling to match wireframes.

## Migration Plan

Not applicable - new feature, no data migration required.

## API Endpoints (New)

### TMDB Integration Plugin

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| GET    | `/tmdb/search`      | Search movies by title |
| GET    | `/tmdb/movie/:id`   | Get movie details      |
| GET    | `/tmdb/now-playing` | Get now playing movies |
| GET    | `/tmdb/upcoming`    | Get upcoming movies    |

### Events Manager Plugin

| Method | Endpoint                                   | Description                           |
| ------ | ------------------------------------------ | ------------------------------------- |
| GET    | `/events-manager/venues/:venueId/planning` | Get events for planning view          |
| GET    | `/events-manager/movies/cache/:tmdbId`     | Get cached movie data                 |
| POST   | `/events-manager/movies/cache`             | Cache movie data                      |
| POST   | `/events-manager/import/pathe`             | Scrape and preview Pathé.tn showtimes |
| POST   | `/events-manager/import/confirm`           | Confirm showtime import               |
| GET    | `/events-manager/favorites`                | Get admin user's favorite movies      |
| POST   | `/events-manager/favorites/:tmdbId`        | Toggle favorite status                |

## Environment Variables

| Variable                | Required | Description                                             |
| ----------------------- | -------- | ------------------------------------------------------- |
| `TMDB_API_KEY`          | Yes      | TMDB API v3 key (get from themoviedb.org)               |
| `TMDB_CACHE_TTL`        | No       | Search cache TTL in seconds (default: 900)              |
| `TMDB_DEFAULT_LANGUAGE` | No       | Default language for requests (default: fr)             |
| `TMDB_DEFAULT_REGION`   | No       | Default region for requests (default: MA)               |
| `REDIS_URL`             | Yes      | Redis connection URL for movie cache                    |
| `MOVIE_CACHE_TTL`       | No       | Movie cache TTL in seconds (default: 2592000 = 30 days) |

## Open Questions

- [ ] Do we need user permission controls (e.g., only venue managers can access)?
- [ ] Should we support multiple import sources simultaneously (Pathé.tn, others)?
- [ ] What fuzzy matching threshold should require manual confirmation?
