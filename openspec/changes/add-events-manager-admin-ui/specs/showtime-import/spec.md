## ADDED Requirements

### Requirement: Import Events Table

The Events Manager admin SHALL display a table of events with status filtering and pagination for managing imported and manually created events.

#### Scenario: View events table

- **WHEN** user navigates to Import page
- **THEN** table displays events with columns for title, venue, date, status
- **AND** pagination controls are shown

#### Scenario: Filter by status

- **WHEN** user selects "Published" or "Draft" filter
- **THEN** table updates to show only events matching that status

#### Scenario: Paginate results

- **WHEN** user clicks page navigation
- **THEN** table shows next/previous page of results

---

### Requirement: Bulk Showtime Import from Pathe

The Events Manager admin SHALL provide functionality to import showtimes from Pathe.tn website, matching movies via fuzzy title search.

#### Scenario: Trigger showtime import

- **WHEN** user clicks "Add Bulk" button on Import page
- **THEN** system scrapes Pathe.tn schedule page
- **AND** loading indicator is displayed

#### Scenario: Preview scraped showtimes

- **WHEN** scraping completes successfully
- **THEN** preview table shows showtimes with movie title, date, time, venue
- **AND** each showtime shows matched movie from cache (if found)
- **AND** unmatched movies are flagged for manual resolution

#### Scenario: Fuzzy match movie titles

- **WHEN** scraped movie title is processed
- **THEN** system searches cached movies by fuzzy title match
- **AND** if no cache match, searches TMDB by title
- **AND** best match is suggested with confidence indicator

#### Scenario: Manual movie matching

- **WHEN** automatic matching fails or user wants to change match
- **THEN** user can search TMDB manually for correct movie
- **AND** selected movie is cached and linked to showtime

#### Scenario: Confirm showtime import

- **WHEN** user confirms import with all movies matched
- **THEN** system creates Event entries for each unique movie-venue pair
- **AND** system creates Showtime entries with scraped times
- **AND** success message shows import count

#### Scenario: Handle scraper errors

- **WHEN** scraping fails due to network or parsing error
- **THEN** error message is displayed to user
- **AND** user can retry the import
