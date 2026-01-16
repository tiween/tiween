## Context

The events-manager plugin currently uses FullCalendar for scheduling showtimes. While functional, FullCalendar requires ~350 lines of CSS overrides (`CalendarWrapper.tsx`) to approximate Strapi DS styling. A native implementation provides better integration and maintainability.

**Stakeholders**: Plugin developers, content managers using the admin panel

**Constraints**:

- Must use Strapi DS components exclusively (no external calendar libraries)
- Must support React 18 (Strapi admin uses React 18, not 19)
- Must integrate with existing theme system (`styled-components`)
- Must be accessible (keyboard navigation, screen reader support)

## Goals / Non-Goals

**Goals**:

- Create reusable `BigCalendar` component for Strapi admin plugins
- Support Day and Week views with time grid layout
- Render events as positioned blocks with configurable appearance
- Provide navigation controls and current time indicator
- Allow configurable slot intervals (15min, 30min, 1hour)
- Maintain performance with 100+ events visible

**Non-Goals**:

- Month view (deferred to future iteration)
- Drag-and-drop (deferred)
- Event resizing (deferred)
- iCal/external calendar integration
- Recurring event visualization (handled by parent component)

## Decisions

### 1. Component Architecture

**Decision**: Compound component pattern with separate sub-components

```
BigCalendar/
├── index.tsx              # Main export, orchestrates views
├── BigCalendar.tsx        # Root component with context provider
├── DayView.tsx            # Single day time grid
├── WeekView.tsx           # 7-day time grid
├── TimeGrid.tsx           # Shared time slot rendering
├── TimeSlot.tsx           # Individual slot component
├── EventBlock.tsx         # Positioned event display
├── NavigationBar.tsx      # Prev/Next/Today controls
├── NowIndicator.tsx       # Current time line
├── types.ts               # TypeScript interfaces
└── utils.ts               # Time calculation helpers
```

**Rationale**: Separation allows independent testing, easier maintenance, and potential tree-shaking. Compound pattern (like Strapi's `Modal.Root`, `Modal.Body`) fits DS conventions.

### 2. Time Grid Rendering

**Decision**: CSS Grid with fixed row heights based on slot duration

```typescript
const SLOT_HEIGHTS: Record<SlotDuration, number> = {
  "15min": 24,
  "30min": 40,
  "60min": 60,
}
```

**Rationale**: CSS Grid provides precise control over time slot positioning. Fixed heights ensure consistent spacing and predictable event positioning.

**Implementation**:

- Time axis: First column (`fr` unit for responsive width)
- Day columns: Equal width columns (`1fr` each)
- Slots: One row per interval within visible time range

### 3. Event Positioning Algorithm

**Decision**: Absolute positioning within grid cells using percentage-based offsets

```typescript
interface EventPosition {
  top: number // Percentage from slot start
  height: number // Percentage of slots spanned
  left: number // Percentage for overlapping events (0, 50, etc.)
  width: number // Percentage width (100, 50, 33 for overlaps)
}

function calculateEventPosition(
  event: CalendarEvent,
  slotStart: Date,
  slotDuration: number,
  overlappingEvents: CalendarEvent[]
): EventPosition
```

**Rationale**: Percentage-based positioning handles different slot durations gracefully. Overlap detection prevents event stacking.

**Overlap handling**:

1. Group events by time overlap
2. Assign column index within overlap group
3. Calculate width as `100% / overlapCount`
4. Offset left position by column index

### 4. State Management

**Decision**: Controlled component with optional internal state

```typescript
interface BigCalendarProps {
  // Controlled mode
  currentDate?: Date
  onDateChange?: (date: Date) => void
  view?: "day" | "week"
  onViewChange?: (view: "day" | "week") => void

  // Events
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date) => void

  // Configuration
  slotDuration?: 15 | 30 | 60
  minTime?: string // "08:00"
  maxTime?: string // "24:00"
  locale?: string
  timezone?: string
}
```

**Rationale**: Controlled mode allows parent to manage state (e.g., for URL sync). Internal state provides simpler usage for basic cases.

### 5. Current Time Indicator

**Decision**: Absolutely positioned line with CSS animation, updated via `setInterval`

```typescript
// Update every minute
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(new Date())
  }, 60000)
  return () => clearInterval(interval)
}, [])
```

**Rationale**: Minute-level precision is sufficient for visual indication. Animation (pulse) draws attention without being distracting.

### 6. Accessibility

**Decision**: ARIA grid pattern with keyboard navigation

- `role="grid"` on calendar container
- `role="gridcell"` on time slots
- `role="button"` on events (clickable)
- Arrow key navigation between slots
- Enter/Space to select slot or event
- Screen reader announcements for date changes

**Reference**: [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)

### 7. Styling Approach

**Decision**: Styled-components with Strapi theme tokens

```typescript
const TimeSlotContainer = styled(Box)<{ $isCurrentHour: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  background-color: ${({ theme, $isCurrentHour }) =>
    $isCurrentHour ? theme.colors.primary100 : theme.colors.neutral0};
  min-height: ${({ theme }) => theme.spaces[6]};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }
`
```

**Rationale**: Matches existing pattern in `CalendarWrapper.tsx`. Direct theme access ensures consistency with Strapi DS.

## Risks / Trade-offs

| Risk                         | Impact                                    | Mitigation                                               |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Performance with many events | Slow rendering, janky scrolling           | Virtual scrolling for 200+ events; memoization           |
| Complex overlap calculations | CPU-intensive on each render              | Memoize overlap groups; recalculate only on event change |
| Timezone handling complexity | Incorrect event times displayed           | Use `date-fns-tz` for timezone-aware calculations        |
| Accessibility gaps           | Unusable for keyboard/screen reader users | Test with VoiceOver/NVDA; follow ARIA grid pattern       |

## Migration Plan

**Development phase - direct replacement approach:**

1. Build `BigCalendar` component
2. Replace `PlanningCalendar` usage in `PlanningTab.tsx` with `BigCalendar`
3. Remove `PlanningCalendar` component and `CalendarWrapper`
4. Remove FullCalendar dependencies from `package.json` (`@fullcalendar/*` packages)

## Open Questions

1. **Timezone handling**: Should we use `date-fns-tz` or rely on browser's `Intl.DateTimeFormat`?

   - Recommendation: `Intl.DateTimeFormat` for simplicity; add `date-fns-tz` only if edge cases arise

2. **Event data fetching**: Should the component fetch its own data or receive events as props?

   - Recommendation: Props-based (events as array) - keeps component pure and testable

3. **Slot click behavior**: Should clicking a slot open a modal, or delegate to parent?
   - Recommendation: Delegate via `onSlotClick` callback - parent decides behavior
