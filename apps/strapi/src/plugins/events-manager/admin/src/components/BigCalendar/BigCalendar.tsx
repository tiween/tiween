/**
 * BigCalendar Component
 *
 * Main calendar component that orchestrates views, navigation, and state.
 * Supports controlled and uncontrolled modes for flexibility.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Box } from "@strapi/design-system"
import styled from "styled-components"

import type { BigCalendarProps, CalendarView, SlotDuration } from "./types"

import { DayView } from "./DayView"
import { NavigationBar } from "./NavigationBar"
import {
  addDays,
  generateTimeSlots,
  getEventsForDay,
  startOfWeek,
} from "./utils"
import { WeekView } from "./WeekView"

const CalendarContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`

const CalendarBody = styled(Box)<{ $minHeight?: string }>`
  overflow-y: auto;
  overflow-x: auto;
  min-height: ${({ $minHeight }) => $minHeight || "500px"};
  max-height: 70vh;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.neutral300};
    border-radius: ${({ theme }) => theme.borderRadius};

    &:hover {
      background-color: ${({ theme }) => theme.colors.neutral400};
    }
  }
`

export function BigCalendar({
  events = [],
  currentDate: controlledDate,
  onDateChange,
  view: controlledView,
  onViewChange,
  slotDuration: controlledSlotDuration,
  onSlotDurationChange,
  minTime = "08:00",
  maxTime = "24:00",
  onEventClick,
  onSlotClick,
  locale = "fr-FR",
  firstDayOfWeek = 1,
  minHeight,
}: BigCalendarProps) {
  // Internal state for uncontrolled mode
  const [internalDate, setInternalDate] = useState(() => new Date())
  const [internalView, setInternalView] = useState<CalendarView>("week")
  const [internalSlotDuration, setInternalSlotDuration] =
    useState<SlotDuration>(30)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Use controlled or internal state
  const date = controlledDate ?? internalDate
  const view = controlledView ?? internalView
  const slotDuration = controlledSlotDuration ?? internalSlotDuration

  // Update current time every minute for the now indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Generate time slots for the current date
  const slots = useMemo(
    () => generateTimeSlots(date, minTime, maxTime, slotDuration),
    [date, minTime, maxTime, slotDuration]
  )

  // Get events for the current day (day view) or all events (week view handles filtering)
  const dayEvents = useMemo(
    () => (view === "day" ? getEventsForDay(events, date) : events),
    [events, date, view]
  )

  // Navigation handlers
  const handleDateChange = useCallback(
    (newDate: Date) => {
      if (onDateChange) {
        onDateChange(newDate)
      } else {
        setInternalDate(newDate)
      }
    },
    [onDateChange]
  )

  const handleViewChange = useCallback(
    (newView: CalendarView) => {
      if (onViewChange) {
        onViewChange(newView)
      } else {
        setInternalView(newView)
      }
    },
    [onViewChange]
  )

  const handleSlotDurationChange = useCallback(
    (newDuration: SlotDuration) => {
      if (onSlotDurationChange) {
        onSlotDurationChange(newDuration)
      } else {
        setInternalSlotDuration(newDuration)
      }
    },
    [onSlotDurationChange]
  )

  const handlePrevious = useCallback(() => {
    const days = view === "day" ? 1 : 7
    handleDateChange(addDays(date, -days))
  }, [date, view, handleDateChange])

  const handleNext = useCallback(() => {
    const days = view === "day" ? 1 : 7
    handleDateChange(addDays(date, days))
  }, [date, view, handleDateChange])

  const handleToday = useCallback(() => {
    handleDateChange(new Date())
  }, [handleDateChange])

  return (
    <CalendarContainer>
      <NavigationBar
        currentDate={date}
        view={view}
        slotDuration={slotDuration}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={handleViewChange}
        onSlotDurationChange={handleSlotDurationChange}
        locale={locale}
        firstDayOfWeek={firstDayOfWeek}
      />

      <CalendarBody $minHeight={minHeight}>
        {view === "day" ? (
          <DayView
            date={date}
            events={dayEvents}
            slots={slots}
            slotDuration={slotDuration}
            minTime={minTime}
            maxTime={maxTime}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
            locale={locale}
            currentTime={currentTime}
          />
        ) : (
          <WeekView
            currentDate={date}
            events={events}
            slots={slots}
            slotDuration={slotDuration}
            minTime={minTime}
            maxTime={maxTime}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
            firstDayOfWeek={firstDayOfWeek}
            locale={locale}
            currentTime={currentTime}
          />
        )}
      </CalendarBody>
    </CalendarContainer>
  )
}
