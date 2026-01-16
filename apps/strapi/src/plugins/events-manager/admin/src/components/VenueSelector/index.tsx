/**
 * VenueSelector Component
 *
 * Async search dropdown for selecting a venue in event forms.
 * Shows venue name, city, and type badge in dropdown options.
 */

import { useCallback, useEffect, useState } from "react"
import {
  Badge,
  Box,
  Combobox,
  ComboboxOption,
  Flex,
  Typography,
} from "@strapi/design-system"
import { Cross, House } from "@strapi/icons"
import styled from "styled-components"
import { useDebounce } from "use-debounce"

import type { Venue, VenueStatus } from "../../hooks/useVenuesEnhanced"

import { useVenuesList } from "../../hooks/useVenuesEnhanced"

interface VenueSelectorProps {
  /** Selected venue documentId */
  value: string | null
  /** Callback when selection changes */
  onChange: (documentId: string | null, venue: Venue | null) => void
  /** Only show venues with these statuses (default: approved only) */
  statusFilter?: VenueStatus[]
  /** Disabled state */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: "S" | "M"
}

const SelectedVenueContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-radius: ${({ theme }) => theme.borderRadius};
`

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spaces[1]};
  background: none;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.neutral600};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral200};
    color: ${({ theme }) => theme.colors.neutral800};
  }
`

const TYPE_LABELS: Record<string, string> = {
  cinema: "Cinéma",
  theater: "Théâtre",
  "cultural-center": "Centre culturel",
  museum: "Musée",
  other: "Autre",
}

export function VenueSelector({
  value,
  onChange,
  statusFilter = ["approved"],
  disabled = false,
  placeholder = "Rechercher un lieu...",
  error,
  size = "M",
}: VenueSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch] = useDebounce(searchQuery, 300)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)

  // Fetch venues based on search
  const { venues, isLoading } = useVenuesList({
    search: debouncedSearch,
    status: statusFilter.length === 1 ? statusFilter[0] : undefined,
    pageSize: 20,
    enabled: isOpen || !!debouncedSearch,
  })

  // Filter by status if multiple statuses allowed
  const filteredVenues =
    statusFilter.length > 1
      ? venues.filter((v) => v.status && statusFilter.includes(v.status))
      : venues

  // Find selected venue when value changes
  useEffect(() => {
    if (value && !selectedVenue) {
      const found = venues.find((v) => v.documentId === value)
      if (found) {
        setSelectedVenue(found)
      }
    } else if (!value) {
      setSelectedVenue(null)
    }
  }, [value, venues, selectedVenue])

  const handleSelect = useCallback(
    (venueDocumentId: string) => {
      const venue = filteredVenues.find((v) => v.documentId === venueDocumentId)
      if (venue) {
        setSelectedVenue(venue)
        onChange(venue.documentId, venue)
        setSearchQuery("")
        setIsOpen(false)
      }
    },
    [filteredVenues, onChange]
  )

  const handleClear = useCallback(() => {
    setSelectedVenue(null)
    onChange(null, null)
    setSearchQuery("")
  }, [onChange])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    []
  )

  // If we have a selected venue, show it as a chip
  if (selectedVenue) {
    return (
      <SelectedVenueContainer>
        <House width={16} height={16} />
        <Flex direction="column" gap={0} flex="1">
          <Typography variant="pi" fontWeight="bold">
            {selectedVenue.name}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {selectedVenue.cityRef?.name || selectedVenue.city || ""}
            {selectedVenue.type &&
              ` • ${TYPE_LABELS[selectedVenue.type] || selectedVenue.type}`}
          </Typography>
        </Flex>
        {!disabled && (
          <ClearButton
            onClick={handleClear}
            type="button"
            aria-label="Effacer la sélection"
          >
            <Cross width={12} height={12} />
          </ClearButton>
        )}
      </SelectedVenueContainer>
    )
  }

  return (
    <Box>
      <Combobox
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleSelect}
        onInputChange={handleInputChange}
        onOpenChange={setIsOpen}
        loading={isLoading}
        disabled={disabled}
        error={error}
        size={size}
        noOptionsMessage={() =>
          debouncedSearch
            ? "Aucun lieu trouvé"
            : "Commencez à taper pour rechercher"
        }
      >
        {filteredVenues.map((venue) => (
          <ComboboxOption key={venue.documentId} value={venue.documentId}>
            <Flex gap={2} alignItems="center">
              <House width={16} height={16} />
              <Flex direction="column" gap={0}>
                <Typography variant="pi" fontWeight="bold">
                  {venue.name}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {venue.cityRef?.name ||
                    venue.city ||
                    "Emplacement non défini"}
                  {venue.type && ` • ${TYPE_LABELS[venue.type]}`}
                </Typography>
              </Flex>
            </Flex>
          </ComboboxOption>
        ))}
      </Combobox>
    </Box>
  )
}
