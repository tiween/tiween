## ADDED Requirements

### Requirement: Event Group Selection

The Events Manager admin SHALL allow users to optionally assign events to an event group for organizational purposes.

#### Scenario: Display event group selector

- **WHEN** event creation modal is open
- **THEN** an optional event group dropdown is shown
- **AND** dropdown lists available event groups

#### Scenario: Select event group

- **WHEN** user selects an event group from the dropdown
- **THEN** selection is stored for the event being created

#### Scenario: Create event with group

- **WHEN** event is created with an event group selected
- **THEN** event is linked to the selected event group via eventGroup relation

#### Scenario: Create event without group

- **WHEN** user leaves event group unselected
- **THEN** event is created without eventGroup relation

---

### Requirement: Event Creation Modal

The Events Manager admin SHALL provide a modal dialog for creating events that opens when clicking a calendar time slot.

#### Scenario: Open event creation modal

- **WHEN** user clicks on an available time slot in the calendar
- **THEN** a modal dialog opens
- **AND** content search panel is displayed
- **AND** date and time from clicked slot are pre-filled

#### Scenario: Modal layout

- **WHEN** event creation modal is open
- **THEN** left side shows content search panel with type dropdown
- **AND** right side shows showtime configuration form
- **AND** modal has Cancel and Create buttons at bottom

---

### Requirement: Event Creation Wizard

The Events Manager admin SHALL provide a multi-step wizard within the modal for creating events that links content to a venue with configured showtimes.

#### Scenario: Search and select content

- **WHEN** modal opens
- **THEN** user sees content type dropdown (Movies, Shorts, Plays)
- **AND** user sees search input field
- **AND** user searches and selects content from results

#### Scenario: Select movie step

- **WHEN** user selects content from search results
- **THEN** selected content details are shown in summary on the right
- **AND** showtime configuration fields become active

#### Scenario: Configure showtime

- **WHEN** content is selected
- **THEN** form displays pre-filled date and time from clicked slot
- **AND** form displays fields for format (VOST, VF, VO, 3D, IMAX)
- **AND** form displays language and subtitle selectors
- **AND** form displays price input field

#### Scenario: Review and confirm

- **WHEN** user completes showtime configuration
- **THEN** "Create" button is enabled
- **WHEN** user clicks "Create"
- **THEN** event and showtime records are created
- **AND** modal closes
- **AND** calendar view updates to show new event

---

### Requirement: Recurring Showtime Creation

The Events Manager admin SHALL allow users to create multiple showtimes at once using recurrence rules (RRule).

#### Scenario: Enable recurrence

- **WHEN** user is configuring showtime
- **THEN** a "Repeat" toggle or checkbox is available
- **WHEN** user enables repeat
- **THEN** recurrence options are displayed

#### Scenario: Configure frequency

- **WHEN** recurrence is enabled
- **THEN** user can select frequency: Daily, Weekly, Custom
- **AND** for Weekly, user can select specific days of the week

#### Scenario: Configure end condition

- **WHEN** recurrence is enabled
- **THEN** user can choose end condition:
- **AND** "End by date" with date picker
- **AND** "End after X occurrences" with number input

#### Scenario: Preview recurrence

- **WHEN** recurrence is configured
- **THEN** preview shows list of generated showtime dates
- **AND** user can review all occurrences before creating

#### Scenario: Create recurring showtimes

- **WHEN** user confirms creation with recurrence
- **THEN** system generates all showtime dates from RRule
- **AND** creates one Event with multiple Showtime entries
- **AND** first showtime is marked as the "parent" occurrence
- **AND** subsequent showtimes store reference to parent showtime ID
- **AND** all showtimes appear on the calendar

---

### Requirement: Recurring Showtime Parent Reference

The Events Manager SHALL maintain a parent-child relationship between recurring showtimes to enable bulk operations.

#### Scenario: Store parent reference

- **WHEN** recurring showtimes are created
- **THEN** first occurrence has no parentShowtimeId (it is the parent)
- **AND** all other occurrences store the parent showtime's ID in parentShowtimeId field

#### Scenario: Delete single occurrence

- **WHEN** user deletes a single recurring showtime
- **THEN** only that showtime is deleted
- **AND** other occurrences remain unchanged

#### Scenario: Delete all occurrences

- **WHEN** user chooses to delete all occurrences of a recurring showtime
- **THEN** system finds all showtimes with same parentShowtimeId
- **AND** deletes the parent and all child showtimes
- **AND** calendar updates to remove all occurrences

#### Scenario: Identify recurring showtime

- **WHEN** showtime has a parentShowtimeId or is referenced by other showtimes
- **THEN** calendar displays a recurring indicator icon on the event block

---

### Requirement: Event Edit Form

The Events Manager admin SHALL allow editing existing events through a form pre-populated with current values.

#### Scenario: Open event for editing

- **WHEN** user clicks on an event block in the calendar
- **THEN** event edit form opens
- **AND** form is pre-populated with event data

#### Scenario: Modify event details

- **WHEN** user changes showtime values and saves
- **THEN** showtime record is updated
- **AND** calendar reflects the changes

#### Scenario: Delete event

- **WHEN** user clicks delete button on event form
- **THEN** confirmation dialog appears asking for confirmation
- **WHEN** user confirms deletion
- **THEN** event and associated showtimes are deleted
- **AND** calendar view updates to remove the event block

---

### Requirement: Delete Confirmation Dialog

The Events Manager admin SHALL display a confirmation dialog before permanently deleting events or showtimes.

#### Scenario: Show delete confirmation

- **WHEN** user initiates a delete action
- **THEN** modal dialog appears with warning message
- **AND** dialog shows "Cancel" and "Delete" buttons

#### Scenario: Cancel deletion

- **WHEN** user clicks "Cancel" on confirmation dialog
- **THEN** dialog closes
- **AND** no deletion occurs

#### Scenario: Confirm deletion

- **WHEN** user clicks "Delete" on confirmation dialog
- **THEN** item is permanently deleted
- **AND** UI updates to reflect deletion
