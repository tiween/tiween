import { NextRequest, NextResponse } from "next/server"

import { searchEvents } from "@/lib/strapi-api/content/search"

/**
 * GET /api/search
 *
 * Search events with optional filters.
 *
 * Query parameters:
 * - q: Search query (required)
 * - locale: Language (default: "fr")
 * - category: Filter by category
 * - city: Filter by city documentId
 * - venue: Filter by venue documentId
 * - limit: Max results (default: 20)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get("q") || ""
  const locale = searchParams.get("locale") || "fr"
  const category = searchParams.get("category") || undefined
  const cityDocumentId = searchParams.get("city") || undefined
  const venueDocumentId = searchParams.get("venue") || undefined
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  // Validate query
  if (!query.trim()) {
    return NextResponse.json(
      { events: [], total: 0, query: "" },
      { status: 200 }
    )
  }

  try {
    const result = await searchEvents(locale, {
      query,
      category,
      cityDocumentId,
      venueDocumentId,
      limit: Math.min(limit, 50), // Cap at 50
      offset: Math.max(offset, 0),
    })

    return NextResponse.json(result, {
      status: 200,
      headers: {
        // Cache for 1 minute
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    })
  } catch (error) {
    console.error("[API /search] Error:", error)
    return NextResponse.json(
      { error: "Search failed", events: [], total: 0, query },
      { status: 500 }
    )
  }
}
