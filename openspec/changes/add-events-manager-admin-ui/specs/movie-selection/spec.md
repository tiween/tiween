## ADDED Requirements

### Requirement: Movie Selection Card

The Events Manager admin SHALL display movies as selectable cards showing poster, title, duration, and release year with visual feedback for interaction states and a star icon for favoriting.

#### Scenario: Display movie card

- **WHEN** movie card is rendered
- **THEN** it shows poster image, title, duration, and metadata label
- **AND** card has default border styling
- **AND** star icon is displayed in the top-right corner

#### Scenario: Hover state

- **WHEN** user hovers over a movie card
- **THEN** card border changes to indicate hover
- **AND** card background may subtly highlight

#### Scenario: Select movie card

- **WHEN** user clicks a movie card body (not the star icon)
- **THEN** card shows active state with prominent border
- **AND** card displays a checkmark or selection indicator
- **AND** movie is selected for event creation

#### Scenario: Favorite movie

- **WHEN** user clicks the star icon on a movie card
- **THEN** star icon toggles to filled/active state
- **AND** movie is marked as favorite for the current user
- **AND** favorite status is persisted

#### Scenario: Unfavorite movie

- **WHEN** user clicks a filled star icon on a favorited movie
- **THEN** star icon toggles to outline/inactive state
- **AND** movie is removed from user's favorites

---

### Requirement: Movie List Favorites Filter

The Events Manager admin SHALL provide a filter to show only favorited movies in the movie selection panel for quick access.

#### Scenario: Filter by favorites

- **WHEN** user activates the "Favorites" filter in the movie list
- **THEN** list updates to show only movies marked as favorites
- **AND** favorite filter toggle shows active state

#### Scenario: Clear favorites filter

- **WHEN** user deactivates the "Favorites" filter
- **THEN** list returns to showing all available movies

#### Scenario: Empty favorites state

- **WHEN** user activates favorites filter with no favorited movies
- **THEN** list displays empty state message
- **AND** message suggests favoriting movies using the star icon

---

### Requirement: Content Type Search

The Events Manager admin SHALL provide a dynamic search panel with content type dropdown to search different data sources based on the selected type.

#### Scenario: Display content type selector

- **WHEN** user opens the search panel
- **THEN** a dropdown is shown with options: Movies (Full-length), Shorts, Plays
- **AND** default selection is Movies (Full-length)

#### Scenario: Search movies (Full-length)

- **WHEN** user selects "Movies (Full-length)" from dropdown
- **AND** user enters search query
- **THEN** system queries TMDB via tmdb-integration plugin
- **AND** search results are displayed as movie cards
- **AND** results include poster, title, release year, and overview

#### Scenario: Search shorts

- **WHEN** user selects "Shorts" from dropdown
- **AND** user enters search query
- **THEN** system queries creative-works API filtered by type=short-film
- **AND** search results are displayed as movie cards

#### Scenario: Search plays

- **WHEN** user selects "Plays" from dropdown
- **AND** user enters search query
- **THEN** system queries creative-works API filtered by type=play
- **AND** search results are displayed as movie cards

#### Scenario: Select movie from TMDB

- **WHEN** user selects a movie from TMDB search results
- **THEN** full movie metadata is fetched from TMDB
- **AND** movie data is cached in Redis for future use
- **AND** user proceeds to showtime configuration

#### Scenario: Select creative work

- **WHEN** user selects a short or play from creative-works results
- **THEN** existing creative work data is used
- **AND** user proceeds to showtime configuration

#### Scenario: Movie already cached

- **WHEN** user searches for a movie already in cache
- **THEN** cached data is displayed immediately
- **AND** no additional TMDB API call is made
