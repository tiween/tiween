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
 * Transform frontend form data to Strapi API format.
 *
 * Exported for `route.test.ts`: this is the payload contract against the
 * post-2C.3 catalog model (cast/crew split, `creditRole` relation, `videoType`)
 * and nothing else in the route is worth pinning.
 */
export async function transformToStrapiFormat(
  data: ReturnType<typeof playContributionSchema.parse>,
  _submitterIp: string
) {
  // Resolve the wizard's role slugs to credit-role documentIds once per
  // request. In-flight promises are cached so the concurrent credit mapping
  // below never issues the same lookup twice.
  const creditRoleCache = new Map<string, Promise<string | undefined>>()

  // Since story 2C.3 actors and crew live in SEPARATE components: an actor is
  // a `cast[]` row (person + character), a crew member is a `credits[]` row
  // (person + creditRole). The wizard still collects both under one list keyed
  // by `role`, so split them here.
  const castEntries = data.credits.filter((credit) => credit.role === "cast")
  const crewEntries = data.credits.filter((credit) => credit.role !== "cast")

  // For new persons (without documentId), we need to create them first
  const cast = await Promise.all(
    castEntries.map(async (credit) => ({
      person: await resolvePersonId(credit.person),
      // The wizard collects the character as free text, but `cast.character`
      // is a relation to a `character` record and this route has no way to
      // create one — the text is not forwarded.
      billing: credit.billing || 99,
    }))
  )

  const credits = await Promise.all(
    crewEntries.map(async (credit) => {
      const personId = await resolvePersonId(credit.person)
      const creditRoleId = await resolveCreditRoleId(
        credit.role,
        creditRoleCache
      )

      // `creditRole` is REQUIRED on the credit component, so an unresolved
      // slug means Strapi rejects the whole submission. The slug is still
      // carried in `customRole` so the failure is diagnosable from the payload.
      return {
        person: personId,
        ...(creditRoleId ? { creditRole: creditRoleId } : {}),
        customRole: creditRoleId
          ? credit.customRole || null
          : credit.customRole || credit.role,
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

  // Build videos array.
  // The wizard collects the `videoType` vocabulary directly. `type` is sent as
  // an explicit null so the legacy enum's schema default is not stamped onto
  // brand-new rows.
  const videos = data.videos?.map((video) => ({
    url: video.url,
    type: null,
    videoType: video.type || "trailer",
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
    cast,
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
 * Resolve a wizard person reference to a documentId, creating the person as a
 * draft when the contributor typed a name that is not in the catalog yet.
 */
async function resolvePersonId(person: {
  documentId?: string
  name?: string
}): Promise<string | undefined> {
  if (person.documentId) {
    return person.documentId
  }
  return person.name ? createPersonInStrapi(person.name) : undefined
}

/**
 * Resolve a wizard role slug to a `credit-role` documentId.
 *
 * `creative-works.credit.creditRole` is a required relation to the credit-role
 * content type, so the slug the wizard collects has to be looked up. Results
 * (including misses) are memoized in the caller's per-request cache.
 *
 * Misses are cached deliberately: the credits below are mapped under a single
 * `Promise.all`, so every credit sharing a slug is already awaiting the same
 * in-flight request. Evicting on failure would not give any of them a retry —
 * it would only re-issue the request for a slug nobody is waiting on anymore.
 * The cache never outlives the request, so the next submission retries anyway.
 */
function resolveCreditRoleId(
  slug: string,
  cache: Map<string, Promise<string | undefined>>
): Promise<string | undefined> {
  const cached = cache.get(slug)
  if (cached) {
    return cached
  }

  const lookup = fetchCreditRoleId(slug)
  cache.set(slug, lookup)
  return lookup
}

async function fetchCreditRoleId(slug: string): Promise<string | undefined> {
  let documentId: string | undefined

  try {
    const apiKey =
      env.STRAPI_REST_CUSTOM_API_KEY || env.STRAPI_REST_READONLY_API_KEY

    const response = await fetch(
      `${env.STRAPI_URL}/api/credit-roles?filters[slug][$eq]=${encodeURIComponent(slug)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (response.ok) {
      const found = await response.json()
      documentId = found.data?.[0]?.documentId
    } else {
      console.error(
        "[PlaySubmit] Failed to resolve credit role:",
        slug,
        response.status
      )
    }
  } catch (error) {
    console.error("[PlaySubmit] Error resolving credit role:", slug, error)
  }

  return documentId
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
