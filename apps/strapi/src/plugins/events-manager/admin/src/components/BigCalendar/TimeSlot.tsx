/**
 * TimeSlot Component
 *
 * Individual time slot cell with hover/click states.
 * Used within TimeGrid for both day and week views.
 */

import { Box } from "@strapi/design-system"
import styled from "styled-components"

import type { TimeSlotData } from "./types"

interface TimeSlotProps {
  slot: TimeSlotData
  onClick?: (date: Date) => void
  isToday?: boolean
  children?: React.ReactNode
}

const SlotContainer = styled(Box)<{
  $isToday?: boolean
  $isCurrentSlot?: boolean
}>`
  position: relative;
  min-height: inherit;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  background-color: ${({ theme, $isToday, $isCurrentSlot }) => {
    if ($isCurrentSlot) return theme.colors.primary100
    if ($isToday) return theme.colors.primary100 + "40" // 25% opacity
    return theme.colors.neutral0
  }};
  cursor: pointer;
  transition: background-color 150ms ease;

  &:hover {
    background-color: ${({ theme, $isToday }) =>
      $isToday ? theme.colors.primary200 : theme.colors.neutral100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary500};
    outline-offset: -2px;
    z-index: 1;
  }
`

export function TimeSlot({ slot, onClick, isToday, children }: TimeSlotProps) {
  const handleClick = () => {
    onClick?.(slot.time)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.(slot.time)
    }
  }

  return (
    <SlotContainer
      role="gridcell"
      tabIndex={0}
      $isToday={isToday}
      $isCurrentSlot={slot.isCurrentSlot}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${slot.label}${isToday ? ", aujourd'hui" : ""}`}
    >
      {children}
    </SlotContainer>
  )
}
