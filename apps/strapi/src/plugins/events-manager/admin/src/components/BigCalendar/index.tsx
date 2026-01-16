/**
 * BigCalendar - Strapi Design System Calendar Component
 *
 * A native calendar component built with Strapi DS primitives.
 * Supports day and week views with configurable time slots.
 *
 * @example
 * ```tsx
 * import { BigCalendar } from './components/BigCalendar'
 *
 * function MyComponent() {
 *   const [date, setDate] = useState(new Date())
 *   const events = [
 *     {
 *       id: '1',
 *       title: 'Meeting',
 *       start: new Date('2024-01-15T10:00:00'),
 *       end: new Date('2024-01-15T11:00:00'),
 *     }
 *   ]
 *
 *   return (
 *     <BigCalendar
 *       events={events}
 *       currentDate={date}
 *       onDateChange={setDate}
 *       onEventClick={(event) => console.log('Clicked:', event)}
 *       onSlotClick={(date) => console.log('Slot clicked:', date)}
 *     />
 *   )
 * }
 * ```
 */

export { BigCalendar } from "./BigCalendar"

// Export types for consumers
export type {
  BigCalendarProps,
  CalendarEvent,
  CalendarView,
  SlotDuration,
  TimeSlotData,
  DayColumn,
  EventPosition,
  PositionedEvent,
} from "./types"

// Export utilities for advanced use cases
export {
  formatTime,
  formatDateHeader,
  formatWeekRange,
  generateTimeSlots,
  getEventsForDay,
  positionEventsForDay,
  isToday,
  isSameDay,
  startOfDay,
  startOfWeek,
  addDays,
} from "./utils"

// Export sub-components for custom compositions
export { DayView } from "./DayView"
export { WeekView } from "./WeekView"
export { TimeGrid } from "./TimeGrid"
export { TimeSlot } from "./TimeSlot"
export { EventBlock } from "./EventBlock"
export { NavigationBar } from "./NavigationBar"
export { NowIndicator } from "./NowIndicator"
