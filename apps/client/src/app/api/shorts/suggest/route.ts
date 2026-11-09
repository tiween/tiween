import { NextRequest, NextResponse } from "next/server"
import {
  SUGGESTION_LIMITS as L,
  SUGGESTION_PLATFORMS,
  suggestionYearMax,
} from "@/features/shorts/utils"
import { z } from "zod"

import { getClientIp, shortSuggestionLimiter } from "@/lib/rate-limit"

/**
 * Error codes returned to the client. The UI translates them
 * (`shorts.suggestion.errors.<CODE>`); no human-readable message or upstream
 * detail ever leaves this route.
 */
type SuggestionErrorCode =
  | "RATE_LIMIT_EXCEEDED"
  | "VALIDATION_ERROR"
  | "SUGGESTION_UNAVAILABLE"

function errorResponse(
  code: SuggestionErrorCode,
  status: number,
  headers?: Record<string, string>
) {
  return NextResponse.json({ success: false, error: code }, { status, headers })
}

const optionalText = (max: number) => z.string().trim().max(max).optional()
const optionalUrl = z.string().trim().url().max(L.url).optional()

const suggestionSchema = z.object({
  title: z.string().trim().min(1).max(L.title),
  originalTitle: optionalText(L.title),
  director: optionalText(L.person),
  year: z.number().int().min(L.yearMin).max(suggestionYearMax()).optional(),
  duration: z.number().int().min(L.durationMin).max(L.durationMax).optional(),
  synopsis: optionalText(L.synopsis),
  genres: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  country: optionalText(L.place),
  language: optionalText(L.place),
  trailerUrl: optionalUrl,
  watchUrl: optionalUrl,
  platform: z.enum(SUGGESTION_PLATFORMS).optional(),
  posterUrl: optionalUrl,
  submitterName: z.string().trim().min(1).max(L.name),
  submitterEmail: z.string().trim().email().max(L.email),
  additionalNotes: optionalText(L.notes),
})

export async function POST(request: NextRequest) {
  // Module-level limiter: a per-request instance would reset and bound nothing.
  const { success, reset } = shortSuggestionLimiter.check(getClientIp(request))
  if (!success) {
    return errorResponse("RATE_LIMIT_EXCEEDED", 429, {
      "Retry-After": String(
        Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      ),
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse("VALIDATION_ERROR", 400)
  }

  const parsed = suggestionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", 400)
  }
  const suggestion = parsed.data

  const strapiUrl = process.env.STRAPI_URL
  if (!strapiUrl) {
    console.error("[API /shorts/suggest] STRAPI_URL is not configured")
    return errorResponse("SUGGESTION_UNAVAILABLE", 503)
  }
  const strapiToken = process.env.STRAPI_API_TOKEN

  try {
    const response = await fetch(`${strapiUrl}/api/short-film-suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(strapiToken && { Authorization: `Bearer ${strapiToken}` }),
      },
      body: JSON.stringify({
        data: {
          ...suggestion,
          genres: suggestion.genres?.join(", "),
          status: "pending",
        },
      }),
      // A slow single-instance backend must not hold the visitor's request
      // open indefinitely.
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      // Never report success for a suggestion that was not stored: the visitor
      // keeps their answers and can retry. Log the status only — the payload
      // carries the submitter's name and email.
      console.error(
        `[API /shorts/suggest] Strapi rejected the suggestion (HTTP ${response.status})`
      )
      return errorResponse("SUGGESTION_UNAVAILABLE", 502)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown"
    console.error(`[API /shorts/suggest] Strapi unreachable (${reason})`)
    return errorResponse("SUGGESTION_UNAVAILABLE", 503)
  }
}
