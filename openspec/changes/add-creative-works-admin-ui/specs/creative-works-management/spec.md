## ADDED Requirements

### Requirement: Creative Works List Page

The system SHALL provide a creative works list page within the creative-works plugin for viewing and managing the content catalog.

#### Scenario: Display creative works in card grid

- **GIVEN** a user navigates to the Catalog tab in creative-works plugin
- **WHEN** the page loads
- **THEN** creative works are displayed as cards with poster, title, year, and type icon
- **AND** cards are arranged in a responsive grid
- **AND** pagination is available with 20 items per page

#### Scenario: Search creative works by title

- **GIVEN** a creative works list is displayed
- **WHEN** user types "Matrix" in the search field
- **THEN** the list filters to show only works containing "Matrix" in title or originalTitle
- **AND** the filter is applied after a 300ms debounce

#### Scenario: Filter creative works by type

- **GIVEN** a creative works list is displayed
- **WHEN** user selects "Film" from the type filter dropdown
- **THEN** only creative works with type "film" are displayed
- **AND** the filter can be cleared to show all types

#### Scenario: Filter creative works by genre

- **GIVEN** a creative works list is displayed
- **WHEN** user selects "Action" from the genre filter dropdown
- **THEN** only creative works with the "Action" genre are displayed

#### Scenario: Add new creative work options

- **GIVEN** a user is on the creative works list
- **WHEN** user clicks the "Add New" button
- **THEN** a dropdown appears with options: "Manual Entry", "Import from TMDB"
- **AND** selecting "Manual Entry" opens the create form
- **AND** selecting "Import from TMDB" opens the TMDB search modal

---

### Requirement: TMDB Import Workflow

The system SHALL allow importing creative works from The Movie Database (TMDB).

#### Scenario: Search TMDB for movies

- **GIVEN** user opens the TMDB import modal
- **WHEN** user types "Inception" and presses search
- **THEN** matching movies from TMDB are displayed with poster, title, year, and overview
- **AND** each result has an "Import" button

#### Scenario: Preview TMDB import data

- **GIVEN** TMDB search results are displayed
- **WHEN** user clicks "Import" on a movie
- **THEN** a preview panel shows the data that will be imported
- **AND** displays title, original title, year, duration, synopsis, genres, directors, cast
- **AND** checkboxes allow toggling: "Import poster", "Import backdrop", "Create missing persons"

#### Scenario: Execute TMDB import

- **GIVEN** the TMDB import preview is displayed
- **WHEN** user clicks "Import" to confirm
- **THEN** a creative work is created with mapped TMDB data
- **AND** poster and backdrop images are downloaded and uploaded to Strapi
- **AND** persons (directors, cast) are created if they don't exist
- **AND** the new creative work is opened in edit mode
- **AND** a success notification is displayed

#### Scenario: Prevent duplicate TMDB imports

- **GIVEN** a creative work with tmdbId 27205 already exists
- **WHEN** user attempts to import the same TMDB movie
- **THEN** a warning displays "This movie is already in your catalog"
- **AND** a link to view the existing creative work is provided
- **AND** user can choose to "Import Anyway" or cancel

---

### Requirement: Creative Work Create/Edit Form

The system SHALL provide a form for creating and editing creative works.

#### Scenario: Open create form

- **GIVEN** user clicks "Manual Entry" from the add dropdown
- **WHEN** the form opens
- **THEN** all fields are empty except type (defaulted based on plugin context)
- **AND** required fields (title, type) are marked

#### Scenario: Edit existing creative work

- **GIVEN** a creative work card is clicked
- **WHEN** the edit form opens
- **THEN** all fields are populated with existing data
- **AND** cast and crew lists show linked persons
- **AND** genres show as selected tags

#### Scenario: Save creative work

- **GIVEN** the creative work form is open with valid data
- **WHEN** user clicks "Save"
- **THEN** the creative work is created or updated
- **AND** all relations (genres, directors, cast, crew) are saved
- **AND** the form closes and the list refreshes

#### Scenario: Validate required fields

- **GIVEN** the creative work form is open
- **WHEN** user attempts to save without title or type
- **THEN** validation errors are displayed
- **AND** the form is not submitted

---

### Requirement: Cast Management

The system SHALL provide an interface for managing cast members on a creative work.

#### Scenario: View cast list

- **GIVEN** the creative work edit form is open
- **WHEN** the Cast section is displayed
- **THEN** each cast member shows: person photo, name, character name
- **AND** a remove button is available for each entry

#### Scenario: Add cast member

- **GIVEN** the Cast section is displayed
- **WHEN** user clicks "Add Cast Member"
- **THEN** a modal opens with person selector and character field
- **AND** user can search existing persons or create new
- **AND** clicking "Add" adds the cast entry to the list

#### Scenario: Create new person inline

- **GIVEN** the person selector dropdown is open
- **AND** no matching person is found for "John Doe"
- **WHEN** user selects "Create John Doe"
- **THEN** a mini-form appears for name and optional photo
- **AND** saving creates the person and selects them

#### Scenario: Remove cast member

- **GIVEN** a cast list with multiple entries
- **WHEN** user clicks the remove button on an entry
- **THEN** the cast member is removed from the list
- **AND** the person record is NOT deleted (only the relation)

---

### Requirement: Crew Management

The system SHALL provide an interface for managing crew members on a creative work.

#### Scenario: View crew list

- **GIVEN** the creative work edit form is open
- **WHEN** the Crew section is displayed
- **THEN** each crew member shows: person photo, name, job title
- **AND** a remove button is available for each entry

#### Scenario: Add crew member

- **GIVEN** the Crew section is displayed
- **WHEN** user clicks "Add Crew Member"
- **THEN** a modal opens with person selector and job field
- **AND** job suggestions include common roles (Producer, Cinematographer, etc.)

---

### Requirement: Person Management Page

The system SHALL provide a page for managing persons (actors, directors, crew).

#### Scenario: Display persons list

- **GIVEN** user navigates to the People tab
- **WHEN** the page loads
- **THEN** persons are displayed in a table with: Photo, Name, Roles, Works Count
- **AND** roles are computed from their creative work relations

#### Scenario: Search persons

- **GIVEN** the persons list is displayed
- **WHEN** user types "Keanu" in the search field
- **THEN** only persons matching "Keanu" in name are displayed

#### Scenario: Edit person

- **GIVEN** a persons list is displayed
- **WHEN** user clicks edit on a person
- **THEN** a modal opens with: name, bio, photo, birthDate, nationality
- **AND** saving updates the person record

#### Scenario: Delete person

- **GIVEN** a person is not linked to any creative works
- **WHEN** user clicks delete and confirms
- **THEN** the person is deleted
- **AND** the list refreshes

#### Scenario: Prevent deletion of linked person

- **GIVEN** a person is linked to creative works as director or cast
- **WHEN** user attempts to delete
- **THEN** an error displays "Cannot delete person with linked creative works"
- **AND** the linked works are listed

---

### Requirement: Genre Management Page

The system SHALL provide a page for managing genres.

#### Scenario: Display genres list

- **GIVEN** user navigates to the Genres tab
- **WHEN** the page loads
- **THEN** genres are displayed in a list with: color swatch, icon, name

#### Scenario: Add genre

- **GIVEN** the genres list is displayed
- **WHEN** user clicks "Add Genre"
- **THEN** a form appears with: name, slug, icon, color picker
- **AND** saving creates the genre

#### Scenario: Edit genre

- **GIVEN** a genre is displayed in the list
- **WHEN** user clicks edit
- **THEN** the form is populated with existing data
- **AND** saving updates the genre

---

### Requirement: Creative Work Selector Component

The system SHALL provide a reusable selector component for use in event forms.

#### Scenario: Search and select creative work

- **GIVEN** a CreativeWorkSelector is displayed in an event form
- **WHEN** user types "Matrix" and selects a result
- **THEN** the creative work ID is set on the event
- **AND** the selected work's title and poster are displayed

#### Scenario: Filter by type

- **GIVEN** a CreativeWorkSelector with typeFilter=["film"]
- **WHEN** user searches
- **THEN** only films are returned in results

#### Scenario: Clear selection

- **GIVEN** a creative work is selected
- **WHEN** user clicks clear
- **THEN** the selection is removed
- **AND** onChange is called with null

---

### Requirement: Creative Work Card Component

The system SHALL provide a card component for displaying creative works.

#### Scenario: Display work summary

- **GIVEN** a CreativeWorkCard with work data
- **WHEN** the component renders
- **THEN** it displays: poster (or placeholder), title, release year, type icon
- **AND** genres are shown as small badges

#### Scenario: Handle missing poster

- **GIVEN** a creative work without a poster
- **WHEN** the card renders
- **THEN** a placeholder image with type icon is displayed
