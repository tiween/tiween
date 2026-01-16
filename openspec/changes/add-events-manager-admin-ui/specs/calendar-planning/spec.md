## ADDED Requirements

### Requirement: Planning Calendar View

The Events Manager admin SHALL provide a weekly calendar view displaying scheduled events as colored blocks within hourly time slots.

#### Scenario: View planning calendar

- **WHEN** user navigates to Planning page
- **THEN** system displays venue selector dropdown prominently
- **AND** calendar grid is disabled/hidden until venue is selected
- **AND** date range selector shows current week

#### Scenario: Select venue first

- **WHEN** no venue is selected
- **THEN** calendar time slots are disabled or not shown
- **AND** message prompts user to select a venue first

#### Scenario: Enable calendar after venue selection

- **WHEN** user selects a venue from the dropdown
- **THEN** calendar grid becomes active and interactive
- **AND** events for that venue appear as colored blocks
- **AND** time slots become clickable for event creation

---

### Requirement: Event Block Display

The Events Manager admin SHALL display events on the calendar as colored blocks with duration and visual styling derived from the content metadata.

#### Scenario: Event block duration

- **WHEN** event block is rendered on the calendar
- **THEN** block height represents the content duration
- **AND** for TMDB movies, duration is taken from runtime field
- **AND** for creative works (shorts, plays), duration is taken from duration field

#### Scenario: Event block color from poster

- **WHEN** event block is rendered
- **THEN** block background color is extracted from the content poster image
- **AND** vibrant/dominant color is used for visual distinction
- **AND** text color is adjusted for contrast against background

#### Scenario: Event block content

- **WHEN** event block is displayed
- **THEN** block shows content title
- **AND** block shows showtime time
- **AND** block shows format badge (VOST, VF, 3D, etc.) if applicable

#### Scenario: Multiple events same time

- **WHEN** multiple events overlap in time
- **THEN** blocks are displayed side-by-side or stacked
- **AND** each maintains its distinct color

#### Scenario: Navigate between weeks

- **WHEN** user clicks previous/next week buttons
- **THEN** calendar view shifts to show the selected week
- **AND** events for the new date range are fetched

#### Scenario: Disable past time slots

- **WHEN** calendar displays time slots
- **THEN** past time slots (before current time) are visually disabled
- **AND** past time slots are not clickable for event creation

#### Scenario: Empty calendar state

- **WHEN** venue is selected but no events exist for date range
- **THEN** calendar displays empty slots
- **AND** user can click any future slot to create a new event

#### Scenario: Click on time slot

- **WHEN** user clicks on an available future time slot (venue already selected)
- **THEN** event creation modal opens
- **AND** selected venue is pre-filled and locked
- **AND** clicked date and time are pre-filled in the showtime form
