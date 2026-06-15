import { NextRequest, NextResponse } from "next/server"

import type { ShortsFilters } from "@/features/shorts/types"
import type { Locale } from "next-intl"

import {
  getShortFilms,
  searchShortFilms,
} from "@/lib/strapi-api/content/shorts"

const VALID_LOCALES: Locale[] = ["fr", "ar", "en"]

function isValidLocale(locale: string): locale is Locale {
  return VALID_LOCALES.includes(locale as Locale)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const localeParam = searchParams.get("locale") || "fr"
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "fr"
  const query = searchParams.get("q") || ""
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = parseInt(searchParams.get("pageSize") || "24", 10)

  // Parse filters
  const filters: ShortsFilters = {
    query: query || undefined,
    genres: searchParams.get("genres")?.split(",").filter(Boolean),
    durationMin: searchParams.get("durationMin")
      ? parseInt(searchParams.get("durationMin")!, 10)
      : undefined,
    durationMax: searchParams.get("durationMax")
      ? parseInt(searchParams.get("durationMax")!, 10)
      : undefined,
    yearMin: searchParams.get("yearMin")
      ? parseInt(searchParams.get("yearMin")!, 10)
      : undefined,
    yearMax: searchParams.get("yearMax")
      ? parseInt(searchParams.get("yearMax")!, 10)
      : undefined,
    hasAwards: searchParams.get("hasAwards") === "true" ? true : undefined,
    availableOnline:
      searchParams.get("availableOnline") === "true" ? true : undefined,
    rating: searchParams.get("rating")
      ? parseFloat(searchParams.get("rating")!)
      : undefined,
    sortBy: (searchParams.get("sortBy") as ShortsFilters["sortBy"]) || "latest",
    sortOrder:
      (searchParams.get("sortOrder") as ShortsFilters["sortOrder"]) || "desc",
  }

  try {
    const result = query
      ? await searchShortFilms(locale, query, { filters, page, pageSize })
      : await getShortFilms(locale, { filters, page, pageSize })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API /shorts] Error:", error)
    return NextResponse.json(
      { shorts: [], total: 0, page, pageSize, hasMore: false },
      { status: 500 }
    )
  }
}
