/**
 * BigCalendar Utility Functions
 *
 * Time slot generation, event positioning, and date helpers.
 */

import type {
  CalendarEvent,
  DayColumn,
  EventPosition,
  PositionedEvent,
  SlotDuration,
  TimeSlotData,
} from "./types"

/**
 * Parse time string (e.g., "08:00") to hours and minutes
 */
export function parseTimeString(time: string): {
  hours: number
  minutes: number
} {
  const [hours, minutes] = time.split(":").map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

/**
 * Create a date with specific time on a given day
 */
export function setTimeOnDate(
  date: Date,
  hours: number,
  minutes: number
): Date {
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Format time for display (e.g., "08:00", "14:30")
 */
export function formatTime(date: Date, locale = "fr-FR"): string {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/**
 * Format date for header display
 */
export function formatDateHeader(date: Date, locale = "fr-FR"): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Format week range for header display
 */
export function formatWeekRange(
  startDate: Date,
  endDate: Date,
  locale = "fr-FR"
): string {
  const startMonth = startDate.toLocaleDateString(locale, { month: "short" })
  const endMonth = endDate.toLocaleDateString(locale, { month: "short" })
  const year = endDate.getFullYear()

  if (startMonth === endMonth) {
    return `${startDate.getDate()} - ${endDate.getDate()} ${startMonth} ${year}`
  }
  return `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth} ${year}`
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * Get the start of day for a date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the start of week for a date
 */
export function startOfWeek(date: Date, firstDayOfWeek = 1): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Generate time slots for a day
 */
export function generateTimeSlots(
  date: Date,
  minTime: string,
  maxTime: string,
  slotDuration: SlotDuration
): TimeSlotData[] {
  const slots: TimeSlotData[] = []
  const { hours: minHours, minutes: minMinutes } = parseTimeString(minTime)
  const { hours: maxHours, minutes: maxMinutes } = parseTimeString(maxTime)

  const startTime = setTimeOnDate(date, minHours, minMinutes)
  const endTime = setTimeOnDate(date, maxHours, maxMinutes)
  const now = new Date()

  let current = new Date(startTime)

  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000)
    const isCurrentSlot =
      now >= current && now < slotEnd && isSameDay(current, now)

    slots.push({
      time: new Date(current),
      endTime: slotEnd,
      label: formatTime(current),
      isCurrentSlot,
    })

    current = slotEnd
  }

  return slots
}

/**
 * Get events for a specific day
 */
export function getEventsForDay(
  events: CalendarEvent[],
  date: Date
): CalendarEvent[] {
  const dayStart = startOfDay(date)
  const dayEnd = addDays(dayStart, 1)

  return events.filter((event) => {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    // Event overlaps with this day
    return eventStart < dayEnd && eventEnd > dayStart
  })
}

/**
 * Generate day columns for week view
 */
export function generateDayColumns(
  startDate: Date,
  events: CalendarEvent[],
  locale = "fr-FR"
): DayColumn[] {
  const columns: DayColumn[] = []

  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i)
    columns.push({
      date,
      dayName: date.toLocaleDateString(locale, { weekday: "short" }),
      dayNumber: date.getDate().toString(),
      isToday: isToday(date),
      events: getEventsForDay(events, date),
    })
  }

  return columns
}

/**
 * Check if two time ranges overlap
 */
export function doTimesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Group overlapping events
 */
export function groupOverlappingEvents(
  events: CalendarEvent[]
): CalendarEvent[][] {
  if (events.length === 0) return []

  // Sort by start time
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const groups: CalendarEvent[][] = []
  let currentGroup: CalendarEvent[] = [sorted[0]]
  let groupEnd = new Date(sorted[0].end)

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i]
    const eventStart = new Date(event.start)

    if (eventStart < groupEnd) {
      // Overlaps with current group
      currentGroup.push(event)
      const eventEnd = new Date(event.end)
      if (eventEnd > groupEnd) {
        groupEnd = eventEnd
      }
    } else {
      // Start new group
      groups.push(currentGroup)
      currentGroup = [event]
      groupEnd = new Date(event.end)
    }
  }

  groups.push(currentGroup)
  return groups
}

/**
 * Calculate event position within a time grid
 */
export function calculateEventPosition(
  event: CalendarEvent,
  dayStart: Date,
  minTime: string,
  maxTime: string,
  columnIndex: number,
  totalColumns: number
): EventPosition {
  const { hours: minHours, minutes: minMinutes } = parseTimeString(minTime)
  const { hours: maxHours, minutes: maxMinutes } = parseTimeString(maxTime)

  const gridStart = setTimeOnDate(dayStart, minHours, minMinutes)
  const gridEnd = setTimeOnDate(dayStart, maxHours, maxMinutes)
  const gridDuration = gridEnd.getTime() - gridStart.getTime()

  const eventStart = new Date(event.start)
  const eventEnd = new Date(event.end)

  // Clamp event times to visible range
  const visibleStart = eventStart < gridStart ? gridStart : eventStart
  const visibleEnd = eventEnd > gridEnd ? gridEnd : eventEnd

  const top =
    ((visibleStart.getTime() - gridStart.getTime()) / gridDuration) * 100
  const height =
    ((visibleEnd.getTime() - visibleStart.getTime()) / gridDuration) * 100

  const width = 100 / totalColumns
  const left = columnIndex * width

  return {
    top: Math.max(0, top),
    height: Math.max(0, height),
    left,
    width,
    column: columnIndex,
    totalColumns,
  }
}

/**
 * Calculate positions for all events in a day
 */
export function positionEventsForDay(
  events: CalendarEvent[],
  dayStart: Date,
  minTime: string,
  maxTime: string
): PositionedEvent[] {
  const groups = groupOverlappingEvents(events)
  const positioned: PositionedEvent[] = []

  for (const group of groups) {
    const totalColumns = group.length

    group.forEach((event, columnIndex) => {
      const position = calculateEventPosition(
        event,
        dayStart,
        minTime,
        maxTime,
        columnIndex,
        totalColumns
      )
      positioned.push({ event, position })
    })
  }

  return positioned
}

/**
 * Calculate now indicator position as percentage
 */
export function calculateNowIndicatorPosition(
  currentTime: Date,
  minTime: string,
  maxTime: string,
  date: Date
): number | null {
  if (!isToday(date)) return null

  const { hours: minHours, minutes: minMinutes } = parseTimeString(minTime)
  const { hours: maxHours, minutes: maxMinutes } = parseTimeString(maxTime)

  const gridStart = setTimeOnDate(date, minHours, minMinutes)
  const gridEnd = setTimeOnDate(date, maxHours, maxMinutes)

  if (currentTime < gridStart || currentTime > gridEnd) return null

  const gridDuration = gridEnd.getTime() - gridStart.getTime()
  const elapsed = currentTime.getTime() - gridStart.getTime()

  return (elapsed / gridDuration) * 100
}

/**
 * Generate a consistent color from a string (for events without explicit color)
 */
export function generateColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const h = Math.abs(hash % 360)
  const s = 65 + (hash % 20) // 65-85%
  const l = 45 + (hash % 15) // 45-60%

  return `hsl(${h}, ${s}%, ${l}%)`
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastColor(backgroundColor: string): string {
  // Handle HSL colors
  const hslMatch = backgroundColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (hslMatch) {
    const l = parseInt(hslMatch[3], 10)
    return l > 50 ? "#000000" : "#ffffff"
  }

  // Handle hex colors
  const hexMatch = backgroundColor.match(
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
  )
  if (hexMatch) {
    const r = parseInt(hexMatch[1], 16)
    const g = parseInt(hexMatch[2], 16)
    const b = parseInt(hexMatch[3], 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
  }

  return "#ffffff"
}
