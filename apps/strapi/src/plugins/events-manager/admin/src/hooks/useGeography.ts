/**
 * Geography Hooks
 *
 * Hooks for fetching regions and cities from the geography plugin.
 * Used by CitySelector component for venue location assignment.
 */

import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

/** Region from geography plugin */
export interface Region {
  id: number
  documentId: string
  name: string
  slug?: string
  code?: string
}

/** City from geography plugin */
export interface City {
  id: number
  documentId: string
  name: string
  slug?: string
  latitude?: number
  longitude?: number
  region?: Region
}

interface RegionsResponse {
  results: Region[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

interface CitiesResponse {
  results: City[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

/**
 * Hook for fetching all regions
 */
export function useRegions() {
  const { get } = useFetchClient()
  const [regions, setRegions] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRegions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await get<RegionsResponse>(
        "/content-manager/collection-types/plugin::geography.region",
        {
          params: {
            page: 1,
            pageSize: 100,
            sort: "name:asc",
          },
        }
      )

      setRegions(response.data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setRegions([])
    } finally {
      setIsLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchRegions()
  }, [fetchRegions])

  return {
    regions,
    isLoading,
    error,
    refetch: fetchRegions,
  }
}

/**
 * Hook for fetching cities, optionally filtered by region
 */
export function useCities(regionId?: number | null) {
  const { get } = useFetchClient()
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params: Record<string, unknown> = {
        page: 1,
        pageSize: 200,
        sort: "name:asc",
        populate: ["region"],
      }

      if (regionId) {
        params.filters = { region: { id: regionId } }
      }

      const response = await get<CitiesResponse>(
        "/content-manager/collection-types/plugin::geography.city",
        { params }
      )

      setCities(response.data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setCities([])
    } finally {
      setIsLoading(false)
    }
  }, [get, regionId])

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  return {
    cities,
    isLoading,
    error,
    refetch: fetchCities,
  }
}

/**
 * Hook for fetching a single city by ID
 */
export function useCity(cityId: number | null) {
  const { get } = useFetchClient()
  const [city, setCity] = useState<City | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCity = useCallback(async () => {
    if (!cityId) {
      setCity(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Find the city by ID from the list
      const response = await get<CitiesResponse>(
        "/content-manager/collection-types/plugin::geography.city",
        {
          params: {
            filters: { id: cityId },
            populate: ["region"],
          },
        }
      )

      const foundCity = response.data.results?.[0] ?? null
      setCity(foundCity)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setCity(null)
    } finally {
      setIsLoading(false)
    }
  }, [get, cityId])

  useEffect(() => {
    fetchCity()
  }, [fetchCity])

  return {
    city,
    isLoading,
    error,
    refetch: fetchCity,
  }
}
