import { NextResponse } from "next/server"
import { env } from "@/env.mjs"
import { playContributionSchema } from "@/features/contribute/schemas/play-contribution"

import { getClientIp, playSubmissionLimiter } from "@/lib/rate-limit"
import { verifyRecaptcha } from "@/lib/recaptcha"

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const { success, remaining, reset } = playSubmissionLimiter.check(ip)

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

    // Parse body
    const body = await request.json()

    // Extract reCAPTCHA token before validation
    const { recaptchaToken, ...formData } = body

    // Validate form data
    const result = playContributionSchema.safeParse(formData)

    if (!result.success) {
      console.error("[PlaySubmit] Validation error:", result.error.flatten())
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          details: result.error.flatten(),
        },
        { status: 400 }
      )
    }

    // Verify reCAPTCHA
    if (env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { success: false, error: "RECAPTCHA_REQUIRED" },
          { status: 400 }
        )
      }

      const isValid = await verifyRecaptcha(recaptchaToken)
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "RECAPTCHA_FAILED" },
          { status: 400 }
        )
      }
    }

    const data = result.data

    // Transform form data to Strapi format
    const strapiPayload = await transformToStrapiFormat(data, ip)

    // Check if we have a custom API key for write operations
    const apiKey =
      env.STRAPI_REST_CUSTOM_API_KEY || env.STRAPI_REST_READONLY_API_KEY

    // Submit to Strapi
    const response = await fetch(`${env.STRAPI_URL}/api/creative-works`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ data: strapiPayload }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[PlaySubmit] Strapi error:", response.status, errorText)

      // Check for specific Strapi errors
      if (response.status === 403) {
        return NextResponse.json(
          { success: false, error: "PERMISSION_DENIED" },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { success: false, error: "SUBMISSION_FAILED" },
        { status: 500 }
      )
    }

    const createdWork = await response.json()

    console.log(
      `[PlaySubmit] Successfully created draft play: ${createdWork.data?.documentId}`
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          documentId: createdWork.data?.documentId,
          message: "Your submission has been received and will be reviewed.",
        },
      },
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    )
  } catch (error) {
    console.error("[PlaySubmit] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "SUBMISSION_FAILED" },
      { status: 500 }
    )
  }
}

/**
 * Transform frontend form data to Strapi API format
 */
async function transformToStrapiFormat(
  data: ReturnType<typeof playContributionSchema.parse>,
  submitterIp: string
) {
  // Build credits array for Strapi
  // For new persons (without documentId), we need to create them first
  const credits = await Promise.all(
    data.credits.map(async (credit) => {
      let personId = credit.person.documentId

      // If this is a new person (no documentId), create it first
      if (!personId && credit.person.name) {
        personId = await createPersonInStrapi(credit.person.name)
      }

      return {
        person: personId,
        role: credit.role,
        character: credit.character || null,
        customRole: credit.customRole || null,
        billing: credit.billing || 99,
      }
    })
  )

  // Build theatre details component
  const theatreDetails = {
    playType: data.playType,
    format: data.format,
    actCount: data.actCount || null,
    hasIntermission: data.hasIntermission ?? false,
    basedOn: data.basedOn || null,
    originalLanguage: data.originalLanguage || null,
    productionCompany: data.productionCompany || null,
    premiereDate: data.premiereDate || null,
  }

  // Build videos array
  const videos = data.videos?.map((video) => ({
    url: video.url,
    type: video.type || "trailer",
  }))

  // Build links array
  const links = data.links?.map((link) => ({
    url: link.url,
    type: link.type || "website",
    label: link.label || null,
  }))

  // Build distinctions array
  const distinctions = data.distinctions?.map((d) => ({
    festival: d.name,
    award: d.awardName || null,
    year: d.year || null,
    result: d.result || "nominated",
  }))

  // Build the full Strapi payload
  const payload: Record<string, unknown> = {
    // Required fields
    title: data.title,
    type: "play", // This is a play contribution form

    // Optional basic fields
    originalTitle: data.originalTitle || null,
    synopsis: data.synopsis || null,
    duration: data.duration || null,
    releaseYear: data.releaseYear || null,
    ageRating: data.ageRating || null,

    // Relations and components
    credits,
    theatreDetails,
    videos: videos || [],
    links: links || [],
    distinctions: distinctions || [],

    // Poster handling (URL or uploaded file ID)
    // Note: If poster is a URL, we might need to handle it differently
    // depending on Strapi configuration

    // Submission metadata (stored as JSON or in separate fields)
    // These help admins track submissions
    locale: data.inputLanguage || "ar",
  }

  // Handle poster
  if (data.poster) {
    // If it's an external URL, store it differently
    // If it's an uploaded file path, reference the media ID
    if (data.poster.startsWith("http")) {
      // External URL - might need a custom field or component
      // For now, we'll skip setting the poster and let admin handle it
      console.log("[PlaySubmit] External poster URL:", data.poster)
    } else {
      // Uploaded file reference
      payload.poster = data.poster
    }
  }

  // Handle genres if provided
  if (data.genres && data.genres.length > 0) {
    payload.genres = data.genres
  }

  return payload
}

/**
 * Create a new person in Strapi as draft
 */
async function createPersonInStrapi(name: string): Promise<string | undefined> {
  try {
    const apiKey =
      env.STRAPI_REST_CUSTOM_API_KEY || env.STRAPI_REST_READONLY_API_KEY

    const response = await fetch(`${env.STRAPI_URL}/api/persons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          name,
          // Person is created as draft, to be published along with the play
        },
      }),
    })

    if (!response.ok) {
      console.error(
        "[PlaySubmit] Failed to create person:",
        response.status,
        await response.text()
      )
      return undefined
    }

    const created = await response.json()
    return created.data?.documentId
  } catch (error) {
    console.error("[PlaySubmit] Error creating person:", error)
    return undefined
  }
}
