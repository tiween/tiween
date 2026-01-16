# Change: Enhance Planning Calendar UX

## Why

The Planning calendar currently has several UX issues that reduce efficiency for venue managers:

1. **Past dates clutter the view:** Users can navigate to past weeks even though scheduling events in the past is blocked. This wastes screen space and creates confusion.
2. **Fixed week view:** The calendar is locked to a weekly view, but managers often need to see a single day's schedule in detail or a monthly overview for long-term planning.
3. **Subtle now indicator:** The current time indicator (a thin red line) is easy to miss, making it hard to quickly orient to the current moment when scheduling.
4. **Fixed time slots:** The current 30-minute slot duration is fixed and cannot be adjusted based on user preference or scheduling needs.

## What Changes

### 1. Hide Past Dates

- **Start calendar from today:** The calendar's valid date range begins at today's date
- **Disable past navigation:** The "prev" button becomes disabled when already at the earliest allowed date (today)
- **Visual distinction:** Past time slots within today remain dimmed (already styled) but past days are not navigable

### 2. Add View Switcher

- **Day/Week/Month toggle:** Add view switcher buttons to the calendar header toolbar
- **Day view (`timeGridDay`):** Single-day detailed schedule with all time slots
- **Week view (`timeGridWeek`):** Current default behavior - 7-day grid
- **Month view (`dayGridMonth`):** Monthly overview showing events as compact blocks
- **Persisted view preference:** Selected view is maintained during the session

### 3. Enhanced Now Indicator

- **Thicker line:** Increase line width from 2px to 3px for better visibility
- **Pulsing animation:** Add subtle CSS pulse animation to draw attention
- **Larger arrow marker:** Increase arrow size from 5px to 8px
- **Higher contrast color:** Use a brighter red/danger color with drop shadow

### 4. Configurable Time Slots

- **Slot size selector:** Add dropdown to choose slot duration (15min, 30min, 1hr)
- **Default 15 minutes:** Start with 15-minute slots for precise scheduling
- **Dynamic slot height:** Adjust CSS height based on selected duration to maintain usable density
- **Persisted preference:** Selected slot size is maintained during the session

## Impact

- Affected specs: None (no specs exist yet)
- Affected code:
  - `apps/strapi/src/plugins/events-manager/admin/src/components/PlanningCalendar/index.tsx`
    - Add `dayGridPlugin` import
    - Configure `validRange` to restrict past dates
    - Update `headerToolbar.right` with view switcher buttons
    - Add slot duration state and selector
    - Pass dynamic `slotDuration` prop to FullCalendar
    - Add view state management
  - `apps/strapi/src/plugins/events-manager/admin/src/components/PlanningCalendar/CalendarWrapper.tsx`
    - Enhance `.fc-timegrid-now-indicator-line` styles
    - Add `@keyframes` for pulse animation
    - Add `.fc-daygrid` styles for month view compatibility
    - Adjust `.fc-timegrid-slot` height for 15-minute slots

## Dependencies

- FullCalendar `@fullcalendar/daygrid` plugin (for month view)
- Existing `@fullcalendar/timegrid` and `@fullcalendar/interaction` plugins

## Constraints

- MANDATORY: Use `@strapi/design-system` tokens for all colors and spacing
- Month view events should remain clickable for editing
- View switcher must use FullCalendar's built-in button group styling (adapted to Strapi theme)
