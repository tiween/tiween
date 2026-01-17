import "server-only"

import { PublicStrapiClient } from "@/lib/strapi-api"

// =============================================================================
// Geography Types
// =============================================================================

/**
 * Region (Governorate) type from Strapi geography plugin
 */
export interface StrapiRegion {
  id: number
  documentId: string
  name: string
  slug: string
  code?: string
  cities?: StrapiCityBasic[]
}

/**
 * Basic city type (used when nested in region)
 */
export interface StrapiCityBasic {
  id: number
  documentId: string
  name: string
  slug: string
  latitude?: number
  longitude?: number
}

/**
 * City with region relation
 */
export interface StrapiCityWithRegion extends StrapiCityBasic {
  region?: {
    id: number
    documentId: string
    name: string
    slug: string
  }
}

// =============================================================================
// Geography API Functions
// =============================================================================

/**
 * Fetch all regions with their cities
 * Used for the region/city filter dropdown
 */
export async function getRegions(locale: string): Promise<StrapiRegion[]> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/geography/regions",
      { locale },
      { next: { revalidate: 3600 } } // 1 hour cache - geography rarely changes
    )
    return response.data || []
  } catch (error) {
    console.error("[getRegions] Error fetching regions:", error)
    return []
  }
}

/**
 * Fetch a single region by documentId
 */
export async function getRegion(
  documentId: string,
  locale: string
): Promise<StrapiRegion | null> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      `/geography/regions/${documentId}`,
      { locale },
      { next: { revalidate: 3600 } }
    )
    return response.data || null
  } catch (error) {
    console.error("[getRegion] Error fetching region:", error)
    return null
  }
}

/**
 * Fetch cities, optionally filtered by region
 */
export async function getCities(
  locale: string,
  regionDocumentId?: string
): Promise<StrapiCityWithRegion[]> {
  try {
    const params: Record<string, unknown> = { locale }
    if (regionDocumentId) {
      params.region = regionDocumentId
    }

    const response = await PublicStrapiClient.fetchAPI(
      "/geography/cities",
      params,
      { next: { revalidate: 3600 } }
    )
    return response.data || []
  } catch (error) {
    console.error("[getCities] Error fetching cities:", error)
    return []
  }
}

/**
 * Fetch a single city by documentId
 */
export async function getCity(
  documentId: string,
  locale: string
): Promise<StrapiCityWithRegion | null> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      `/geography/cities/${documentId}`,
      { locale },
      { next: { revalidate: 3600 } }
    )
    return response.data || null
  } catch (error) {
    console.error("[getCity] Error fetching city:", error)
    return null
  }
}
