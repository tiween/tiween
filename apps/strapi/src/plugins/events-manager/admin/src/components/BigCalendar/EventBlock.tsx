/**
 * EventBlock Component
 *
 * Styled event display block with title, time, and hover effects.
 * Positioned absolutely within the time grid.
 */

import { Box, Typography } from "@strapi/design-system"
import styled from "styled-components"

import type { CalendarEvent, EventPosition } from "./types"

import { formatTime, generateColorFromString, getContrastColor } from "./utils"

interface EventBlockProps {
  event: CalendarEvent
  position: EventPosition
  onClick?: (event: CalendarEvent) => void
}

const EventContainer = styled(Box)<{ $bgColor: string; $textColor: string }>`
  height: 100%;
  min-height: 20px;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  background-color: ${({ $bgColor }) => $bgColor};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 100ms ease,
    box-shadow 100ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.filterShadow};
    z-index: 10;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary500};
    outline-offset: 1px;
  }
`

const EventTitle = styled(Typography)<{ $textColor: string }>`
  color: ${({ $textColor }) => $textColor};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EventTime = styled(Typography)<{ $textColor: string }>`
  color: ${({ $textColor }) => $textColor};
  opacity: 0.9;
  font-size: 0.7rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export function EventBlock({ event, position, onClick }: EventBlockProps) {
  const bgColor = event.color || generateColorFromString(event.title)
  const textColor = event.textColor || getContrastColor(bgColor)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(event)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      onClick?.(event)
    }
  }

  const startTime = formatTime(new Date(event.start))
  const endTime = formatTime(new Date(event.end))

  // Only show full content if we have enough height
  const isCompact = position.height < 3 // Less than 3% height

  return (
    <EventContainer
      role="button"
      tabIndex={0}
      $bgColor={bgColor}
      $textColor={textColor}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${event.title}, ${startTime} - ${endTime}`}
    >
      <EventTitle $textColor={textColor}>{event.title}</EventTitle>
      {!isCompact && (
        <EventTime $textColor={textColor}>
          {startTime} - {endTime}
        </EventTime>
      )}
    </EventContainer>
  )
}
