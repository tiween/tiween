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

// Ratings are out of v1 (PRODUCT.md): an old `sortBy=rating` link falls back
// to "latest", and a `rating` param is ignored.
const SORT_KEYS = ["latest", "year", "duration", "title"] as const

function isSortBy(
  value: string | null
): value is NonNullable<ShortsFilters["sortBy"]> {
  return (SORT_KEYS as readonly string[]).includes(value ?? "")
}

/** A finite number from a query param, or `undefined` (never `NaN`). */
function optionalNumber(raw: string | null): number | undefined {
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Parse an integer query param, falling back and clamping to `[min, max]`. */
function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const localeParam = searchParams.get("locale") || "fr"
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "fr"
  // Bound free text so a pasted essay cannot become a backend query.
  const query = (searchParams.get("q") || "").trim().slice(0, 100)
  // `NaN`, `0`, negatives and huge page sizes all come from hand-edited URLs;
  // clamp them instead of forwarding them to Strapi.
  const page = clampInt(searchParams.get("page"), 1, 1, 500)
  const pageSize = clampInt(searchParams.get("pageSize"), 24, 1, 48)
  const sortParam = searchParams.get("sortBy")
  const sortOrderParam = searchParams.get("sortOrder")

  // Parse filters
  const filters: ShortsFilters = {
    query: query || undefined,
    genres: searchParams.get("genres")?.split(",").filter(Boolean),
    durationMin: optionalNumber(searchParams.get("durationMin")),
    durationMax: optionalNumber(searchParams.get("durationMax")),
    yearMin: optionalNumber(searchParams.get("yearMin")),
    yearMax: optionalNumber(searchParams.get("yearMax")),
    hasAwards: searchParams.get("hasAwards") === "true" ? true : undefined,
    availableOnline:
      searchParams.get("availableOnline") === "true" ? true : undefined,
    sortBy: isSortBy(sortParam) ? sortParam : "latest",
    sortOrder: sortOrderParam === "asc" ? "asc" : "desc",
  }

  try {
    const result = query
      ? await searchShortFilms(locale, query, { filters, page, pageSize })
      : await getShortFilms(locale, { filters, page, pageSize })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API /shorts] Error:", error)
    // An explicit code, so the client shows "catalog unavailable + retry"
    // rather than mistaking an outage for an empty catalog.
    return NextResponse.json(
      {
        error: "SHORTS_UNAVAILABLE",
        shorts: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      },
      { status: 503 }
    )
  }
}
