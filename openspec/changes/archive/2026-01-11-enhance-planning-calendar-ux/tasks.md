# Tasks: Enhance Planning Calendar UX

## Prerequisites

- [x] Verify `@fullcalendar/daygrid` package is installed (add if missing)

## 1. Hide Past Dates

- [x] Add `validRange` configuration to FullCalendar
  - Set `start` to today's date (midnight)
  - No `end` restriction needed
- [x] Verify "prev" button auto-disables when at the valid range boundary
- [x] Test that past weeks are no longer navigable

## 2. Add View Switcher

- [x] Import `dayGridPlugin` from `@fullcalendar/daygrid`
- [x] Add `dayGridPlugin` to the `plugins` array
- [x] Update `headerToolbar.right` to `"timeGridDay,timeGridWeek,dayGridMonth"`
- [x] Add button group styles in `CalendarWrapper.tsx`
  - Style `.fc-button-group` for Strapi theme consistency
  - Ensure active view button has primary color highlight
- [x] Verify all three views work correctly:
  - Day view shows single day with time slots
  - Week view (default) unchanged
  - Month view shows compact event blocks
- [x] Verify event click handlers work in all views

## 3. Enhance Now Indicator

- [x] Update `.fc-timegrid-now-indicator-line` in `CalendarWrapper.tsx`
  - Increase `border-width` to 3px
  - Add `box-shadow` for glow effect
- [x] Update `.fc-timegrid-now-indicator-arrow`
  - Increase `border-width` to 8px
- [x] Add `@keyframes pulse` animation
  - Subtle opacity oscillation (0.6 to 1.0)
  - 2-second duration, infinite loop
- [x] Apply animation to the indicator line
- [x] Test that animation is visible but not distracting

## 4. Configurable Time Slots

- [x] Add `slotDuration` state with default `"00:15:00"`
- [x] Create slot size selector dropdown (15min, 30min, 1hr options)
  - Use `SingleSelect` from `@strapi/design-system`
  - Position above calendar
- [x] Pass dynamic `slotDuration` to FullCalendar component
- [x] Add dynamic slot height calculation based on duration:
  - 15min → 24px
  - 30min → 40px
  - 1hr → 60px
- [x] Verify time slot labels update correctly when switching
- [x] Verify clicking slots creates events at correct times for all durations

## Validation

- [x] Navigate calendar: confirm past weeks are inaccessible
- [x] Switch between Day/Week/Month views
- [x] Verify now indicator visibility improvements
- [x] Confirm event creation still works in all views
- [x] Confirm event editing (click) still works in all views
- [x] Run TypeScript type check (`yarn tsc --noEmit`)
