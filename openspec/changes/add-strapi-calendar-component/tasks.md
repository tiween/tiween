## 1. Foundation

- [x] 1.1 Create `BigCalendar/` directory structure in `apps/strapi/src/plugins/events-manager/admin/src/components/`
- [x] 1.2 Define TypeScript interfaces in `types.ts` (`CalendarEvent`, `BigCalendarProps`, `SlotDuration`, etc.)
- [x] 1.3 Create utility functions in `utils.ts` (time slot generation, event positioning calculations)

## 2. Core Components - Time Grid

- [x] 2.1 Implement `TimeSlot.tsx` - single time slot cell with hover/click states
- [x] 2.2 Implement `TimeGrid.tsx` - renders slots for a given time range with CSS Grid layout
- [x] 2.3 Implement `TimeAxis.tsx` - left column showing time labels (08:00, 08:30, etc.)
  - Note: Time axis is integrated into TimeGrid component

## 3. View Components

- [x] 3.1 Implement `DayView.tsx` - single day with TimeGrid and TimeAxis
- [x] 3.2 Implement `WeekView.tsx` - 7-day layout with day headers and shared TimeAxis
- [x] 3.3 Implement `DayHeader.tsx` - day name and date display for column headers
  - Note: Day headers integrated into WeekView component

## 4. Event Rendering

- [x] 4.1 Implement `EventBlock.tsx` - styled event display with title, time, hover effects
- [x] 4.2 Implement overlap detection algorithm in `utils.ts`
- [x] 4.3 Integrate `EventBlock` positioning within `TimeGrid` using absolute positioning

## 5. Navigation

- [x] 5.1 Implement `NavigationBar.tsx` - Prev/Next buttons, Today button, date title
- [x] 5.2 Add view switcher buttons (Day/Week toggle)
- [x] 5.3 Connect navigation to date/view state management

## 6. Current Time Indicator

- [x] 6.1 Implement `NowIndicator.tsx` - positioned line with pulse animation
- [x] 6.2 Add interval-based time updates (every 60 seconds)
- [x] 6.3 Conditionally render only on current day within visible time range

## 7. Main Component Assembly

- [x] 7.1 Implement `BigCalendar.tsx` - root component with context provider
- [x] 7.2 Wire up controlled/uncontrolled state management
- [x] 7.3 Create main `index.tsx` export with compound component pattern

## 8. Accessibility

- [x] 8.1 Add ARIA roles (`grid`, `gridcell`, `button`) to calendar elements
- [x] 8.2 Implement keyboard navigation (arrow keys, Enter/Space)
- [x] 8.3 Add `aria-label` announcements for slots and events

## 9. Styling & Polish

- [x] 9.1 Apply Strapi DS theme tokens to all styled components
- [x] 9.2 Implement today column highlight (`primary100` background)
- [x] 9.3 Add hover/focus states matching Strapi DS patterns

## 10. Integration & Cleanup

- [x] 10.1 Replace `PlanningCalendar` usage in `PlanningTab.tsx` with `BigCalendar`
  - Using `PlanningCalendarNew` integration component
- [x] 10.2 Remove `PlanningCalendar/` directory and `CalendarWrapper.tsx`
- [x] 10.3 Remove FullCalendar dependencies from `package.json` (`@fullcalendar/*` packages)
- [ ] 10.4 Manual testing: verify Day/Week views, navigation, event display, now indicator
