/**
 * NavigationBar Component
 *
 * Calendar navigation controls: Prev/Next, Today, View switcher, Slot duration.
 */

import {
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system"
import { ArrowLeft, ArrowRight } from "@strapi/icons"
import styled from "styled-components"

import type { CalendarView, SlotDuration } from "./types"

import { SLOT_OPTIONS } from "./types"
import {
  addDays,
  formatDateHeader,
  formatWeekRange,
  startOfWeek,
} from "./utils"

interface NavigationBarProps {
  currentDate: Date
  view: CalendarView
  slotDuration: SlotDuration
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  onSlotDurationChange: (duration: SlotDuration) => void
  locale?: string
  firstDayOfWeek?: number
}

const NavContainer = styled(Flex)`
  padding: ${({ theme }) => theme.spaces[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  background-color: ${({ theme }) => theme.colors.neutral0};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spaces[2]};
`

const NavGroup = styled(Flex)`
  gap: ${({ theme }) => theme.spaces[2]};
`

const DateTitle = styled(Typography)`
  min-width: 200px;
  text-align: center;
`

const ViewButton = styled(Button)<{ $isActive?: boolean }>`
  ${({ $isActive, theme }) =>
    $isActive &&
    `
    background-color: ${theme.colors.primary100};
    border-color: ${theme.colors.primary600};
    color: ${theme.colors.primary600};
  `}
`

export function NavigationBar({
  currentDate,
  view,
  slotDuration,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onSlotDurationChange,
  locale = "fr-FR",
  firstDayOfWeek = 1,
}: NavigationBarProps) {
  // Calculate the date range title
  const getDateTitle = () => {
    if (view === "day") {
      return formatDateHeader(currentDate, locale)
    }
    const weekStart = startOfWeek(currentDate, firstDayOfWeek)
    const weekEnd = addDays(weekStart, 6)
    return formatWeekRange(weekStart, weekEnd, locale)
  }

  return (
    <NavContainer justifyContent="space-between" alignItems="center">
      {/* Left: Navigation buttons */}
      <NavGroup alignItems="center">
        <Button
          variant="tertiary"
          onClick={onPrevious}
          aria-label="Période précédente"
          startIcon={<ArrowLeft />}
        />
        <Button variant="tertiary" onClick={onToday}>
          Aujourd'hui
        </Button>
        <Button
          variant="tertiary"
          onClick={onNext}
          aria-label="Période suivante"
          startIcon={<ArrowRight />}
        />
      </NavGroup>

      {/* Center: Date title */}
      <DateTitle variant="beta" fontWeight="semiBold" textColor="neutral800">
        {getDateTitle()}
      </DateTitle>

      {/* Right: View switcher and slot duration */}
      <NavGroup alignItems="center">
        {/* View Switcher */}
        <NavGroup>
          <ViewButton
            variant="tertiary"
            size="S"
            $isActive={view === "day"}
            onClick={() => onViewChange("day")}
          >
            Jour
          </ViewButton>
          <ViewButton
            variant="tertiary"
            size="S"
            $isActive={view === "week"}
            onClick={() => onViewChange("week")}
          >
            Semaine
          </ViewButton>
        </NavGroup>

        {/* Slot Duration Selector */}
        <Box width="100px">
          <SingleSelect
            value={String(slotDuration)}
            onChange={(value: string) =>
              onSlotDurationChange(Number(value) as SlotDuration)
            }
            size="S"
            aria-label="Durée des créneaux"
          >
            {SLOT_OPTIONS.map((option) => (
              <SingleSelectOption
                key={option.value}
                value={String(option.value)}
              >
                {option.label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Box>
      </NavGroup>
    </NavContainer>
  )
}
