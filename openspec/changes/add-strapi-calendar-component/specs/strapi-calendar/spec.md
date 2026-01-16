## ADDED Requirements

### Requirement: Big Calendar Component

The system SHALL provide a `BigCalendar` component built with Strapi Design System primitives for displaying time-based events in admin plugins.

#### Scenario: Render day view with time slots

- **GIVEN** a BigCalendar component with `view="day"`
- **AND** `slotDuration={30}` (30 minutes)
- **AND** `minTime="08:00"` and `maxTime="24:00"`
- **WHEN** the component renders
- **THEN** it displays a single column with 32 time slots (16 hours × 2 slots/hour)
- **AND** each slot shows the time label on the left axis
- **AND** slots are visually separated by borders

#### Scenario: Render week view with time grid

- **GIVEN** a BigCalendar component with `view="week"`
- **AND** `currentDate` set to a specific date
- **WHEN** the component renders
- **THEN** it displays 7 columns for each day of the week
- **AND** column headers show day names and dates
- **AND** each column contains time slots matching the day view layout

#### Scenario: Display events within time slots

- **GIVEN** a BigCalendar with events array containing event objects
- **AND** each event has `id`, `title`, `start`, and `end` properties
- **WHEN** the component renders
- **THEN** events appear as styled blocks positioned at their start time
- **AND** event height corresponds to duration (end - start)
- **AND** events spanning multiple slots extend across those slots

#### Scenario: Handle overlapping events

- **GIVEN** two or more events with overlapping time ranges
- **WHEN** the component renders
- **THEN** overlapping events display side-by-side within the same time slot
- **AND** each event's width is reduced proportionally (e.g., 2 events = 50% width each)
- **AND** events are offset horizontally to prevent visual overlap

---

### Requirement: Calendar Navigation

The system SHALL provide navigation controls for moving between dates and views.

#### Scenario: Navigate to previous/next period

- **GIVEN** a BigCalendar in day view showing January 15
- **WHEN** user clicks the "Next" button
- **THEN** the calendar displays January 16
- **AND** the `onDateChange` callback is invoked with the new date

#### Scenario: Navigate to previous period in week view

- **GIVEN** a BigCalendar in week view showing January 13-19
- **WHEN** user clicks the "Previous" button
- **THEN** the calendar displays January 6-12
- **AND** the `onDateChange` callback is invoked with January 6

#### Scenario: Return to today

- **GIVEN** a BigCalendar showing a date other than today
- **WHEN** user clicks the "Today" button
- **THEN** the calendar navigates to the current date
- **AND** the `onDateChange` callback is invoked with today's date

#### Scenario: Switch between day and week views

- **GIVEN** a BigCalendar in day view
- **WHEN** user clicks the "Week" view button
- **THEN** the calendar switches to week view for the week containing the current date
- **AND** the `onViewChange` callback is invoked with `"week"`

---

### Requirement: Current Time Indicator

The system SHALL display a visual indicator showing the current time within the calendar grid.

#### Scenario: Display now indicator on current day

- **GIVEN** a BigCalendar showing today's date
- **AND** the current time is within the visible time range (minTime to maxTime)
- **WHEN** the component renders
- **THEN** a horizontal line appears at the current time position
- **AND** the line spans the full width of the day column
- **AND** the line has a distinctive color (danger/red) to stand out

#### Scenario: Animate now indicator

- **GIVEN** the now indicator is visible
- **WHEN** observing the indicator
- **THEN** it displays a subtle pulse animation
- **AND** the animation repeats continuously

#### Scenario: Update now indicator position

- **GIVEN** the now indicator is visible
- **WHEN** one minute passes
- **THEN** the indicator position updates to reflect the new current time

#### Scenario: Hide now indicator on non-current days

- **GIVEN** a BigCalendar showing a date other than today
- **WHEN** the component renders
- **THEN** no now indicator is displayed

---

### Requirement: Configurable Time Slots

The system SHALL allow configuration of time slot intervals.

#### Scenario: Configure 15-minute slots

- **GIVEN** a BigCalendar with `slotDuration={15}`
- **AND** `minTime="08:00"` and `maxTime="12:00"`
- **WHEN** the component renders
- **THEN** 16 time slots are displayed (4 hours × 4 slots/hour)
- **AND** slot labels show times at 15-minute intervals (08:00, 08:15, 08:30, ...)

#### Scenario: Configure 1-hour slots

- **GIVEN** a BigCalendar with `slotDuration={60}`
- **AND** `minTime="08:00"` and `maxTime="18:00"`
- **WHEN** the component renders
- **THEN** 10 time slots are displayed (10 hours × 1 slot/hour)
- **AND** slot labels show times at hourly intervals (08:00, 09:00, 10:00, ...)

#### Scenario: Adjust slot height based on duration

- **GIVEN** a BigCalendar with `slotDuration={15}`
- **WHEN** the component renders
- **THEN** slots have a compact height (e.g., 24px)
- **AND** GIVEN `slotDuration={60}`
- **THEN** slots have a larger height (e.g., 60px) to maintain visual proportions

---

### Requirement: Event Interaction

The system SHALL support user interaction with calendar events and time slots.

#### Scenario: Click on an event

- **GIVEN** a BigCalendar with events displayed
- **AND** an `onEventClick` callback prop is provided
- **WHEN** user clicks on an event block
- **THEN** the `onEventClick` callback is invoked with the clicked event object
- **AND** the event receives visual feedback (e.g., slight scale or shadow)

#### Scenario: Click on an empty time slot

- **GIVEN** a BigCalendar with empty time slots
- **AND** an `onSlotClick` callback prop is provided
- **WHEN** user clicks on an empty slot
- **THEN** the `onSlotClick` callback is invoked with the slot's datetime
- **AND** the slot receives hover/click visual feedback

#### Scenario: Hover feedback on slots

- **GIVEN** a BigCalendar with visible time slots
- **WHEN** user hovers over a time slot
- **THEN** the slot displays a subtle background color change
- **AND** the cursor changes to pointer

---

### Requirement: Accessibility Support

The system SHALL be accessible to keyboard and screen reader users.

#### Scenario: Keyboard navigation between slots

- **GIVEN** a BigCalendar with focus on a time slot
- **WHEN** user presses the Down arrow key
- **THEN** focus moves to the next time slot below
- **AND** WHEN user presses the Right arrow key in week view
- **THEN** focus moves to the same time slot in the next day column

#### Scenario: Screen reader announcements

- **GIVEN** a screen reader is active
- **WHEN** navigating to a time slot
- **THEN** the screen reader announces the date and time of the slot
- **AND** WHEN an event is focused
- **THEN** the screen reader announces the event title, start time, and end time

#### Scenario: Focus visible indicator

- **GIVEN** keyboard navigation is being used
- **WHEN** a slot or event receives focus
- **THEN** a visible focus ring appears around the element
- **AND** the focus ring uses the primary color from Strapi DS

---

### Requirement: Theme Integration

The system SHALL integrate with Strapi Design System theming.

#### Scenario: Use Strapi color tokens

- **GIVEN** a BigCalendar component
- **WHEN** rendering calendar elements
- **THEN** borders use `neutral200` color
- **AND** backgrounds use `neutral0` for slots and `neutral100` for headers
- **AND** the today column uses `primary100` background
- **AND** the now indicator uses `danger600` color

#### Scenario: Respect dark mode

- **GIVEN** a BigCalendar in a Strapi admin with dark theme enabled
- **WHEN** the component renders
- **THEN** all colors automatically adjust via theme tokens
- **AND** contrast remains accessible (WCAG AA)
