/**
 * Data hooks for the venues-plugin admin CRUD API (Story 2D.2).
 *
 * Every call targets the plugin's OWN admin routes
 * (`/venues/admin/venues…`, see `server/src/routes/index.ts`) — never the
 * built-in content-manager REST API the events-manager hooks used, which
 * bypassed the plugin's Zod validation, its error CODES and its tenant scoping
 * entirely.
 *
 * Responses are consumed AS-IS: the Strapi v5 `{ data, meta }` envelope with
 * the fields flat on each entry. Nothing here remaps a row (project rule: never
 * transform Strapi responses).
 *
 * WHY NOT TanStack Query, which the story names: `@tanstack/react-query` is not
 * a dependency of `apps/strapi`, and the Strapi admin does not re-export its
 * own copy through `@strapi/strapi/admin` — adding a second QueryClient into
 * the admin bundle to satisfy the letter of the note would be a heavier change
 * than the story's own guidance allows ("data hooks follow the existing
 * `useVenuesEnhanced` shape", handoff/ds-component-binding.md). The shape here
 * is exactly that: `useVenuesList` / `useVenue` / `useVenueMutations`, with an
 * explicit `refetch` the mutations call (confirm → mutate → refetch, no
 * optimistic delete).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

import type { ApiError } from "../utils/errors"

import { parseApiError } from "../utils/errors"

/** Base path of the plugin's admin CRUD routes. */
export const VENUES_ADMIN_PATH = "/venues/admin/venues"

export type VenueStatus = "pending" | "approved" | "suspended"

export type VenueType =
  | "cinema"
  | "theater"
  | "cultural-center"
  | "museum"
  | "other"

export interface VenueCityRef {
  id?: number
  documentId: string
  name?: string
  slug?: string
}

export interface VenueMedia {
  id: number
  url: string
  name?: string
  formats?: { thumbnail?: { url: string } }
}

export interface VenueGeo {
  latitude: number
  longitude: number
}

/** A venue row as the admin API returns it (Document Service shape). */
export interface Venue {
  id?: number
  documentId: string
  name: string
  slug?: string
  description?: string | null
  address?: string | null
  cityRef?: VenueCityRef | null
  geo?: VenueGeo | null
  phone?: string | null
  email?: string | null
  website?: string | null
  type?: VenueType
  status?: VenueStatus
  capacity?: number | null
  logo?: VenueMedia | null
  images?: VenueMedia[]
  manager?: { id?: number; username?: string; email?: string } | null
  createdAt?: string
  updatedAt?: string
}

export interface Pagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

/** The write payload — `cityRef` is a documentId, `geo` an object, per AC 9. */
export interface VenueInput {
  name?: string
  slug?: string
  description?: string | null
  address?: string | null
  cityRef?: string | null
  geo?: VenueGeo | null
  phone?: string | null
  email?: string | null
  website?: string | null
  type?: VenueType
  status?: VenueStatus
  capacity?: number | null
  /**
   * The owning `plugin::users-permissions.user` **id** (the form
   * `services/registration.ts` writes), or `null` to unlink. Writable by a
   * `manage-all` caller only — the server refuses it from anyone else.
   */
  manager?: number | null
}

export interface UseVenuesListOptions {
  page?: number
  pageSize?: number
  search?: string
  status?: VenueStatus | ""
  type?: VenueType | ""
  city?: string
  sortField?: string
  sortOrder?: "asc" | "desc"
  /**
   * `false` skips the request entirely (default `true`). Used to keep a caller
   * without `plugin::venues.read` from firing a read that can only 403 — a
   * 403-driven empty table reads as "there are no venues".
   */
  enabled?: boolean
}

interface ListResponse {
  data: Venue[]
  meta: { pagination: Pagination }
}

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  pageCount: 0,
  total: 0,
}

/**
 * Paginated / filtered venues list.
 *
 * Blank filter values are OMITTED rather than sent as `""`: the server treats a
 * blank param as absent anyway, and leaving them out keeps the request URL (and
 * therefore the browser/proxy cache key) stable.
 */
export function useVenuesList(options: UseVenuesListOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    status = "",
    type = "",
    city = "",
    sortField = "name",
    sortOrder = "asc",
    enabled = true,
  } = options

  const { get } = useFetchClient()
  const [venues, setVenues] = useState<Venue[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  // Guards against a slow early request resolving AFTER a later one and
  // overwriting the fresher rows (type "ri" fast enough and the un-filtered
  // response lands last).
  const requestId = useRef(0)

  const fetchVenues = useCallback(async () => {
    if (!enabled) {
      requestId.current += 1
      setVenues([])
      setPagination(EMPTY_PAGINATION)
      setIsLoading(false)
      return
    }

    const currentRequest = ++requestId.current
    setIsLoading(true)
    setError(null)

    const params: Record<string, string | number> = {
      page,
      pageSize,
      sortField,
      sortOrder,
    }
    if (search) params.search = search
    if (status) params.status = status
    if (type) params.type = type
    if (city) params.city = city

    try {
      const response = await get<ListResponse>(VENUES_ADMIN_PATH, { params })
      if (currentRequest !== requestId.current) return

      setVenues(response.data.data ?? [])
      setPagination(response.data.meta?.pagination ?? EMPTY_PAGINATION)
    } catch (err) {
      if (currentRequest !== requestId.current) return
      setError(parseApiError(err))
      setVenues([])
      setPagination(EMPTY_PAGINATION)
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false)
    }
  }, [
    enabled,
    get,
    page,
    pageSize,
    search,
    status,
    type,
    city,
    sortField,
    sortOrder,
  ])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  return { venues, pagination, isLoading, error, refetch: fetchVenues }
}

/** One venue by `documentId` (null disables the read). */
export function useVenue(documentId: string | null) {
  const { get } = useFetchClient()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  // Same guard as `useVenuesList`: opening venue A then venue B before A's read
  // resolves must not leave B's form showing A's row.
  const requestId = useRef(0)

  const fetchVenue = useCallback(async () => {
    if (!documentId) {
      requestId.current += 1
      setVenue(null)
      return
    }

    const currentRequest = ++requestId.current
    setIsLoading(true)
    setError(null)

    try {
      const response = await get<{ data: Venue }>(
        `${VENUES_ADMIN_PATH}/${documentId}`
      )
      if (currentRequest !== requestId.current) return
      setVenue(response.data.data ?? null)
    } catch (err) {
      if (currentRequest !== requestId.current) return
      setError(parseApiError(err))
      setVenue(null)
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false)
    }
  }, [get, documentId])

  useEffect(() => {
    fetchVenue()
  }, [fetchVenue])

  return { venue, isLoading, error, refetch: fetchVenue }
}

/**
 * Create / update / delete / bulk-delete.
 *
 * Each mutation resolves to a DISCRIMINATED result rather than throwing: the
 * caller has to render either a toast or per-field `Field.Error`s, and an
 * exception-based API pushes that decision into a `catch` in every component.
 */
export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }

export function useVenueMutations() {
  const { post, put, del } = useFetchClient()
  const [isLoading, setIsLoading] = useState(false)

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<MutationResult<T>> => {
      setIsLoading(true)
      try {
        return { ok: true, data: await fn() }
      } catch (err) {
        return { ok: false, error: parseApiError(err) }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const createVenue = useCallback(
    (data: VenueInput) =>
      run(async () => {
        const response = await post<{ data: Venue }>(VENUES_ADMIN_PATH, data)
        return response.data.data
      }),
    [post, run]
  )

  const updateVenue = useCallback(
    (documentId: string, data: VenueInput) =>
      run(async () => {
        const response = await put<{ data: Venue }>(
          `${VENUES_ADMIN_PATH}/${documentId}`,
          data
        )
        return response.data.data
      }),
    [put, run]
  )

  const deleteVenue = useCallback(
    (documentId: string) =>
      run(async () => {
        await del(`${VENUES_ADMIN_PATH}/${documentId}`)
        return { documentId }
      }),
    [del, run]
  )

  const bulkDeleteVenues = useCallback(
    (documentIds: string[]) =>
      run(async () => {
        const response = await post<{
          data: { deleted: string[]; failed: string[] }
        }>(`${VENUES_ADMIN_PATH}/bulk-delete`, { documentIds })
        return response.data.data
      }),
    [post, run]
  )

  return {
    createVenue,
    updateVenue,
    deleteVenue,
    bulkDeleteVenues,
    isLoading,
  }
}
