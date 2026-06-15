import { NextResponse } from "next/server"
import { env } from "@/env.mjs"
import { z } from "zod"

import { getClientIp, personSearchLimiter } from "@/lib/rate-limit"

const searchParamsSchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(20).default(10),
})

export async function GET(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const { success, remaining, reset } = personSearchLimiter.check(ip)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const params = searchParamsSchema.safeParse({
      q: searchParams.get("q"),
      limit: searchParams.get("limit") || 10,
    })

    if (!params.success) {
      return NextResponse.json(
        { success: false, error: "INVALID_QUERY" },
        { status: 400 }
      )
    }

    const { q, limit } = params.data

    // Build Strapi query with filters
    // Search for published persons with name containing the query
    const strapiQuery = new URLSearchParams({
      "filters[name][$containsi]": q,
      "pagination[pageSize]": String(limit),
      "sort[0]": "name:asc",
      populate: "photo",
      // Only published persons
      publicationState: "live",
    })

    const response = await fetch(
      `${env.STRAPI_URL}/api/persons?${strapiQuery.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${env.STRAPI_REST_READONLY_API_KEY}`,
        },
        // Short cache for search results
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      console.error(
        "[PersonSearch] Strapi error:",
        response.status,
        await response.text()
      )
      return NextResponse.json(
        { success: false, error: "SEARCH_FAILED" },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Transform to simpler format
    const persons = data.data.map(
      (person: {
        documentId: string
        name: string
        nationality?: string
        photo?: {
          url: string
          formats?: {
            thumbnail?: { url: string }
          }
        }
      }) => ({
        documentId: person.documentId,
        name: person.name,
        nationality: person.nationality || null,
        photo: person.photo
          ? {
              url: person.photo.url,
              formats: person.photo.formats,
            }
          : null,
      })
    )

    return NextResponse.json(
      { success: true, data: persons },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    )
  } catch (error) {
    console.error("[PersonSearch] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "SEARCH_FAILED" },
      { status: 500 }
    )
  }
}
