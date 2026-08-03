import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Validation schema for suggestion
const suggestionSchema = z.object({
  title: z.string().min(1),
  originalTitle: z.string().optional(),
  director: z.string().optional(),
  year: z
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  duration: z.number().min(1).max(60).optional(),
  synopsis: z.string().optional(),
  genres: z.array(z.string()).optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  trailerUrl: z.string().url().optional(),
  watchUrl: z.string().url().optional(),
  platform: z.string().optional(),
  posterUrl: z.string().url().optional(),
  submitterName: z.string().min(1),
  submitterEmail: z.string().email(),
  additionalNotes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = suggestionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const suggestion = validationResult.data

    // Submit to Strapi as a draft/pending suggestion
    // For now, we'll use a generic endpoint - this should be customized
    // to match your Strapi setup (e.g., a custom "suggestions" collection)

    const strapiUrl = process.env.STRAPI_URL
    if (!strapiUrl) {
      throw new Error("STRAPI_URL is not configured")
    }
    const strapiToken = process.env.STRAPI_API_TOKEN

    // Option 1: Create as a draft creative work (requires admin token)
    // Option 2: Create in a separate "suggestions" collection
    // Option 3: Send via email notification

    // For this implementation, we'll create a suggestion entry
    // You may need to create a "short-film-suggestion" content type in Strapi

    const response = await fetch(`${strapiUrl}/api/short-film-suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(strapiToken && { Authorization: `Bearer ${strapiToken}` }),
      },
      body: JSON.stringify({
        data: {
          title: suggestion.title,
          originalTitle: suggestion.originalTitle,
          director: suggestion.director,
          year: suggestion.year,
          duration: suggestion.duration,
          synopsis: suggestion.synopsis,
          genres: suggestion.genres?.join(", "),
          country: suggestion.country,
          language: suggestion.language,
          trailerUrl: suggestion.trailerUrl,
          watchUrl: suggestion.watchUrl,
          platform: suggestion.platform,
          posterUrl: suggestion.posterUrl,
          submitterName: suggestion.submitterName,
          submitterEmail: suggestion.submitterEmail,
          additionalNotes: suggestion.additionalNotes,
          status: "pending",
        },
      }),
    })

    if (!response.ok) {
      // If Strapi endpoint doesn't exist, log and return success anyway
      // In production, you might want to send an email instead
      console.warn(
        "[API /shorts/suggest] Strapi endpoint not available, suggestion logged:",
        suggestion
      )

      // Log the suggestion for manual review
      console.info(
        "[SHORT FILM SUGGESTION]",
        JSON.stringify(suggestion, null, 2)
      )

      // Return success - the suggestion was received
      return NextResponse.json({
        success: true,
        message: "Suggestion received",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion submitted successfully",
    })
  } catch (error) {
    console.error("[API /shorts/suggest] Error:", error)
    return NextResponse.json(
      { error: "Failed to submit suggestion" },
      { status: 500 }
    )
  }
}
