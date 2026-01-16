/**
 * VenueCard Component
 *
 * Compact venue display with logo, name, city, type badge, and capacity.
 * Used in venue lists and selectors.
 */

import { Badge, Box, Flex, Typography } from "@strapi/design-system"
import { House } from "@strapi/icons"
import styled from "styled-components"

import type { Venue, VenueType } from "../../hooks/useVenuesEnhanced"

import { StatusBadge } from "../StatusBadge"

interface VenueCardProps {
  venue: Venue
  /** Show status badge */
  showStatus?: boolean
  /** Compact mode for dropdowns */
  compact?: boolean
  /** Click handler */
  onClick?: () => void
}

const CardContainer = styled(Box)<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[3]};
  padding: ${({ theme }) => theme.spaces[2]};
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.neutral0};
  transition: background-color 150ms ease;

  ${({ $clickable, theme }) =>
    $clickable &&
    `
    cursor: pointer;
    &:hover {
      background-color: ${theme.colors.neutral100};
    }
  `}
`

const LogoContainer = styled(Box)<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.neutral100};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const TYPE_CONFIG: Record<VenueType, { label: string; color: string }> = {
  cinema: { label: "Cinéma", color: "primary" },
  theater: { label: "Théâtre", color: "secondary" },
  "cultural-center": { label: "Centre culturel", color: "alternative" },
  museum: { label: "Musée", color: "warning" },
  other: { label: "Autre", color: "neutral" },
}

export function VenueCard({
  venue,
  showStatus = false,
  compact = false,
  onClick,
}: VenueCardProps) {
  const logoSize = compact ? 32 : 48
  const logoUrl = venue.logo?.formats?.thumbnail?.url || venue.logo?.url

  const typeConfig = venue.type ? TYPE_CONFIG[venue.type] : null

  const cityName = venue.cityRef?.name || venue.city || null
  const regionName = venue.cityRef?.region?.name || venue.region || null
  const locationText = cityName
    ? regionName
      ? `${cityName}, ${regionName}`
      : cityName
    : "Emplacement non défini"

  return (
    <CardContainer $clickable={!!onClick} onClick={onClick}>
      {/* Logo */}
      <LogoContainer $size={logoSize}>
        {logoUrl ? (
          <LogoImage src={logoUrl} alt={venue.name} />
        ) : (
          <House
            width={logoSize * 0.5}
            height={logoSize * 0.5}
            color="neutral500"
          />
        )}
      </LogoContainer>

      {/* Info */}
      <Flex direction="column" gap={1} flex="1" style={{ minWidth: 0 }}>
        <Flex gap={2} alignItems="center">
          <Typography
            variant={compact ? "pi" : "omega"}
            fontWeight="bold"
            textColor="neutral800"
            ellipsis
          >
            {venue.name}
          </Typography>
          {typeConfig && (
            <Badge
              size="S"
              backgroundColor={`${typeConfig.color}100`}
              textColor={`${typeConfig.color}700`}
            >
              {typeConfig.label}
            </Badge>
          )}
        </Flex>

        <Flex gap={2} alignItems="center">
          <Typography variant="pi" textColor="neutral600" ellipsis>
            {locationText}
          </Typography>
          {venue.capacity && !compact && (
            <Typography variant="pi" textColor="neutral500">
              • {venue.capacity} places
            </Typography>
          )}
        </Flex>
      </Flex>

      {/* Status */}
      {showStatus && venue.status && (
        <StatusBadge status={venue.status} size="S" />
      )}
    </CardContainer>
  )
}

/** Type options for filter dropdowns */
export const VENUE_TYPE_OPTIONS: { value: VenueType | ""; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "cinema", label: "Cinéma" },
  { value: "theater", label: "Théâtre" },
  { value: "cultural-center", label: "Centre culturel" },
  { value: "museum", label: "Musée" },
  { value: "other", label: "Autre" },
]
