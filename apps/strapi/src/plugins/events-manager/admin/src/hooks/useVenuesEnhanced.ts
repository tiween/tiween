/**
 * Enhanced Venues Hooks
 *
 * Provides comprehensive venue management with filtering, pagination,
 * single venue fetching, and CRUD mutations.
 */

import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

const VENUE_UID = "plugin::venues.venue"
const VENUE_CM_PATH = `/content-manager/collection-types/${VENUE_UID}`

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

      const response = await get<VenuesResponse>(VENUE_CM_PATH, {
        params: {
          page,
          pageSize,
          sort,
          populate: ["logo", "cityRef", "cityRef.region"],
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        },
      })

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
 * WRITE HOOKS REMOVED (story 2D.2).
 *
 * `useVenue`, `useVenueMutations` and the `VenueInput` type used to live here
 * and wrote venues through the built-in content-manager REST API — bypassing
 * the venues plugin's Zod validation, its error CODES and its tenant scoping.
 * The venue create/edit/delete path is now the venues plugin's own admin API
 * (`plugins/venues/admin/src/hooks/useVenuesAdmin.ts`), and 2D's sequencing
 * rule is that it exists ONCE. What remains here is the READ this plugin still
 * needs: `useVenuesList`, which backs `VenueSelector` (picking a venue is not
 * editing one).
 */
