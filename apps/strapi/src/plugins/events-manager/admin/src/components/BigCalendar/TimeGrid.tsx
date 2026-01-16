/**
 * TimeGrid Component
 *
 * Renders a grid of time slots with time axis labels.
 * Handles event positioning within the grid.
 */

import { Box, Typography } from "@strapi/design-system"
import styled from "styled-components"

import type {
  CalendarEvent,
  PositionedEvent,
  SlotDuration,
  TimeSlotData,
} from "./types"

import { EventBlock } from "./EventBlock"
import { NowIndicator } from "./NowIndicator"
import { TimeSlot } from "./TimeSlot"
import { SLOT_HEIGHTS } from "./types"
import { isToday, positionEventsForDay, startOfDay } from "./utils"

interface TimeGridProps {
  date: Date
  slots: TimeSlotData[]
  events: CalendarEvent[]
  slotDuration: SlotDuration
  minTime: string
  maxTime: string
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  showTimeAxis?: boolean
  currentTime?: Date
}

const GridContainer = styled(Box)`
  display: grid;
  grid-template-columns: auto 1fr;
  width: 100%;
`

const TimeAxisContainer = styled(Box)`
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
  min-width: 50px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
`

const SlotsContainer = styled(Box)`
  position: relative;
  display: flex;
  flex-direction: column;
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

export function TimeGrid({
  date,
  slots,
  events,
  slotDuration,
  minTime,
  maxTime,
  onSlotClick,
  onEventClick,
  showTimeAxis = true,
  currentTime,
}: TimeGridProps) {
  const slotHeight = SLOT_HEIGHTS[slotDuration]
  const dayStart = startOfDay(date)
  const isTodayDate = isToday(date)

  // Calculate positioned events for this day
  const positionedEvents: PositionedEvent[] = positionEventsForDay(
    events,
    dayStart,
    minTime,
    maxTime
  )

  return (
    <GridContainer>
      {/* Time Axis */}
      {showTimeAxis && (
        <TimeAxisContainer>
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
        </TimeAxisContainer>
      )}

      {/* Slots Column */}
      <SlotsContainer role="grid" aria-label="Grille horaire">
        {slots.map((slot, index) => (
          <SlotWrapper key={slot.label + index} $slotHeight={slotHeight}>
            <TimeSlot slot={slot} onClick={onSlotClick} isToday={isTodayDate} />
          </SlotWrapper>
        ))}

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
          {currentTime && isTodayDate && (
            <NowIndicator
              currentTime={currentTime}
              minTime={minTime}
              maxTime={maxTime}
              date={date}
            />
          )}
        </EventsOverlay>
      </SlotsContainer>
    </GridContainer>
  )
}
