# Tasks: Events Manager Admin UI

## 1. TMDB Integration Plugin (New Plugin)

- [ ] 1.1 Scaffold `tmdb-integration` plugin structure
- [ ] 1.2 Add plugin configuration with TMDB_API_KEY env variable
- [ ] 1.3 Create TMDB HTTP client with rate limiting (40 req/10s)
- [ ] 1.4 Create movie search service (`/search/movie`)
- [ ] 1.5 Create movie details service (`/movie/{id}` with credits)
- [ ] 1.6 Create now playing service (`/movie/now_playing`)
- [ ] 1.7 Create upcoming movies service (`/movie/upcoming`)
- [ ] 1.8 Create image URL builder utility
- [ ] 1.9 Add admin API routes for TMDB endpoints
- [ ] 1.10 Write unit tests for TMDB services

## 2. Movie Cache (Redis)

- [ ] 2.1 Add Redis client configuration to events-manager plugin
- [ ] 2.2 Create movie cache service with TMDB ID indexing
- [ ] 2.3 Create title index for fuzzy matching
- [ ] 2.4 Implement cache-on-select: store full metadata when movie selected
- [ ] 2.5 Add configurable TTL (default 30 days)
- [ ] 2.6 Create cache lookup endpoints (by TMDB ID, by title)
- [ ] 2.7 Write unit tests for cache service

## 3. Foundation & Routing (Events Manager Admin)

- [ ] 3.1 Set up admin page routing (Planning, Import pages)
- [ ] 3.2 Add navigation links in plugin menu
- [ ] 3.3 Create API client helper (`admin/src/api/events-manager.ts`)
- [ ] 3.4 Add translation keys for new screens (en, fr, ar)

## 4. Shared Components

- [ ] 4.1 Create MovieCard component with states (default, hover, pressed, active)
- [ ] 4.2 Add star icon to MovieCard for favorite toggle
- [ ] 4.3 Create MovieCard Storybook stories for visual testing
- [ ] 4.4 Create ConfirmDialog component for delete confirmations
- [ ] 4.5 Create DateRangeSelector component for week navigation

## 5. Planning View & Calendar (FullCalendar)

- [ ] 5.1 Install FullCalendar packages (@fullcalendar/react, @fullcalendar/timegrid, @fullcalendar/interaction)
- [ ] 5.2 Create PlanningCalendar component wrapping FullCalendar
- [ ] 5.3 Configure timeGridWeek view with appropriate slot duration
- [ ] 5.4 Add venue selector dropdown (required before calendar interaction)
- [ ] 5.5 Disable/hide calendar until venue is selected with prompt message
- [ ] 5.6 Style FullCalendar to match Strapi Design System (custom CSS)
- [ ] 5.7 Implement past time slot disabling via selectConstraint/validRange
- [ ] 5.8 Create custom eventContent renderer for EventBlock
- [ ] 5.9 Calculate event duration from content (runtime for TMDB, duration for creative works)
- [ ] 5.10 Extract vibrant color from poster image for event backgroundColor
- [ ] 5.11 Adjust text color for contrast against background
- [ ] 5.12 Display title, time, and format badge in eventContent
- [ ] 5.13 Add recurring showtime indicator icon in eventContent
- [ ] 5.14 Handle dateClick → open event creation modal (venue + time pre-filled)
- [ ] 5.15 Handle eventClick → open event edit modal
- [ ] 5.16 Optional: Enable eventDrop/eventResize for drag-and-drop rescheduling
- [ ] 5.17 Add GET `/events-manager/venues/:venueId/planning` API endpoint
- [ ] 5.18 Connect Planning page to API with react-query
- [ ] 5.19 Transform API data to FullCalendar event format

## 6. Content Search Panel

- [ ] 6.1 Create ContentSearchPanel component with search input and content type dropdown
- [ ] 6.2 Add content type dropdown: Movies (Full-length), Shorts, Plays
- [ ] 6.3 Implement dynamic search: TMDB for movies, creative-works API for shorts/plays
- [ ] 6.4 Display search results as MovieCard grid
- [ ] 6.5 Implement search debouncing (300ms)
- [ ] 6.6 Show cached movies from Redis alongside TMDB results (for movie type)
- [ ] 6.7 Implement movie selection with cache-on-select behavior (TMDB only)
- [ ] 6.8 Create useTMDB hook for search/details
- [ ] 6.9 Create useCreativeWorks hook for shorts/plays search

## 7. Favorites Feature

- [ ] 7.1 Create admin-favorites storage (Redis or user metadata)
- [ ] 7.2 Add POST `/events-manager/favorites/:tmdbId` endpoint (toggle)
- [ ] 7.3 Add GET `/events-manager/favorites` endpoint (list user favorites)
- [ ] 7.4 Implement useFavorites hook in admin
- [ ] 7.5 Add Favorites filter toggle to movie selection panel

## 8. Event Creation Modal

- [ ] 8.1 Create EventCreationModal component using Strapi Modal
- [ ] 8.2 Implement two-column layout: search panel (left) + config form (right)
- [ ] 8.3 Pre-fill venue (locked) and date/time from clicked calendar slot
- [ ] 8.4 Add optional event group dropdown selector
- [ ] 8.5 Add showtime configuration fields (format, language, subtitles, price)
- [ ] 8.6 Implement form validation with zod
- [ ] 8.7 Add event creation API integration (with eventGroup if selected)
- [ ] 8.8 Close modal and refresh calendar on success

## 9. Recurring Showtime Creation

- [ ] 9.1 Add rrule library dependency
- [ ] 9.2 Create RecurrenceConfig component with repeat toggle
- [ ] 9.3 Implement frequency selector (Daily, Weekly, Custom)
- [ ] 9.4 Add day-of-week selector for Weekly frequency
- [ ] 9.5 Implement end condition: by date or by occurrence count
- [ ] 9.6 Create recurrence preview showing generated dates
- [ ] 9.7 Generate showtime dates from RRule on create
- [ ] 9.8 Bulk create showtimes for recurring events

## 10. Event Edit & Delete

- [ ] 10.1 Create EventEditModal component
- [ ] 10.2 Pre-populate form with existing event data
- [ ] 10.3 Add event edit API integration
- [ ] 10.4 Implement delete confirmation dialog with options for recurring
- [ ] 10.5 For recurring: show "Delete this occurrence" vs "Delete all occurrences"
- [ ] 10.6 Implement delete single occurrence (by showtime ID)
- [ ] 10.7 Implement delete all occurrences (by parentShowtimeId lookup)

## 11. Import Feature (Events Table)

- [ ] 11.1 Create Import page with events table view
- [ ] 11.2 Add status filter (Published, Draft, All)
- [ ] 11.3 Implement table pagination
- [ ] 11.4 Create "Add Bulk" button opening showtime import flow

## 12. Pathé.tn Showtime Scraper

- [ ] 12.1 Add cheerio dependency to events-manager plugin
- [ ] 12.2 Create `server/src/services/scraper/pathe-scraper.ts`
- [ ] 12.3 Implement showtime parser (movie title, date, time, venue info)
- [ ] 12.4 Add POST `/events-manager/import/pathe` endpoint

## 13. Fuzzy Movie Matching

- [ ] 13.1 Create title normalizer (lowercase, remove special chars, accents)
- [ ] 13.2 Implement fuzzy matching against Redis title index
- [ ] 13.3 Fallback to TMDB search if no cache hit
- [ ] 13.4 Calculate and return confidence scores
- [ ] 13.5 Flag low-confidence matches for manual review

## 14. Import Preview & Confirmation

- [ ] 14.1 Create ImportPreview component showing scraped showtimes table
- [ ] 14.2 Display matched movie with confidence indicator
- [ ] 14.3 Add manual movie search for unmatched/low-confidence items
- [ ] 14.4 Create POST `/events-manager/import/confirm` endpoint
- [ ] 14.5 Implement bulk Event + Showtime creation on confirm
- [ ] 14.6 Add error handling and rollback for partial failures

## 15. Schema Updates

- [ ] 15.1 Add `tmdbId` field to event schema (integer, optional)
- [ ] 15.2 Add `parentShowtimeId` field to showtime schema (relation to self, optional)
- [ ] 15.3 Add migration if needed for existing data

## 16. Testing

- [ ] 16.1 Write unit tests for TMDB client and services
- [ ] 16.2 Write unit tests for fuzzy matcher
- [ ] 16.3 Write component tests for MovieCard, CalendarGrid
- [ ] 16.4 Write integration test for event creation flow
- [ ] 16.5 Write integration test for recurring showtime creation
- [ ] 16.6 Write integration test for showtime import flow

## 17. Polish & Documentation

- [ ] 17.1 Review accessibility (keyboard navigation, ARIA labels)
- [ ] 17.2 Add loading states and error boundaries
- [ ] 17.3 Update plugin documentation
- [ ] 17.4 Document TMDB API key and Redis setup in README
