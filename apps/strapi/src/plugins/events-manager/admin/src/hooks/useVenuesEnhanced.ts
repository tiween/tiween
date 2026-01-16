/**
 * Enhanced Venues Hooks
 *
 * Provides comprehensive venue management with filtering, pagination,
 * single venue fetching, and CRUD mutations.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

/** Venue status options */
export type VenueStatus = "pending" | "approved" | "suspended"

/** Venue type options */
export type VenueType =
  | "cinema"
  | "theater"
  | "cultural-center"
  | "museum"
  | "other"

/** City reference from geography plugin */
export interface CityRef {
  id: number
  documentId: string
  name: string
  slug?: string
  region?: {
    id: number
    documentId: string
    name: string
  }
}

/** Full venue interface */
export interface Venue {
  id: number
  documentId: string
  name: string
  slug: string
  description?: string
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website?: string
  type?: VenueType
  capacity?: number
  status?: VenueStatus
  logo?: {
    id: number
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  }
  images?: Array<{
    id: number
    url: string
  }>
  cityRef?: CityRef
  manager?: {
    id: number
    username: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

/** Pagination info */
export interface Pagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

/** Venues list response */
interface VenuesResponse {
  results: Venue[]
  pagination: Pagination
}

/** Options for useVenuesList hook */
export interface UseVenuesListOptions {
  page?: number
  pageSize?: number
  search?: string
  status?: VenueStatus | ""
  type?: VenueType | ""
  cityId?: number | null
  sort?: string
  enabled?: boolean
}

/**
 * Hook for fetching paginated/filtered venues list
 */
export function useVenuesList(options: UseVenuesListOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    status = "",
    type = "",
    cityId = null,
    sort = "name:asc",
    enabled = true,
  } = options

  const { get } = useFetchClient()
  const [venues, setVenues] = useState<Venue[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchVenues = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const filters: Record<string, unknown> = {}

      if (search) {
        filters["$or"] = [
          { name: { $containsi: search } },
          { address: { $containsi: search } },
        ]
      }

      if (status) {
        filters["status"] = status
      }

      if (type) {
        filters["type"] = type
      }

      if (cityId) {
        filters["cityRef"] = { id: cityId }
      }

      const response = await get<VenuesResponse>(
        "/content-manager/collection-types/plugin::events-manager.venue",
        {
          params: {
            page,
            pageSize,
            sort,
            populate: ["logo", "cityRef", "cityRef.region"],
            filters: Object.keys(filters).length > 0 ? filters : undefined,
          },
        }
      )

      setVenues(response.data.results ?? [])
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setVenues([])
    } finally {
      setIsLoading(false)
    }
  }, [get, page, pageSize, search, status, type, cityId, sort, enabled])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  return {
    venues,
    pagination,
    isLoading,
    error,
    refetch: fetchVenues,
  }
}

/**
 * Hook for fetching a single venue with all relations
 */
export function useVenue(documentId: string | null) {
  const { get } = useFetchClient()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchVenue = useCallback(async () => {
    if (!documentId) {
      setVenue(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await get<{ data: Venue }>(
        `/content-manager/collection-types/plugin::events-manager.venue/${documentId}`,
        {
          params: {
            populate: [
              "logo",
              "images",
              "cityRef",
              "cityRef.region",
              "manager",
              "links",
            ],
          },
        }
      )

      setVenue(response.data.data ?? response.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setVenue(null)
    } finally {
      setIsLoading(false)
    }
  }, [get, documentId])

  useEffect(() => {
    fetchVenue()
  }, [fetchVenue])

  return {
    venue,
    isLoading,
    error,
    refetch: fetchVenue,
  }
}

/** Input data for creating/updating a venue */
export interface VenueInput {
  name: string
  slug?: string
  description?: string
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website?: string
  type?: VenueType
  capacity?: number
  status?: VenueStatus
  logo?: number | null
  images?: number[]
  cityRef?: number | null
  manager?: number | null
}

/**
 * Hook for venue mutations (create, update, delete, bulk operations)
 */
export function useVenueMutations() {
  const { get, post, put, del } = useFetchClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createVenue = useCallback(
    async (data: VenueInput): Promise<Venue | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await post<{ data: Venue }>(
          "/content-manager/collection-types/plugin::events-manager.venue",
          { data }
        )
        return response.data.data ?? response.data
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [post]
  )

  const updateVenue = useCallback(
    async (
      documentId: string,
      data: Partial<VenueInput>
    ): Promise<Venue | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await put<{ data: Venue }>(
          `/content-manager/collection-types/plugin::events-manager.venue/${documentId}`,
          { data }
        )
        return response.data.data ?? response.data
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [put]
  )

  const deleteVenue = useCallback(
    async (documentId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        await del(
          `/content-manager/collection-types/plugin::events-manager.venue/${documentId}`
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [del]
  )

  const bulkUpdateStatus = useCallback(
    async (documentIds: string[], status: VenueStatus): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // Update each venue sequentially
        // Note: Could be optimized with a custom bulk endpoint
        for (const documentId of documentIds) {
          await put(
            `/content-manager/collection-types/plugin::events-manager.venue/${documentId}`,
            { data: { status } }
          )
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [put]
  )

  const bulkDelete = useCallback(
    async (
      documentIds: string[]
    ): Promise<{ success: string[]; failed: string[] }> => {
      setIsLoading(true)
      setError(null)

      const success: string[] = []
      const failed: string[] = []

      try {
        for (const documentId of documentIds) {
          try {
            await del(
              `/content-manager/collection-types/plugin::events-manager.venue/${documentId}`
            )
            success.push(documentId)
          } catch {
            failed.push(documentId)
          }
        }
      } finally {
        setIsLoading(false)
      }

      return { success, failed }
    },
    [del]
  )

  /**
   * Check if a venue has associated showtimes
   * Returns the count of showtimes for the venue
   */
  const checkVenueShowtimes = useCallback(
    async (documentId: string): Promise<number> => {
      try {
        // First get the venue's id from documentId
        const venueResponse = await get<{ data: { id: number } }>(
          `/content-manager/collection-types/plugin::events-manager.venue/${documentId}`,
          { params: { fields: ["id"] } }
        )
        const venueId = venueResponse.data.data?.id ?? venueResponse.data?.id

        if (!venueId) return 0

        // Count showtimes for this venue
        const response = await get<{ pagination: { total: number } }>(
          "/content-manager/collection-types/plugin::events-manager.showtime",
          {
            params: {
              pageSize: 1,
              filters: { venue: { id: venueId } },
            },
          }
        )

        return response.data.pagination?.total ?? 0
      } catch {
        return 0
      }
    },
    [get]
  )

  return {
    createVenue,
    updateVenue,
    deleteVenue,
    bulkUpdateStatus,
    bulkDelete,
    checkVenueShowtimes,
    isLoading,
    error,
  }
}
