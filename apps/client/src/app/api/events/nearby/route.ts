import { NextRequest, NextResponse } from "next/server"

import type { StrapiEvent } from "@/features/events/types/strapi.types"
import type { Coordinates } from "@/lib/geolocation"

import { calculateDistance } from "@/lib/geolocation"
import { isWithinTunisia, NEARBY_RADIUS_KM } from "@/lib/geolocation/constants"
import { PublicStrapiClient } from "@/lib/strapi-api"

/**
 * GET /api/events/nearby
 *
 * Get events sorted by distance from user's location.
 *
 * Query parameters:
 * - lat: User's latitude (required)
 * - lng: User's longitude (required)
 * - locale: Language (default: "fr")
 * - category: Filter by category
 * - limit: Max results (default: 20)
 * - offset: Pagination offset (default: 0)
 * - radius: Max distance in km (default: 50)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse coordinates
  const lat = parseFloat(searchParams.get("lat") || "")
  const lng = parseFloat(searchParams.get("lng") || "")

  // Validate coordinates
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Missing or invalid coordinates (lat, lng required)" },
      { status: 400 }
    )
  }

  const userLocation: Coordinates = { latitude: lat, longitude: lng }

  // Validate location is within Tunisia
  if (!isWithinTunisia(userLocation)) {
    return NextResponse.json(
      { error: "Location is outside Tunisia" },
      { status: 400 }
    )
  }

  // Parse other parameters
  const locale = searchParams.get("locale") || "fr"
  const category = searchParams.get("category") || undefined
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50)
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0)
  const radius = parseFloat(
    searchParams.get("radius") || String(NEARBY_RADIUS_KM)
  )

  try {
    // Build filters
    const filters: Record<string, unknown> = {
      publishedAt: { $notNull: true },
      endDate: { $gte: new Date().toISOString().split("T")[0] },
      // Only events with venues that have coordinates
      venue: {
        latitude: { $notNull: true },
        longitude: { $notNull: true },
      },
    }

    if (category) {
      filters.creativeWork = { type: { $eq: category } }
    }

    // Fetch events with venue coordinates
    // We need to fetch more than limit to account for distance filtering
    const response = await PublicStrapiClient.fetchAPI(
      "/events",
      {
        locale,
        filters,
        populate: [
          "creativeWork",
          "creativeWork.poster",
          "creativeWork.poster.formats",
          "creativeWork.genres",
          "venue",
          "venue.logo",
          "venue.cityRef",
          "showtimes",
        ],
        pagination: {
          start: 0,
          limit: 200, // Fetch more to filter by distance
        },
        sort: ["startDate:asc"],
      },
      {
        next: { revalidate: 60 },
      }
    )

    const events = (response.data || []) as StrapiEvent[]

    // Calculate distance for each event and filter by radius
    const eventsWithDistance = events
      .map((event) => {
        const venue = event.venue
        if (!venue?.latitude || !venue?.longitude) {
          return null
        }

        const venueLocation: Coordinates = {
          latitude: venue.latitude,
          longitude: venue.longitude,
        }

        const distance = calculateDistance(userLocation, venueLocation)

        // Filter by radius
        if (distance > radius) {
          return null
        }

        return {
          ...event,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        }
      })
      .filter((e): e is StrapiEvent & { distance: number } => e !== null)

    // Sort by distance
    eventsWithDistance.sort((a, b) => a.distance - b.distance)

    // Apply pagination
    const total = eventsWithDistance.length
    const paginatedEvents = eventsWithDistance.slice(offset, offset + limit)

    return NextResponse.json(
      {
        events: paginatedEvents,
        total,
        userLocation,
        radius,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    )
  } catch (error) {
    console.error("[API /events/nearby] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch nearby events" },
      { status: 500 }
    )
  }
}
