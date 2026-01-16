## ADDED Requirements

### Requirement: TMDB API Configuration

The tmdb-integration plugin SHALL require a TMDB API key configured via environment variable for authentication with the TMDB API.

#### Scenario: Valid API key configured

- **WHEN** plugin initializes with valid `TMDB_API_KEY` environment variable
- **THEN** plugin registers successfully
- **AND** TMDB services are available to other plugins

#### Scenario: Missing API key

- **WHEN** plugin initializes without `TMDB_API_KEY` environment variable
- **THEN** plugin logs a warning message
- **AND** TMDB services return appropriate error when called

---

### Requirement: Movie Search Service

The tmdb-integration plugin SHALL provide a service to search movies by title with support for localized results.

#### Scenario: Search movies by title

- **WHEN** service receives a search query with title and locale
- **THEN** service queries TMDB `/search/movie` endpoint
- **AND** returns array of movie results with id, title, originalTitle, posterPath, releaseDate, overview

#### Scenario: Search with pagination

- **WHEN** service receives search query with page parameter
- **THEN** service includes page in TMDB request
- **AND** returns paginated results with totalPages and totalResults

#### Scenario: Search with locale

- **WHEN** service receives search query with locale (fr, ar, en)
- **THEN** service passes locale as `language` parameter to TMDB
- **AND** returns localized titles and overviews where available

#### Scenario: Empty search results

- **WHEN** search query returns no matches from TMDB
- **THEN** service returns empty array
- **AND** totalResults is 0

---

### Requirement: Movie Details Service

The tmdb-integration plugin SHALL provide a service to fetch complete movie details including cast, crew, and media.

#### Scenario: Fetch movie details

- **WHEN** service receives a TMDB movie ID
- **THEN** service queries TMDB `/movie/{id}` endpoint with append_to_response
- **AND** returns full movie object with title, originalTitle, overview, runtime, releaseDate, genres, voteAverage, posterPath, backdropPath

#### Scenario: Fetch movie credits

- **WHEN** service fetches movie details
- **THEN** response includes cast array with name, character, profilePath, order
- **AND** response includes crew array with name, job, department, profilePath

#### Scenario: Fetch movie with locale

- **WHEN** service fetches movie details with locale parameter
- **THEN** localized title and overview are returned
- **AND** original title is preserved in originalTitle field

#### Scenario: Movie not found

- **WHEN** service receives invalid TMDB movie ID
- **THEN** service throws NotFoundError
- **AND** error includes descriptive message

---

### Requirement: Now Playing Movies Service

The tmdb-integration plugin SHALL provide a service to fetch currently playing movies in theaters for a specific region.

#### Scenario: Fetch now playing movies

- **WHEN** service is called with region parameter
- **THEN** service queries TMDB `/movie/now_playing` endpoint
- **AND** returns array of movies currently in theaters

#### Scenario: Fetch now playing with locale

- **WHEN** service is called with region (MA) and locale (fr)
- **THEN** results are filtered by Moroccan release
- **AND** titles and overviews are in French where available

---

### Requirement: Upcoming Movies Service

The tmdb-integration plugin SHALL provide a service to fetch upcoming movie releases for a specific region.

#### Scenario: Fetch upcoming movies

- **WHEN** service is called with region parameter
- **THEN** service queries TMDB `/movie/upcoming` endpoint
- **AND** returns array of movies with future release dates

---

### Requirement: TMDB Image URL Builder

The tmdb-integration plugin SHALL provide a utility to construct full image URLs from TMDB image paths.

#### Scenario: Build poster URL

- **WHEN** utility receives posterPath and size (w92, w154, w185, w342, w500, w780, original)
- **THEN** utility returns full TMDB image URL
- **AND** URL follows format `https://image.tmdb.org/t/p/{size}{path}`

#### Scenario: Build backdrop URL

- **WHEN** utility receives backdropPath and size (w300, w780, w1280, original)
- **THEN** utility returns full TMDB image URL

#### Scenario: Handle null image path

- **WHEN** utility receives null or undefined path
- **THEN** utility returns null
- **AND** does not throw error

---

### Requirement: API Rate Limiting

The tmdb-integration plugin SHALL implement rate limiting to respect TMDB API limits.

#### Scenario: Rate limit not exceeded

- **WHEN** requests are within TMDB rate limits
- **THEN** requests proceed normally
- **AND** no delay is introduced

#### Scenario: Rate limit approaching

- **WHEN** request rate approaches TMDB limit (40 requests per 10 seconds)
- **THEN** service queues subsequent requests
- **AND** requests are processed after rate limit window resets

---

### Requirement: Response Caching

The tmdb-integration plugin SHALL cache TMDB API responses to reduce redundant requests.

#### Scenario: Cache movie details

- **WHEN** movie details are fetched
- **THEN** response is cached with configurable TTL (default 1 hour)
- **AND** subsequent requests for same movie return cached data

#### Scenario: Cache search results

- **WHEN** search is performed
- **THEN** results are cached with shorter TTL (default 15 minutes)
- **AND** identical searches return cached results

#### Scenario: Cache invalidation

- **WHEN** cache TTL expires
- **THEN** next request fetches fresh data from TMDB
- **AND** new response is cached
