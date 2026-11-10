import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  getShortFilmsPage,
  SHORT_FILM_PAGE_SIZE,
} from "@/lib/strapi-api/content/shorts"
import {
  toShortFilmApiError,
  toUserErrorCode,
} from "@/lib/strapi-api/content/shorts.errors"

/**
 * Load-more endpoint for the shorts directory (D-03, T-02-01).
 *
 * The browser never talks to Strapi: this handler validates a closed query
 * (`locale`, `page`, nothing else), fixes `pageSize` server-side so a caller
 * cannot vary the cache key, and calls the same server fetcher the first page
 * uses. A failure is never a 200 with an empty list: bad input answers 400 and
 * an upstream failure answers 502, so the client keeps the films already shown
 * and offers a retry.
 */
const querySchema = z
  .object({
    locale: z.enum(["fr", "ar", "en"]),
    page: z.coerce.number().int().min(1).max(500),
  })
  .strict()

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!parsed.success) {
    // Nothing from the request is echoed back.
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 })
  }

  try {
    const result = await getShortFilmsPage({
      locale: parsed.data.locale,
      page: parsed.data.page,
      pageSize: SHORT_FILM_PAGE_SIZE,
    })
    return NextResponse.json(result)
  } catch (error) {
    const apiError = toShortFilmApiError(error)
    console.error("[API /shorts] upstream failure:", apiError.code)
    return NextResponse.json(
      { error: toUserErrorCode(apiError.code) },
      { status: 502 }
    )
  }
}
