# Planning Calendar

The Planning Calendar provides venue managers with a visual scheduling interface for managing event showtimes.

## ADDED Requirements

### Requirement: Date Range Restriction

The calendar MUST NOT allow navigation to past dates, starting from today.

#### Scenario: Calendar starts from today

- GIVEN the user opens the Planning view
- WHEN the calendar loads
- THEN the calendar displays with today as the earliest visible date
- AND the "previous" navigation button is disabled when viewing the current week

#### Scenario: Past navigation blocked

- GIVEN the calendar is displaying the current week
- WHEN the user attempts to navigate to a previous week
- THEN the navigation is blocked
- AND the calendar remains on the current week

---

### Requirement: View Switcher

The calendar MUST support switching between day, week, and month views.

#### Scenario: Default week view

- GIVEN the user opens the Planning view
- WHEN the calendar loads
- THEN the calendar displays in week view (7-day grid)
- AND the view switcher shows Day, Week, and Month options
- AND the Week option is highlighted as active

#### Scenario: Switch to day view

- GIVEN the calendar is in week view
- WHEN the user clicks the "Day" view button
- THEN the calendar displays a single day with time slots
- AND the Day button becomes active
- AND events for that day are visible and clickable

#### Scenario: Switch to month view

- GIVEN the calendar is in week view
- WHEN the user clicks the "Month" view button
- THEN the calendar displays a monthly grid
- AND events appear as compact blocks within each day cell
- AND events remain clickable for editing

---

### Requirement: Enhanced Now Indicator

The now indicator MUST be prominently visible to help users orient to the current time.

#### Scenario: Now indicator visibility

- GIVEN the calendar is displaying a view that includes the current time
- WHEN the user views the calendar
- THEN a thick, pulsing red line indicates the current time
- AND the indicator has a larger arrow marker on the left edge
- AND the indicator has a subtle glow effect for enhanced visibility

#### Scenario: Now indicator in different views

- GIVEN the calendar is in day or week view
- WHEN the current time is within visible hours (08:00-24:00)
- THEN the now indicator line is visible
- AND the pulsing animation draws attention without being distracting

---

### Requirement: Configurable Time Slots

The calendar MUST allow users to select the time slot granularity via a dropdown selector.

#### Scenario: Default slot size

- GIVEN the user opens the Planning view in day or week mode
- WHEN the calendar loads
- THEN time slots are displayed in 15-minute increments by default
- AND a slot size selector is visible with options: 15min, 30min, 1hr

#### Scenario: Change slot size to 30 minutes

- GIVEN the calendar is displaying with 15-minute slots
- WHEN the user selects "30min" from the slot size dropdown
- THEN time slots update to 30-minute increments
- AND each hour shows 2 clickable slots (e.g., 14:00, 14:30)
- AND the slot height adjusts to maintain usable calendar density

#### Scenario: Change slot size to 1 hour

- GIVEN the calendar is displaying with any slot size
- WHEN the user selects "1hr" from the slot size dropdown
- THEN time slots update to 1-hour increments
- AND each hour shows 1 clickable slot
- AND the slot height increases for better visibility

#### Scenario: Event creation respects slot size

- GIVEN the calendar is displaying with a selected slot size
- WHEN the user clicks on a time slot
- THEN the event creation modal opens with the exact slot time selected
- AND the time aligns to the current slot granularity
