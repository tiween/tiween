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
      "/events-manager/venues",
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
      `/events-manager/venues/${documentId}`,
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
      "/events-manager/venues",
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

/**
 * Fetch all venues for the VenueSelector dropdown
 * Returns minimal data for performance
 */
export async function getVenuesForSelector(
  locale: string,
  cityDocumentId?: string
): Promise<
  Array<{ documentId: string; name: string; type: VenueType; city?: string }>
> {
  try {
    const filters: Record<string, unknown> = {
      status: { $eq: "approved" },
    }

    if (cityDocumentId) {
      filters.cityRef = {
        documentId: { $eq: cityDocumentId },
      }
    }

    const response = await PublicStrapiClient.fetchAPI(
      "/events-manager/venues",
      {
        locale,
        filters,
        fields: ["documentId", "name", "type", "city"],
        sort: ["name:asc"],
        pagination: {
          page: 1,
          pageSize: 100, // Reasonable limit for dropdown
        },
      },
      { next: { revalidate: 3600 } } // 1 hour cache for selector data
    )

    return (
      response.data?.map(
        (v: {
          documentId: string
          name: string
          type: VenueType
          city?: string
        }) => ({
          documentId: v.documentId,
          name: v.name,
          type: v.type,
          city: v.city,
        })
      ) || []
    )
  } catch (error) {
    console.error("[getVenuesForSelector] Error fetching venues:", error)
    return []
  }
}
