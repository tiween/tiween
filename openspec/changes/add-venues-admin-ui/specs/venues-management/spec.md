## ADDED Requirements

### Requirement: Venues List Page

The system SHALL provide a venues list page within the events-manager plugin for viewing and managing venues.

#### Scenario: Display venues in table format

- **GIVEN** a user navigates to the Venues tab in events-manager
- **WHEN** the page loads
- **THEN** a table displays venues with columns: Name, City, Type, Status, Capacity, Actions
- **AND** venues are paginated with 20 items per page by default
- **AND** the total count is displayed

#### Scenario: Search venues by name

- **GIVEN** a venues list is displayed
- **WHEN** user types "Cinema" in the search field
- **THEN** the list filters to show only venues containing "Cinema" in their name
- **AND** the filter is applied after a 300ms debounce

#### Scenario: Filter venues by status

- **GIVEN** a venues list is displayed
- **WHEN** user selects "Pending" from the status filter dropdown
- **THEN** only venues with status "pending" are displayed
- **AND** the filter can be cleared to show all statuses

#### Scenario: Filter venues by type

- **GIVEN** a venues list is displayed
- **WHEN** user selects "Cinema" from the type filter dropdown
- **THEN** only venues with type "cinema" are displayed

#### Scenario: Sort venues by column

- **GIVEN** a venues list is displayed
- **WHEN** user clicks the "Name" column header
- **THEN** venues are sorted alphabetically by name
- **AND** clicking again reverses the sort order

---

### Requirement: Venue Create/Edit Modal

The system SHALL provide a modal form for creating and editing venues.

#### Scenario: Open create venue modal

- **GIVEN** a user is on the Venues list page
- **WHEN** user clicks the "Add Venue" button
- **THEN** a modal opens with an empty venue form
- **AND** the form displays sections: Basic Info, Location, Contact, Details, Media

#### Scenario: Create a new venue

- **GIVEN** the create venue modal is open
- **AND** user fills required fields (name, type)
- **WHEN** user clicks "Save"
- **THEN** the venue is created via API
- **AND** the modal closes
- **AND** the venues list refreshes to include the new venue
- **AND** a success notification is displayed

#### Scenario: Edit an existing venue

- **GIVEN** a venues list is displayed
- **WHEN** user clicks the edit button on a venue row
- **THEN** a modal opens pre-filled with the venue's data
- **AND** user can modify any field
- **AND** clicking "Save" updates the venue

#### Scenario: Validate required fields

- **GIVEN** the venue form modal is open
- **WHEN** user attempts to save without filling required fields
- **THEN** validation errors are displayed on the required fields
- **AND** the form is not submitted

#### Scenario: Auto-generate slug from name

- **GIVEN** the venue form modal is open
- **WHEN** user types "Grand Théâtre de Tunis" in the name field
- **THEN** the slug field auto-populates with "grand-theatre-de-tunis"
- **AND** user can manually override the slug

---

### Requirement: City Selector Component

The system SHALL provide a city selector component that integrates with the geography plugin.

#### Scenario: Select city via region filter

- **GIVEN** the city selector is displayed in a venue form
- **WHEN** user clicks the selector
- **THEN** a dropdown shows regions first
- **AND** after selecting a region, cities within that region are displayed
- **AND** selecting a city populates the venue's cityRef field

#### Scenario: Display selected city

- **GIVEN** a venue has a cityRef assigned
- **WHEN** the venue form loads
- **THEN** the city selector displays the city name and region
- **AND** user can clear or change the selection

#### Scenario: Handle no geography data

- **GIVEN** the geography plugin has no seeded regions/cities
- **WHEN** user opens the city selector
- **THEN** a message displays "No locations available"
- **AND** a link suggests seeding geography data

---

### Requirement: Venue Status Management

The system SHALL support changing venue status individually and in bulk.

#### Scenario: Change single venue status

- **GIVEN** a venue is displayed in the list
- **WHEN** user clicks edit and changes status to "approved"
- **THEN** the venue status is updated
- **AND** the list displays the new status badge

#### Scenario: Bulk approve venues

- **GIVEN** multiple venues are selected via checkboxes
- **AND** at least one selected venue has status "pending"
- **WHEN** user clicks "Bulk Actions" and selects "Approve"
- **THEN** a confirmation dialog appears
- **AND** upon confirmation, all selected venues are updated to "approved"
- **AND** the list refreshes with updated statuses

#### Scenario: Bulk suspend venues

- **GIVEN** multiple venues are selected via checkboxes
- **WHEN** user clicks "Bulk Actions" and selects "Suspend"
- **THEN** a confirmation dialog appears
- **AND** upon confirmation, all selected venues are updated to "suspended"

#### Scenario: Display status badges

- **GIVEN** a venues list is displayed
- **THEN** "pending" status shows an orange/warning badge
- **AND** "approved" status shows a green/success badge
- **AND** "suspended" status shows a red/danger badge

---

### Requirement: Venue Selector Component

The system SHALL provide a reusable venue selector for use in event forms.

#### Scenario: Select venue in event form

- **GIVEN** the event creation modal is open
- **AND** a VenueSelector component is displayed
- **WHEN** user clicks the selector and types a venue name
- **THEN** matching venues are displayed in a dropdown
- **AND** selecting a venue sets the event's venue relation

#### Scenario: Display venue info in selector

- **GIVEN** the VenueSelector dropdown is open
- **WHEN** venues are listed
- **THEN** each option shows venue name, city, and type badge
- **AND** only approved venues are shown by default

#### Scenario: Clear venue selection

- **GIVEN** a venue is selected in the VenueSelector
- **WHEN** user clicks the clear button
- **THEN** the selection is cleared
- **AND** the onChange callback is invoked with null

---

### Requirement: Venue Card Component

The system SHALL provide a compact venue card for displaying venue information.

#### Scenario: Display venue summary

- **GIVEN** a VenueCard component with venue data
- **WHEN** the component renders
- **THEN** it displays the venue logo (or placeholder)
- **AND** the venue name and city
- **AND** a type badge
- **AND** capacity if available

#### Scenario: Handle missing data gracefully

- **GIVEN** a venue without a logo or city
- **WHEN** the VenueCard renders
- **THEN** a placeholder icon is shown for missing logo
- **AND** "Location not set" is displayed for missing city

---

### Requirement: Delete Venue

The system SHALL support deleting venues with confirmation.

#### Scenario: Delete single venue

- **GIVEN** a venues list is displayed
- **WHEN** user clicks the delete button on a venue row
- **THEN** a confirmation dialog appears with the venue name
- **AND** upon confirmation, the venue is deleted
- **AND** the list refreshes

#### Scenario: Prevent deletion of venue with showtimes

- **GIVEN** a venue has associated showtimes
- **WHEN** user attempts to delete the venue
- **THEN** an error message displays "Cannot delete venue with existing showtimes"
- **AND** the venue is not deleted
