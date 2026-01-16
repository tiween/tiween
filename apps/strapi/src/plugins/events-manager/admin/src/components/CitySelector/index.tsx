/**
 * CitySelector Component
 *
 * Two-step city selection: first select region, then city within that region.
 * Integrates with the geography plugin for location data.
 */

import { useEffect, useState } from "react"
import {
  Box,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system"

import type { City } from "../../hooks/useGeography"

import { useCities, useRegions } from "../../hooks/useGeography"

interface CitySelectorProps {
  /** Selected city ID */
  value: number | null
  /** Callback when city selection changes */
  onChange: (cityId: number | null, city: City | null) => void
  /** Disabled state */
  disabled?: boolean
  /** Error message */
  error?: string
}

export function CitySelector({
  value,
  onChange,
  disabled = false,
  error,
}: CitySelectorProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null)

  const {
    regions,
    isLoading: regionsLoading,
    error: regionsError,
  } = useRegions()
  const { cities, isLoading: citiesLoading } = useCities(selectedRegionId)

  // Find current city and set region when value changes externally
  useEffect(() => {
    if (value && cities.length > 0) {
      const currentCity = cities.find((c) => c.id === value)
      if (
        currentCity?.region?.id &&
        currentCity.region.id !== selectedRegionId
      ) {
        setSelectedRegionId(currentCity.region.id)
      }
    }
  }, [value, cities, selectedRegionId])

  // If we have a value but no region selected, try to find it from all cities
  useEffect(() => {
    if (value && !selectedRegionId && regions.length > 0) {
      // We need to find which region this city belongs to
      // This will trigger a cities fetch for each region until we find it
      // For now, let's just leave it - the user can re-select
    }
  }, [value, selectedRegionId, regions])

  const handleRegionChange = (regionIdStr: string) => {
    const regionId = regionIdStr ? parseInt(regionIdStr, 10) : null
    setSelectedRegionId(regionId)
    // Clear city selection when region changes
    onChange(null, null)
  }

  const handleCityChange = (cityIdStr: string) => {
    const cityId = cityIdStr ? parseInt(cityIdStr, 10) : null
    const selectedCity = cityId
      ? cities.find((c) => c.id === cityId) ?? null
      : null
    onChange(cityId, selectedCity)
  }

  const handleClear = () => {
    setSelectedRegionId(null)
    onChange(null, null)
  }

  if (regionsError) {
    return (
      <Box>
        <Typography textColor="danger600">
          Erreur de chargement des régions. Vérifiez que le plugin geography est
          configuré.
        </Typography>
      </Box>
    )
  }

  const selectedCity = value ? cities.find((c) => c.id === value) : null

  return (
    <Flex direction="column" gap={2}>
      {/* Region Selector */}
      <Box>
        <SingleSelect
          placeholder={
            regionsLoading ? "Chargement..." : "Sélectionner une région"
          }
          value={selectedRegionId ? String(selectedRegionId) : ""}
          onChange={handleRegionChange}
          disabled={disabled || regionsLoading}
          onClear={handleClear}
          size="M"
        >
          {regions.map((region) => (
            <SingleSelectOption key={region.id} value={String(region.id)}>
              {region.name}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Box>

      {/* City Selector - only shown when region is selected */}
      {selectedRegionId && (
        <Box>
          <SingleSelect
            placeholder={
              citiesLoading ? "Chargement..." : "Sélectionner une ville"
            }
            value={value ? String(value) : ""}
            onChange={handleCityChange}
            disabled={disabled || citiesLoading}
            error={error}
            size="M"
          >
            {cities.map((city) => (
              <SingleSelectOption key={city.id} value={String(city.id)}>
                {city.name}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Box>
      )}

      {/* Display selected location */}
      {selectedCity && (
        <Typography variant="pi" textColor="neutral600">
          📍 {selectedCity.name}
          {selectedCity.region && `, ${selectedCity.region.name}`}
        </Typography>
      )}

      {/* No regions message */}
      {!regionsLoading && regions.length === 0 && (
        <Typography variant="pi" textColor="warning600">
          Aucune région disponible. Veuillez d'abord importer les données
          géographiques.
        </Typography>
      )}
    </Flex>
  )
}
