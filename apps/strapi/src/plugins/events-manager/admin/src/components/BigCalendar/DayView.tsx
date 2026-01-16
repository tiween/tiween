/**
 * DayView Component
 *
 * Single day calendar view with time grid and time axis.
 */

import { Box, Typography } from "@strapi/design-system"
import styled from "styled-components"

import type { CalendarEvent, SlotDuration, TimeSlotData } from "./types"

import { TimeGrid } from "./TimeGrid"
import { formatDateHeader } from "./utils"

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  slots: TimeSlotData[]
  slotDuration: SlotDuration
  minTime: string
  maxTime: string
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  locale?: string
  currentTime?: Date
}

const DayViewContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const DayHeader = styled(Box)`
  padding: ${({ theme }) => theme.spaces[3]};
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  text-align: center;
`

export function DayView({
  date,
  events,
  slots,
  slotDuration,
  minTime,
  maxTime,
  onSlotClick,
  onEventClick,
  locale = "fr-FR",
  currentTime,
}: DayViewProps) {
  return (
    <DayViewContainer>
      <DayHeader>
        <Typography
          variant="delta"
          fontWeight="semiBold"
          textColor="neutral800"
        >
          {formatDateHeader(date, locale)}
        </Typography>
      </DayHeader>

      <TimeGrid
        date={date}
        slots={slots}
        events={events}
        slotDuration={slotDuration}
        minTime={minTime}
        maxTime={maxTime}
        onSlotClick={onSlotClick}
        onEventClick={onEventClick}
        showTimeAxis={true}
        currentTime={currentTime}
      />
    </DayViewContainer>
  )
}
