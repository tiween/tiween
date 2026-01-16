## ADDED Requirements

### Requirement: Movie Cache

The Events Manager admin SHALL maintain a Redis cache of movie metadata fetched from TMDB.

#### Scenario: Cache movie on selection

- **WHEN** user selects a TMDB movie for event creation
- **THEN** full metadata is stored in Redis cache indexed by TMDB ID
- **AND** cache includes title, poster, backdrop, synopsis, duration, genres, cast, crew

#### Scenario: Lookup cached movie

- **WHEN** system needs movie data for display
- **THEN** cache is checked first by TMDB ID
- **AND** cached data is returned if available

#### Scenario: Cache expiration

- **WHEN** cached movie data exceeds TTL (configurable, default 30 days)
- **THEN** data is refreshed from TMDB on next access
