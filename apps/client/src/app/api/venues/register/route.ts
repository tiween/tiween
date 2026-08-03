import { NextResponse } from "next/server"
import { env } from "@/env.mjs"
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  venueRegistrationSchema,
} from "@/features/venues/schemas/venue-registration"

import { getClientIp, venueRegistrationLimiter } from "@/lib/rate-limit"
import { verifyRecaptcha } from "@/lib/recaptcha"

/**
 * POST /api/venues/register — the public venue-application proxy (Story 7.1).
 *
 * Mirrors the `contribute/play` route-handler precedent: rate limit → parse →
 * validate → reCAPTCHA → server-token fetch to Strapi. The extra step here is
 * MEDIA: the venue references its logo/photos by upload id, so the files must
 * exist BEFORE the venue is created. They are uploaded first with the server
 * API token (which never reaches the browser) and deleted best-effort if the
 * registration then fails — orphaned media is the acceptable failure mode; a
 * rejected application is not.
 *
 * Every response is `{ success, error? }` with an error CODE the client
 * translates (`venues.register.errors.<CODE>`), never prose.
 *
 * `MAX_IMAGES`, `MAX_IMAGE_BYTES` and `ACCEPTED_IMAGE_TYPES` are IMPORTED from
 * the schema module rather than redeclared here. They used to be declared both
 * in this file and in `VenueRegistrationForm.tsx`, so the limits the picker
 * advertises and the limits the server enforces could drift apart silently.
 */

/**
 * An early return expressed as a throw: carries the client-facing error CODE
 * and the HTTP status to answer with. Used so the media checks and the config
 * guard can bail from anywhere in the flow and still hit the one rollback path
 * in `POST`'s catch block.
 */
class RouteError extends Error {
  constructor(
    readonly code: string,
    readonly status: number
  ) {
    super(code)
    this.name = "RouteError"
  }
}

/**
 * The WRITE-capable server token; never exposed to the browser.
 *
 * `STRAPI_REST_CUSTOM_API_KEY` is optional in `env.mjs` and the read-only key
 * cannot POST to `/api/upload` or `/api/venues/register`. Silently falling back
 * to the read-only key turns a misconfigured deploy into a 403 on every single
 * application, visible only as a `console.error` nobody is watching — so an
 * absent write key is an explicit, unmistakable failure instead.
 */
function serverApiKey(): string {
  const key = env.STRAPI_REST_CUSTOM_API_KEY
  if (!key) {
    console.error(
      "[VenueRegister] MISCONFIGURED DEPLOY: STRAPI_REST_CUSTOM_API_KEY is unset. " +
        "Venue registration needs a WRITE-capable Strapi API token; the read-only " +
        "key cannot upload media or create venues, so every application would 403."
    )
    throw new RouteError("VENUE_REGISTRATION_FAILED", 500)
  }
  return key
}

interface UploadedFile {
  id: number
}

/**
 * Upload one file to Strapi's media library and return its id.
 *
 * No `ref`/`refId`/`field` is sent: the file is linked to the venue by id in
 * the registration payload, so an anonymous caller can never attach media to an
 * existing entry.
 */
async function uploadFile(file: File): Promise<number> {
  const body = new FormData()
  body.append("files", file)

  const response = await fetch(`${env.STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serverApiKey()}` },
    body,
  })

  if (!response.ok) {
    console.error(
      "[VenueRegister] upload failed:",
      response.status,
      await response.text()
    )
    throw new Error("UPLOAD_FAILED")
  }

  const uploaded = (await response.json()) as UploadedFile[]
  const id = uploaded?.[0]?.id
  if (id == null) {
    throw new Error("UPLOAD_FAILED")
  }
  return id
}

/**
 * Best-effort cleanup of already-uploaded files after a downstream failure.
 * Never throws: the caller is already returning an error and a cleanup failure
 * must not replace it.
 */
async function deleteUploadedFiles(ids: number[]): Promise<void> {
  if (ids.length === 0) return

  // A missing write key is exactly why some callers reach here; it must not
  // turn the cleanup into a second failure.
  let key: string
  try {
    key = serverApiKey()
  } catch {
    return
  }

  await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await fetch(
          `${env.STRAPI_URL}/api/upload/files/${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${key}` },
          }
        )
        if (!response.ok) {
          console.error(
            "[VenueRegister] cleanup delete failed:",
            id,
            response.status
          )
        }
      } catch (error) {
        console.error("[VenueRegister] cleanup delete error:", id, error)
      }
    })
  )
}

/** A form field that may legitimately be absent; blank means absent. */
function optionalField(form: FormData, key: string): string | undefined {
  const value = form.get(key)
  if (typeof value !== "string") return undefined
  return value.trim() || undefined
}

/** Does this entry look like a file the browser attached (vs. a text field)? */
function isFileEntry(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    "type" in value
  )
}

/**
 * Validate one attached image, or REJECT the whole request.
 *
 * This deliberately throws rather than returning a boolean the caller can skip
 * on. Silently dropping an oversized or wrong-type file and still answering 201
 * loses the applicant's media behind a success message — and this is a one-shot
 * form, so they never find out and cannot resubmit (the second attempt earns an
 * `EMAIL_ALREADY_REGISTERED`). An empty entry (`size === 0`) is the browser's
 * "no file chosen" placeholder and is the one case that IS skippable.
 */
function assertAcceptableImage(file: File): boolean {
  if (file.size === 0) return false
  if (file.size > MAX_IMAGE_BYTES) {
    throw new RouteError("IMAGE_TOO_LARGE", 400)
  }
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new RouteError("IMAGE_TYPE_INVALID", 400)
  }
  return true
}

export async function POST(request: Request) {
  // Ids of files already uploaded in this request — rolled back on failure.
  const uploadedIds: number[] = []

  try {
    // 1. Rate limit (per IP, 5 / 15 min).
    const ip = getClientIp(request)
    const { success, reset } = venueRegistrationLimiter.check(ip)

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

    // 2. Multipart parse. Text fields are flat; files come as `logo` + `images`.
    //    `formData()` THROWS on a non-multipart body (a JSON post, a truncated
    //    upload). That is malformed input, so it answers 400 VALIDATION_FAILED
    //    rather than falling through to the catch-all's 500.
    let form: FormData
    try {
      form = await request.formData()
    } catch (error) {
      console.error("[VenueRegister] malformed multipart body:", error)
      return NextResponse.json(
        { success: false, error: "VALIDATION_FAILED" },
        { status: 400 }
      )
    }

    const recaptchaToken = optionalField(form, "recaptchaToken")

    const capacityRaw = optionalField(form, "capacity")
    // These flat keys are the wire contract with `VenueRegistrationForm`'s
    // `body.append(...)` calls; `route.test.ts` pins them so a rename on either
    // side fails a test instead of silently emptying a field.
    const payload = {
      venue: {
        name: form.get("name"),
        description: optionalField(form, "description"),
        address: form.get("address"),
        type: form.get("type"),
        phone: form.get("phone"),
        email: form.get("venueEmail"),
        website: optionalField(form, "website"),
        capacity: capacityRaw != null ? Number(capacityRaw) : undefined,
      },
      manager: {
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("managerEmail"),
        password: form.get("password"),
        preferredLanguage: optionalField(form, "preferredLanguage"),
      },
    }

    // 3. Validate BEFORE uploading anything — a rejected application must not
    //    leave orphaned media behind.
    const result = venueRegistrationSchema.safeParse(payload)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_FAILED",
          details: result.error.flatten(),
        },
        { status: 400 }
      )
    }

    // 4. reCAPTCHA (only enforced when a secret is configured, matching the
    //    contribute precedent).
    //
    //    OPERATOR NOTE — `RECAPTCHA_SECRET_KEY` and
    //    `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` are a PAIR and must be set together.
    //    Nothing in `env.mjs` couples them: the secret alone turns this branch
    //    on while the browser has no site key to mint a token with, so every
    //    application is rejected with RECAPTCHA_REQUIRED. Setting the site key
    //    alone is harmless (tokens are minted and ignored).
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

    // 5. Media pre-flight, BEFORE any upload. An unacceptable file is a 400
    //    with its own CODE; it is never skipped (see `assertAcceptableImage`).
    const logo = form.get("logo")
    const imageEntries = form.getAll("images").filter(isFileEntry)

    if (imageEntries.length > MAX_IMAGES) {
      throw new RouteError("IMAGES_TOO_MANY", 400)
    }

    const acceptedLogo =
      isFileEntry(logo) && assertAcceptableImage(logo) ? logo : undefined
    const acceptedImages = imageEntries.filter(assertAcceptableImage)

    // 6. Uploads. Files must exist before the venue can reference them.
    let logoId: number | undefined
    if (acceptedLogo) {
      logoId = await uploadFile(acceptedLogo)
      uploadedIds.push(logoId)
    }

    const imageIds: number[] = []
    for (const entry of acceptedImages) {
      const id = await uploadFile(entry)
      imageIds.push(id)
      uploadedIds.push(id)
    }

    // 7. Forward the application. The API token stays server-side.
    const response = await fetch(`${env.STRAPI_URL}/api/venues/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverApiKey()}`,
      },
      body: JSON.stringify({
        venue: {
          ...result.data.venue,
          ...(logoId != null ? { logo: logoId } : {}),
          ...(imageIds.length > 0 ? { images: imageIds } : {}),
        },
        manager: result.data.manager,
      }),
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      // Relay the backend's error CODE (never its message) and roll the media
      // back so a failed application leaves nothing behind.
      await deleteUploadedFiles(uploadedIds)

      // The shared Strapi limiter answers
      // `{error:{status:429,name:"TooManyRequestsError",message:"RATE_LIMITED"}}`
      // — no `details.code`, no `code` — so the generic fallback would tell the
      // applicant "please try again", inviting an instantly-throttled retry.
      // A 429 is always RATE_LIMIT_EXCEEDED whatever the body looks like.
      const fallback =
        response.status === 429
          ? "RATE_LIMIT_EXCEEDED"
          : "VENUE_REGISTRATION_FAILED"

      const code: string =
        body?.error?.details?.code ?? body?.error?.code ?? fallback

      console.error(
        "[VenueRegister] Strapi rejected the application:",
        response.status,
        code
      )

      return NextResponse.json(
        { success: false, error: code },
        { status: response.status }
      )
    }

    // A 2xx is not proof of a registration: an empty or unexpected body means
    // the venue may not exist, and rendering the "under review" panel for it
    // tells the applicant their application is filed when nothing was created.
    const venueDocumentId = body?.data?.venueDocumentId
    if (typeof venueDocumentId !== "string" || venueDocumentId.length === 0) {
      await deleteUploadedFiles(uploadedIds)
      console.error(
        "[VenueRegister] Strapi answered",
        response.status,
        "with no venueDocumentId:",
        JSON.stringify(body)
      )
      return NextResponse.json(
        { success: false, error: "VENUE_REGISTRATION_FAILED" },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          venueDocumentId,
          status: body?.data?.status ?? "pending",
        },
      },
      { status: 201 }
    )
  } catch (error) {
    // Any throw after an upload (including UPLOAD_FAILED itself) rolls the
    // already-uploaded files back before answering.
    await deleteUploadedFiles(uploadedIds)

    if (error instanceof RouteError) {
      // A deliberate rejection (bad media, missing write key) — its own code
      // and status, no generic 500.
      return NextResponse.json(
        { success: false, error: error.code },
        { status: error.status }
      )
    }

    const code =
      error instanceof Error && error.message === "UPLOAD_FAILED"
        ? "UPLOAD_FAILED"
        : "VENUE_REGISTRATION_FAILED"

    console.error("[VenueRegister] Unexpected error:", error)

    return NextResponse.json({ success: false, error: code }, { status: 500 })
  }
}
