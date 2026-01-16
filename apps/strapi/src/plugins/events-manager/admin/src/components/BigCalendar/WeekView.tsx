/**
 * WeekView Component
 *
 * 7-day calendar view with shared time axis and day columns.
 */

import { Box, Typography } from "@strapi/design-system"
import styled from "styled-components"

import type { CalendarEvent, SlotDuration, TimeSlotData } from "./types"

import { EventBlock } from "./EventBlock"
import { NowIndicator } from "./NowIndicator"
import { TimeSlot } from "./TimeSlot"
import { SLOT_HEIGHTS } from "./types"
import {
  addDays,
  formatTime,
  getEventsForDay,
  isToday,
  positionEventsForDay,
  startOfDay,
  startOfWeek,
} from "./utils"

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  slots: TimeSlotData[]
  slotDuration: SlotDuration
  minTime: string
  maxTime: string
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  firstDayOfWeek?: number
  locale?: string
  currentTime?: Date
}

const WeekViewContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-x: auto;
`

const HeaderRow = styled(Box)`
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  background-color: ${({ theme }) => theme.colors.neutral100};
  position: sticky;
  top: 0;
  z-index: 10;
`

const TimeAxisHeader = styled(Box)`
  padding: ${({ theme }) => theme.spaces[2]};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`

const DayHeaderCell = styled(Box)<{ $isToday?: boolean }>`
  padding: ${({ theme }) => theme.spaces[2]};
  text-align: center;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  background-color: ${({ theme, $isToday }) =>
    $isToday ? theme.colors.primary100 : theme.colors.neutral100};

  &:last-child {
    border-right: none;
  }
`

const DayName = styled(Typography)<{ $isToday?: boolean }>`
  text-transform: uppercase;
  font-size: 0.7rem;
  color: ${({ theme, $isToday }) =>
    $isToday ? theme.colors.primary600 : theme.colors.neutral600};
`

const DayNumber = styled(Typography)<{ $isToday?: boolean }>`
  font-size: 1.25rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, $isToday }) =>
    $isToday ? theme.colors.primary600 : theme.colors.neutral800};
`

const GridBody = styled(Box)`
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
`

const TimeAxisColumn = styled(Box)`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`

const TimeLabel = styled(Box)<{ $slotHeight: number }>`
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: ${({ theme }) => theme.spaces[2]};
  padding-top: 2px;
  min-height: ${({ $slotHeight }) => $slotHeight}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
`

const DayColumn = styled(Box)<{ $isToday?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  background-color: ${({ theme, $isToday }) =>
    $isToday ? theme.colors.primary100 + "40" : theme.colors.neutral0};

  &:last-child {
    border-right: none;
  }
`

const SlotWrapper = styled(Box)<{ $slotHeight: number }>`
  min-height: ${({ $slotHeight }) => $slotHeight}px;
`

const EventsOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`

const EventWrapper = styled(Box)`
  pointer-events: auto;
`

export function WeekView({
  currentDate,
  events,
  slots,
  slotDuration,
  minTime,
  maxTime,
  onSlotClick,
  onEventClick,
  firstDayOfWeek = 1,
  locale = "fr-FR",
  currentTime,
}: WeekViewProps) {
  const slotHeight = SLOT_HEIGHTS[slotDuration]
  const weekStart = startOfWeek(currentDate, firstDayOfWeek)

  // Generate 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date,
      dayName: date.toLocaleDateString(locale, { weekday: "short" }),
      dayNumber: date.getDate().toString(),
      isToday: isToday(date),
      events: getEventsForDay(events, date),
    }
  })

  return (
    <WeekViewContainer>
      {/* Header Row */}
      <HeaderRow>
        <TimeAxisHeader />
        {days.map((day) => (
          <DayHeaderCell key={day.date.toISOString()} $isToday={day.isToday}>
            <DayName $isToday={day.isToday}>{day.dayName}</DayName>
            <DayNumber $isToday={day.isToday}>{day.dayNumber}</DayNumber>
          </DayHeaderCell>
        ))}
      </HeaderRow>

      {/* Grid Body */}
      <GridBody>
        {/* Time Axis */}
        <TimeAxisColumn>
          {slots.map((slot, index) => (
            <TimeLabel key={slot.label + index} $slotHeight={slotHeight}>
              <Typography
                variant="sigma"
                textColor="neutral600"
                style={{ fontSize: "0.75rem" }}
              >
                {slot.label}
              </Typography>
            </TimeLabel>
          ))}
        </TimeAxisColumn>

        {/* Day Columns */}
        {days.map((day) => {
          const dayStart = startOfDay(day.date)
          const positionedEvents = positionEventsForDay(
            day.events,
            dayStart,
            minTime,
            maxTime
          )

          return (
            <DayColumn key={day.date.toISOString()} $isToday={day.isToday}>
              {/* Time Slots */}
              {slots.map((slot, index) => {
                // Create a slot with the correct date for this column
                const slotDate = new Date(day.date)
                slotDate.setHours(
                  slot.time.getHours(),
                  slot.time.getMinutes(),
                  0,
                  0
                )

                const columnSlot = {
                  ...slot,
                  time: slotDate,
                  isCurrentSlot: day.isToday && slot.isCurrentSlot,
                }

                return (
                  <SlotWrapper
                    key={slot.label + index}
                    $slotHeight={slotHeight}
                  >
                    <TimeSlot
                      slot={columnSlot}
                      onClick={onSlotClick}
                      isToday={day.isToday}
                    />
                  </SlotWrapper>
                )
              })}

              {/* Events Overlay */}
              <EventsOverlay>
                {positionedEvents.map(({ event, position }) => (
                  <EventWrapper
                    key={event.id}
                    style={{
                      position: "absolute",
                      top: `${position.top}%`,
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      height: `${position.height}%`,
                      padding: "0 2px",
                      boxSizing: "border-box",
                    }}
                  >
                    <EventBlock
                      event={event}
                      position={position}
                      onClick={onEventClick}
                    />
                  </EventWrapper>
                ))}

                {/* Now Indicator */}
                {currentTime && day.isToday && (
                  <NowIndicator
                    currentTime={currentTime}
                    minTime={minTime}
                    maxTime={maxTime}
                    date={day.date}
                  />
                )}
              </EventsOverlay>
            </DayColumn>
          )
        })}
      </GridBody>
    </WeekViewContainer>
  )
}
