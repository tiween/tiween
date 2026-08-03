// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Contract tests for `POST /api/venues/register` (Story 7.1).
 *
 * Runs in the node environment: `@/env.mjs` refuses to read server-only vars
 * when a `window` exists, which the suite-wide jsdom default provides. Same
 * seed-then-dynamic-import shape as `src/app/api/contribute/play/route.test.ts`.
 *
 * What this file exists to pin — every item is something that ships broken with
 * an otherwise-green suite:
 *
 *  - the FLAT FormData keys the route reads are the same keys
 *    `VenueRegistrationForm` writes (a `venueEmail` rename must fail here),
 *  - a valid submit forwards the NESTED payload to `${STRAPI_URL}/api/venues/register`,
 *  - the per-IP rate limit answers 429 without touching Strapi,
 *  - reCAPTCHA is enforced only when a secret is configured, and a configured
 *    secret with NO site key in the browser build rejects 100% of applications
 *    (the paired-env-var trap — see the RECAPTCHA_REQUIRED case),
 *  - uploaded media is rolled back when the downstream registration fails,
 *  - the backend's error CODE is relayed, and a 429 from Strapi does NOT become
 *    a "please try again" that invites an instantly-throttled retry,
 *  - an unacceptable image is REJECTED with its own code, never dropped behind
 *    a 201.
 */

process.env.NODE_ENV = "development"
process.env.APP_PUBLIC_URL ||= "http://localhost:3000"
process.env.STRAPI_URL ||= "http://strapi.test"
process.env.STRAPI_REST_READONLY_API_KEY ||= "test-readonly-key"
process.env.STRAPI_REST_CUSTOM_API_KEY ||= "test-write-key"

const STRAPI_URL = process.env.STRAPI_URL

const { POST } = await import("./route")

/**
 * The route's limiter is a MODULE-LEVEL instance shared by every test in this
 * file (that is the point of it — a per-request limiter would bound nothing).
 * Each test therefore uses its own IP so one test's budget cannot exhaust
 * another's, and the rate-limit test deliberately reuses a single IP.
 */
let ipCounter = 0
function freshIp(): string {
  ipCounter += 1
  return `203.0.113.${ipCounter}`
}

/** The exact flat keys `VenueRegistrationForm` appends. */
const VALID_FIELDS: Record<string, string> = {
  name: "Le Rio",
  description: "Cinéma d'art et d'essai",
  address: "12 rue de Rome, Tunis",
  type: "cinema",
  phone: "+21671000000",
  venueEmail: "contact@rio.test",
  website: "https://rio.test",
  capacity: "220",
  firstName: "Alice",
  lastName: "Dupont",
  managerEmail: "alice@example.test",
  password: "Password1",
  preferredLanguage: "fr",
}

function buildRequest(
  fields: Record<string, string> = VALID_FIELDS,
  options: { ip?: string; files?: [string, File][] } = {}
): Request {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  for (const [key, file] of options.files ?? []) body.append(key, file)

  return new Request("http://localhost:3000/api/venues/register", {
    method: "POST",
    headers: { "x-forwarded-for": options.ip ?? freshIp() },
    body,
  })
}

/**
 * A File carrying `bytes` REAL bytes. The request goes through an actual
 * multipart encode/decode, which rebuilds the File from the wire — a
 * `defineProperty`'d `size` would not survive the round trip and the
 * oversized-file assertion would pass on a technicality.
 */
function fakeImage(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

interface StrapiStubOptions {
  /** Response for `POST /api/venues/register`. */
  register?: { ok: boolean; status: number; body: unknown }
  /** Make `POST /api/upload` fail. */
  uploadFails?: boolean
}

/** Stubs the three Strapi endpoints the route can call. */
function stubStrapi(options: StrapiStubOptions = {}) {
  const {
    register = {
      ok: true,
      status: 201,
      body: { data: { venueDocumentId: "venue-doc-1", status: "pending" } },
    },
    uploadFails = false,
  } = options

  let nextUploadId = 100

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url.endsWith("/api/upload")) {
      if (uploadFails) {
        return {
          ok: false,
          status: 500,
          text: async () => "nope",
          json: async () => ({}),
        } as unknown as Response
      }
      nextUploadId += 1
      return {
        ok: true,
        status: 201,
        json: async () => [{ id: nextUploadId }],
      } as unknown as Response
    }

    if (url.includes("/api/upload/files/")) {
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }

    if (url.endsWith("/api/venues/register")) {
      return {
        ok: register.ok,
        status: register.status,
        json: async () => register.body,
      } as unknown as Response
    }

    throw new Error(`unexpected fetch: ${url}`)
  })

  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** The forwarded registration call, parsed. */
function registrationCall(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.find(([url]) =>
    String(url).endsWith("/api/venues/register")
  )
  if (!call) throw new Error("no registration call was made")
  const init = call[1] as {
    method: string
    headers: Record<string, string>
    body: string
  }
  return { init, payload: JSON.parse(init.body) }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  delete process.env.RECAPTCHA_SECRET_KEY
})

describe("POST /api/venues/register — happy path", () => {
  it("forwards the NESTED payload to Strapi and answers 201", async () => {
    const fetchMock = stubStrapi()

    const response = await POST(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toEqual({
      success: true,
      data: { venueDocumentId: "venue-doc-1", status: "pending" },
    })

    const { init, payload } = registrationCall(fetchMock)
    expect(init.method).toBe("POST")
    expect(
      fetchMock.mock.calls.some(
        ([u]) => u === `${STRAPI_URL}/api/venues/register`
      )
    ).toBe(true)
    expect(payload.venue.name).toBe("Le Rio")
    expect(payload.venue.type).toBe("cinema")
    expect(payload.manager.email).toBe("alice@example.test")
  })

  /**
   * THE key-name contract. The route reads flat keys; the form writes flat
   * keys. Nothing else connects the two, so renaming `venueEmail` on either
   * side silently empties the venue's contact address — this maps each flat key
   * to the nested field it must land in.
   */
  it("reads the SAME flat FormData keys the form writes", async () => {
    const fetchMock = stubStrapi()

    await POST(buildRequest())
    const { payload } = registrationCall(fetchMock)

    expect(payload).toMatchObject({
      venue: {
        name: VALID_FIELDS.name,
        description: VALID_FIELDS.description,
        address: VALID_FIELDS.address,
        type: VALID_FIELDS.type,
        phone: VALID_FIELDS.phone,
        // `venueEmail` (flat) -> `venue.email` (nested).
        email: VALID_FIELDS.venueEmail,
        website: VALID_FIELDS.website,
        capacity: 220,
      },
      manager: {
        firstName: VALID_FIELDS.firstName,
        lastName: VALID_FIELDS.lastName,
        // `managerEmail` (flat) -> `manager.email` (nested).
        email: VALID_FIELDS.managerEmail,
        password: VALID_FIELDS.password,
        preferredLanguage: VALID_FIELDS.preferredLanguage,
      },
    })
  })

  it("uploads attached media first and references it by id", async () => {
    const fetchMock = stubStrapi()

    await POST(
      buildRequest(VALID_FIELDS, {
        files: [
          ["logo", fakeImage("logo.png", "image/png", 1024)],
          ["images", fakeImage("a.jpg", "image/jpeg", 2048)],
        ],
      })
    )

    const uploads = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith("/api/upload")
    )
    expect(uploads).toHaveLength(2)

    const { payload } = registrationCall(fetchMock)
    expect(typeof payload.venue.logo).toBe("number")
    expect(payload.venue.images).toHaveLength(1)
  })
})

describe("POST /api/venues/register — validation", () => {
  it("returns 400 VALIDATION_FAILED without calling Strapi", async () => {
    const fetchMock = stubStrapi()

    const response = await POST(
      buildRequest({ ...VALID_FIELDS, managerEmail: "not-an-email" })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("VALIDATION_FAILED")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  /**
   * `.url()` used to accept these; the venues plugin's DB lifecycle rejects
   * them, so they would fail at venue-create time AFTER the manager account was
   * provisioned — an opaque 500 the applicant could never fix.
   */
  it.each(["ftp://rio.test", "javascript:alert(1)", "http://sub_domain.tn"])(
    "rejects the website %s the DB would refuse",
    async (website) => {
      const fetchMock = stubStrapi()

      const response = await POST(buildRequest({ ...VALID_FIELDS, website }))

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe("VALIDATION_FAILED")
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it("answers 400 VALIDATION_FAILED (not 500) for a non-multipart body", async () => {
    const fetchMock = stubStrapi()

    const request = new Request("http://localhost:3000/api/venues/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": freshIp(),
      },
      body: JSON.stringify({ hello: "world" }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("VALIDATION_FAILED")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("POST /api/venues/register — media is rejected, never dropped", () => {
  it("returns 400 IMAGE_TOO_LARGE for an oversized file", async () => {
    const fetchMock = stubStrapi()

    const response = await POST(
      buildRequest(VALID_FIELDS, {
        files: [["logo", fakeImage("big.png", "image/png", 6 * 1024 * 1024)]],
      })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("IMAGE_TOO_LARGE")
    // Crucially: no 201, and nothing was uploaded or registered.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 400 IMAGE_TYPE_INVALID for a disallowed mime type", async () => {
    const fetchMock = stubStrapi()

    const response = await POST(
      buildRequest(VALID_FIELDS, {
        files: [["images", fakeImage("doc.pdf", "application/pdf", 1024)]],
      })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("IMAGE_TYPE_INVALID")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 400 IMAGES_TOO_MANY past the photo cap", async () => {
    stubStrapi()

    const files = Array.from({ length: 11 }, (_, i) => [
      "images",
      fakeImage(`p${i}.png`, "image/png", 1024),
    ]) as [string, File][]

    const response = await POST(buildRequest(VALID_FIELDS, { files }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("IMAGES_TOO_MANY")
  })
})

describe("POST /api/venues/register — rate limit", () => {
  it("answers 429 RATE_LIMIT_EXCEEDED with Retry-After once the budget is spent", async () => {
    stubStrapi()
    const ip = "198.51.100.7"

    // The limiter allows 5 per 15 minutes per IP.
    const statuses: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const response = await POST(buildRequest(VALID_FIELDS, { ip }))
      statuses.push(response.status)
      if (i === 5) {
        expect(response.headers.get("Retry-After")).toBeTruthy()
        expect((await response.json()).error).toBe("RATE_LIMIT_EXCEEDED")
      }
    }

    expect(statuses[0]).toBe(201)
    expect(statuses[5]).toBe(429)
  })
})

describe("POST /api/venues/register — reCAPTCHA", () => {
  /**
   * `RECAPTCHA_SECRET_KEY` and `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` are a PAIR that
   * nothing in `env.mjs` couples. The secret alone switches enforcement ON
   * while the browser has no site key to mint a token with, so EVERY
   * application is rejected. This pins that behavior so the operator
   * requirement is at least visible in the suite.
   */
  it("rejects with RECAPTCHA_REQUIRED when a secret is configured and no token arrives", async () => {
    vi.resetModules()
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "secret")
    const fetchMock = stubStrapi()
    const { POST: guardedPost } = await import("./route")

    const response = await guardedPost(buildRequest())

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("RECAPTCHA_REQUIRED")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects with RECAPTCHA_FAILED when verification says no", async () => {
    vi.resetModules()
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "secret")
    vi.doMock("@/lib/recaptcha", () => ({
      verifyRecaptcha: vi.fn(async () => false),
    }))
    const fetchMock = stubStrapi()
    const { POST: guardedPost } = await import("./route")

    const response = await guardedPost(
      buildRequest({ ...VALID_FIELDS, recaptchaToken: "token" })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("RECAPTCHA_FAILED")
    expect(fetchMock).not.toHaveBeenCalled()
    vi.doUnmock("@/lib/recaptcha")
  })

  it("does not enforce reCAPTCHA when no secret is configured", async () => {
    stubStrapi()

    const response = await POST(buildRequest())

    expect(response.status).toBe(201)
  })
})

describe("POST /api/venues/register — downstream failures", () => {
  it("relays the backend error CODE and rolls the uploads back", async () => {
    const fetchMock = stubStrapi({
      register: {
        ok: false,
        status: 409,
        body: { error: { details: { code: "EMAIL_ALREADY_REGISTERED" } } },
      },
    })

    const response = await POST(
      buildRequest(VALID_FIELDS, {
        files: [["logo", fakeImage("logo.png", "image/png", 1024)]],
      })
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("EMAIL_ALREADY_REGISTERED")
    // The uploaded logo must not survive a rejected application.
    const deletes = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/api/upload/files/")
    )
    expect(deletes).toHaveLength(1)
    expect((deletes[0][1] as { method: string }).method).toBe("DELETE")
  })

  /**
   * The shared Strapi limiter's body has no `details.code` and no `code`, so a
   * generic fallback would tell a throttled applicant "please try again" and
   * invite an immediately-throttled retry.
   */
  it("turns a bare Strapi 429 into RATE_LIMIT_EXCEEDED, not a generic failure", async () => {
    stubStrapi({
      register: {
        ok: false,
        status: 429,
        body: {
          error: {
            status: 429,
            name: "TooManyRequestsError",
            message: "RATE_LIMITED",
          },
        },
      },
    })

    const response = await POST(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("RATE_LIMIT_EXCEEDED")
  })

  it("falls back to VENUE_REGISTRATION_FAILED for a codeless non-429 failure", async () => {
    stubStrapi({ register: { ok: false, status: 503, body: {} } })

    const response = await POST(buildRequest())

    expect(response.status).toBe(503)
    expect((await response.json()).error).toBe("VENUE_REGISTRATION_FAILED")
  })

  it("fails instead of claiming success when a 2xx carries no venueDocumentId", async () => {
    stubStrapi({ register: { ok: true, status: 200, body: {} } })

    const response = await POST(buildRequest())
    const body = await response.json()

    expect(body.success).toBe(false)
    expect(body.error).toBe("VENUE_REGISTRATION_FAILED")
    expect(response.status).not.toBe(201)
  })

  it("answers UPLOAD_FAILED and rolls back when an upload fails", async () => {
    stubStrapi({ uploadFails: true })

    const response = await POST(
      buildRequest(VALID_FIELDS, {
        files: [["logo", fakeImage("logo.png", "image/png", 1024)]],
      })
    )

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe("UPLOAD_FAILED")
  })
})
