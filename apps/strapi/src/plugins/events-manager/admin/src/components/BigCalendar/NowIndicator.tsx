/**
 * NowIndicator Component
 *
 * Visual line showing the current time with pulse animation.
 * Positioned absolutely within the time grid.
 */

import { Box } from "@strapi/design-system"
import styled, { keyframes } from "styled-components"

import { calculateNowIndicatorPosition } from "./utils"

interface NowIndicatorProps {
  currentTime: Date
  minTime: string
  maxTime: string
  date: Date
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`

const IndicatorLine = styled(Box)`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: ${({ theme }) => theme.colors.danger600};
  box-shadow: 0 0 8px ${({ theme }) => theme.colors.danger500};
  animation: ${pulse} 2s ease-in-out infinite;
  z-index: 5;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.danger600};
  }
`

export function NowIndicator({
  currentTime,
  minTime,
  maxTime,
  date,
}: NowIndicatorProps) {
  const position = calculateNowIndicatorPosition(
    currentTime,
    minTime,
    maxTime,
    date
  )

  if (position === null) return null

  return (
    <IndicatorLine
      style={{ top: `${position}%` }}
      role="presentation"
      aria-hidden="true"
    />
  )
}
