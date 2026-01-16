/**
 * BigCalendar Type Definitions
 *
 * Core types for the Strapi DS-based calendar component.
 */

/** Slot duration options in minutes */
export type SlotDuration = 15 | 30 | 60

/** Calendar view modes */
export type CalendarView = "day" | "week"

/** Calendar event representation */
export interface CalendarEvent {
  id: string | number
  title: string
  start: Date
  end: Date
  /** Optional color override (CSS color value) */
  color?: string
  /** Optional text color override */
  textColor?: string
  /** Additional data passed through to event handlers */
  extendedProps?: Record<string, unknown>
}

/** Calculated position for rendering an event block */
export interface EventPosition {
  /** Top offset as percentage from container top */
  top: number
  /** Height as percentage of container */
  height: number
  /** Left offset as percentage (for overlapping events) */
  left: number
  /** Width as percentage (reduced for overlapping events) */
  width: number
  /** Column index within overlap group */
  column: number
  /** Total columns in overlap group */
  totalColumns: number
}

/** Event with calculated position */
export interface PositionedEvent {
  event: CalendarEvent
  position: EventPosition
}

/** Time slot data */
export interface TimeSlotData {
  /** Slot start time */
  time: Date
  /** Slot end time */
  endTime: Date
  /** Formatted time label (e.g., "08:00") */
  label: string
  /** Whether this slot contains the current time */
  isCurrentSlot: boolean
}

/** Day column data for week view */
export interface DayColumn {
  /** Date for this column */
  date: Date
  /** Day name (e.g., "Mon", "Tue") */
  dayName: string
  /** Day number (e.g., "15") */
  dayNumber: string
  /** Whether this is today */
  isToday: boolean
  /** Events for this day */
  events: CalendarEvent[]
}

/** BigCalendar component props */
export interface BigCalendarProps {
  /** Events to display */
  events: CalendarEvent[]

  /** Current date (controlled mode) */
  currentDate?: Date
  /** Callback when date changes */
  onDateChange?: (date: Date) => void

  /** Current view (controlled mode) */
  view?: CalendarView
  /** Callback when view changes */
  onViewChange?: (view: CalendarView) => void

  /** Time slot duration in minutes */
  slotDuration?: SlotDuration
  /** Callback when slot duration changes */
  onSlotDurationChange?: (duration: SlotDuration) => void

  /** Earliest visible time (e.g., "08:00") */
  minTime?: string
  /** Latest visible time (e.g., "24:00") */
  maxTime?: string

  /** Callback when an event is clicked */
  onEventClick?: (event: CalendarEvent) => void
  /** Callback when an empty slot is clicked */
  onSlotClick?: (date: Date) => void

  /** Locale for date formatting */
  locale?: string
  /** IANA timezone (e.g., "Africa/Casablanca") */
  timezone?: string

  /** First day of week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6

  /** Minimum height of the calendar container */
  minHeight?: string
}

/** Navigation bar props */
export interface NavigationBarProps {
  currentDate: Date
  view: CalendarView
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  locale?: string
}

/** Time grid props */
export interface TimeGridProps {
  date: Date
  slots: TimeSlotData[]
  events: CalendarEvent[]
  slotDuration: SlotDuration
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  showNowIndicator?: boolean
  timezone?: string
}

/** Day view props */
export interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  slots: TimeSlotData[]
  slotDuration: SlotDuration
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  timezone?: string
}

/** Week view props */
export interface WeekViewProps {
  startDate: Date
  events: CalendarEvent[]
  slots: TimeSlotData[]
  slotDuration: SlotDuration
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  firstDayOfWeek?: number
  locale?: string
  timezone?: string
}

/** Event block props */
export interface EventBlockProps {
  event: CalendarEvent
  position: EventPosition
  onClick?: (event: CalendarEvent) => void
}

/** Now indicator props */
export interface NowIndicatorProps {
  /** Current time */
  currentTime: Date
  /** Start of visible time range */
  minTime: Date
  /** End of visible time range */
  maxTime: Date
  /** Whether the indicator should be visible */
  isVisible: boolean
}

/** Slot height configuration based on duration */
export const SLOT_HEIGHTS: Record<SlotDuration, number> = {
  15: 24,
  30: 40,
  60: 60,
}

/** Slot duration options for selector */
export const SLOT_OPTIONS: { value: SlotDuration; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
]
