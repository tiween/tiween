import "server-only"

import { PublicStrapiClient } from "@/lib/strapi-api"

// =============================================================================
// Venue Types
// =============================================================================

/**
 * Venue type enumeration from Strapi schema
 */
export type VenueType =
  | "cinema"
  | "theater"
  | "cultural-center"
  | "museum"
  | "other"

/**
 * Basic venue type for list views
 */
export interface StrapiVenueBasic {
  id: number
  documentId: string
  name: string
  slug: string
  address?: string
  city?: string
  type: VenueType
  logo?: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  }
  images?: Array<{
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
      medium?: { url: string }
    }
  }>
  cityRef?: {
    documentId: string
    name: string
    slug: string
  }
}

/**
 * Detailed venue type with all fields
 */
export interface StrapiVenueDetail extends StrapiVenueBasic {
  description?: string
  region?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website?: string
  capacity?: number
  status: "pending" | "approved" | "suspended"
  links?: Array<{
    platform: string
    url: string
  }>
}

/**
 * Filter options for venue queries
 */
export interface VenueFilterOptions {
  type?: VenueType
  cityDocumentId?: string
  search?: string
  limit?: number
  offset?: number
}

// =============================================================================
// Venue API Functions
// =============================================================================

/**
 * Fetch approved venues with optional filters
 * Only returns venues with status "approved"
 */
export async function getVenues(
  locale: string,
  options?: VenueFilterOptions
): Promise<{ venues: StrapiVenueBasic[]; total: number }> {
  const { type, cityDocumentId, search, limit = 20, offset = 0 } = options || {}

  try {
    // Build filters - always filter by approved status
    const filters: Record<string, unknown> = {
      status: { $eq: "approved" },
    }

    // Type filter
    if (type) {
      filters.type = { $eq: type }
    }

    // City filter via cityRef relation
    if (cityDocumentId) {
      filters.cityRef = {
        documentId: { $eq: cityDocumentId },
      }
    }

    // Search filter (name or address)
    if (search) {
      filters.$or = [
        { name: { $containsi: search } },
        { address: { $containsi: search } },
      ]
    }

    const response = await PublicStrapiClient.fetchAPI(
      "/venues/venues",
      {
        locale,
        filters,
        populate: {
          logo: {
            fields: ["url", "formats"],
          },
          images: {
            fields: ["url", "formats"],
          },
          cityRef: {
            fields: ["documentId", "name", "slug"],
          },
        },
        sort: ["name:asc"],
        pagination: {
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
        },
      },
      { next: { revalidate: 300 } } // 5 min cache
    )

    return {
      venues: response.data || [],
      total: response.meta?.pagination?.total || 0,
    }
  } catch (error) {
    console.error("[getVenues] Error fetching venues:", error)
    return { venues: [], total: 0 }
  }
}

/**
 * Fetch a single venue by documentId with full details
 */
export async function getVenueByDocumentId(
  documentId: string,
  locale: string
): Promise<StrapiVenueDetail | null> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      `/venues/venues/${documentId}`,
      {
        locale,
        populate: {
          logo: {
            fields: ["url", "formats"],
          },
          images: {
            fields: ["url", "alternativeText", "formats"],
          },
          cityRef: {
            fields: ["documentId", "name", "slug"],
            populate: {
              region: {
                fields: ["documentId", "name", "slug"],
              },
            },
          },
          links: true,
        },
      },
      { next: { revalidate: 300 } }
    )

    // Only return if approved
    if (response.data?.status !== "approved") {
      return null
    }

    return response.data || null
  } catch (error) {
    console.error("[getVenueByDocumentId] Error fetching venue:", error)
    return null
  }
}

/**
 * Fetch a single venue by slug
 */
export async function getVenueBySlug(
  slug: string,
  locale: string
): Promise<StrapiVenueDetail | null> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/venues/venues",
      {
        locale,
        filters: {
          slug: { $eq: slug },
          status: { $eq: "approved" },
        },
        populate: {
          logo: {
            fields: ["url", "formats"],
          },
          images: {
            fields: ["url", "alternativeText", "formats"],
          },
          cityRef: {
            fields: ["documentId", "name", "slug"],
            populate: {
              region: {
                fields: ["documentId", "name", "slug"],
              },
            },
          },
          links: true,
        },
        pagination: {
          page: 1,
          pageSize: 1,
        },
      },
      { next: { revalidate: 300 } }
    )

    return response.data?.[0] || null
  } catch (error) {
    console.error("[getVenueBySlug] Error fetching venue:", error)
    return null
  }
}

/**
 * Fetch venues for a specific city
 * Convenience wrapper for common use case
 */
export async function getVenuesByCity(
  cityDocumentId: string,
  locale: string,
  limit = 20
): Promise<StrapiVenueBasic[]> {
  const result = await getVenues(locale, { cityDocumentId, limit })
  return result.venues
}

/**
 * Fetch venues by type
 * Convenience wrapper for common use case
 */
export async function getVenuesByType(
  type: VenueType,
  locale: string,
  limit = 20
): Promise<StrapiVenueBasic[]> {
  const result = await getVenues(locale, { type, limit })
  return result.venues
}

/**
 * Search venues by name or address
 */
export async function searchVenues(
  query: string,
  locale: string,
  limit = 10
): Promise<StrapiVenueBasic[]> {
  const result = await getVenues(locale, { search: query, limit })
  return result.venues
}

/** A single option surfaced in the venue picker. */
export interface VenueSelectorVenue {
  documentId: string
  name: string
  type?: VenueType
  /** Denormalized `cityRef.name` — absent when the venue has no city. */
  city?: string
}

export interface VenueSelectorOptions {
  /** Venue type scope. Defaults to `"cinema"` (the MVP catalogue). */
  type?: VenueType
  /** Restrict to venues in this city (`cityRef.documentId`). */
  cityDocumentId?: string
  /** Restrict to venues in this region (`cityRef.region.documentId`). */
  regionDocumentId?: string
  /**
   * Force-add this venue to the page even when it falls outside the scope — the
   * user's active (URL-supplied) selection must always be labelable.
   */
  includeDocumentId?: string
  /** Page size (server caps at 200). Defaults to 100. */
  pageSize?: number
}

export interface VenueSelectorResult {
  venues: VenueSelectorVenue[]
  /** Honest count of the scoped set (never inflated by `includeDocumentId`). */
  total: number
  /** True when the scoped set is larger than the returned page. */
  truncated: boolean
}

/** A FRESH empty result per call — never a shared object a caller could mutate. */
const emptySelectorResult = (): VenueSelectorResult => ({
  venues: [],
  total: 0,
  truncated: false,
})

/**
 * Fetch venues for the venue picker (DW-24 / DW-25).
 *
 * Hits the dedicated `/venues/venues/selector` route, which is the only venues
 * endpoint that actually honours filters: approved-only, type/city/region
 * scoped, `cityRef` populated (so the UI can disambiguate same-named venues),
 * really paginated with a reported `total`, plus an `include` escape hatch that
 * guarantees the active selection is on the page. Params are sent FLAT (the
 * client serializes with `qs.stringify`, so they arrive as plain query keys).
 *
 * Fail-soft: any error degrades to an empty result rather than throwing, so a
 * broken selector never 500s the page that renders it.
 */
export async function getVenuesForSelector(
  locale: string,
  options?: VenueSelectorOptions
): Promise<VenueSelectorResult> {
  const {
    type = "cinema",
    cityDocumentId,
    regionDocumentId,
    includeDocumentId,
    pageSize = 100,
  } = options || {}

  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/venues/venues/selector",
      {
        locale,
        type,
        ...(cityDocumentId ? { city: cityDocumentId } : {}),
        ...(regionDocumentId ? { region: regionDocumentId } : {}),
        ...(includeDocumentId ? { include: includeDocumentId } : {}),
        page: 1,
        pageSize,
      },
      { next: { revalidate: 3600 } } // 1 hour cache for selector data
    )

    const venues: VenueSelectorVenue[] = Array.isArray(response?.data)
      ? response.data.map((v: VenueSelectorVenue) => ({
          documentId: v.documentId,
          name: v.name,
          type: v.type,
          city: v.city,
        }))
      : []

    const total = response?.meta?.pagination?.total ?? venues.length

    // Compare against the requested page size, NOT `venues.length`: the server
    // may prepend an off-page `include` without inflating `total`, which would
    // make a genuinely truncated list (total 101, 100 rows + 1 include) read as
    // complete and suppress the "refine your search" hint.
    return { venues, total, truncated: total > pageSize }
  } catch (error) {
    console.error("[getVenuesForSelector] Error fetching venues:", error)
    return emptySelectorResult()
  }
}
