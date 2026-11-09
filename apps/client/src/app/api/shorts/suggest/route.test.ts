// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Contract tests for `POST /api/shorts/suggest`.
 *
 * What this file pins — each item shipped broken behind a green suite before:
 *
 *  - a Strapi rejection or outage is reported as `SUGGESTION_UNAVAILABLE`,
 *    never as `{ success: true }` (the route used to fake success and print
 *    the submitter's name and email to the logs),
 *  - the submitter's PII never reaches the logs,
 *  - malformed JSON and invalid fields answer `VALIDATION_ERROR` without
 *    touching Strapi,
 *  - the per-IP rate limit answers 429 with `Retry-After` and no Strapi call.
 */

process.env.STRAPI_URL ||= "http://strapi.test"
const STRAPI_URL = process.env.STRAPI_URL

const { POST } = await import("./route")

// Module-level limiter: every test gets its own IP so budgets never collide.
let ipCounter = 0
function freshIp(): string {
  ipCounter += 1
  return `198.51.100.${ipCounter}`
}

const VALID = {
  title: "Communion",
  director: "Nejib Ayed",
  year: 2021,
  duration: 18,
  genres: ["Drame"],
  submitterName: "Leïla Ben Salah",
  submitterEmail: "leila@example.test",
}

function request(body: unknown, ip = freshIp()) {
  return new Request("http://localhost/api/shorts/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Every argument passed to any console method, flattened to text. */
function loggedText(): string {
  return [console.error, console.warn, console.info]
    .flatMap((fn) => vi.mocked(fn).mock.calls)
    .map((args) => args.map(String).join(" "))
    .join("\n")
}

describe("POST /api/shorts/suggest", () => {
  it("forwards a valid suggestion to Strapi as pending and reports success", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))

    const response = await POST(request(VALID))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${STRAPI_URL}/api/short-film-suggestions`)
    const sent = JSON.parse((init as RequestInit).body as string)
    expect(sent.data).toMatchObject({
      title: "Communion",
      genres: "Drame",
      status: "pending",
    })
  })

  it("never reports success when Strapi rejects the suggestion", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }))

    const response = await POST(request(VALID))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      success: false,
      error: "SUGGESTION_UNAVAILABLE",
    })
  })

  it("reports an unreachable Strapi as unavailable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))

    const response = await POST(request(VALID))

    expect(response.status).toBe(503)
    expect((await response.json()).error).toBe("SUGGESTION_UNAVAILABLE")
  })

  it("keeps the submitter's name and email out of the logs on failure", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }))

    await POST(request(VALID))

    const logs = loggedText()
    expect(logs).not.toContain(VALID.submitterEmail)
    expect(logs).not.toContain(VALID.submitterName)
  })

  it("answers VALIDATION_ERROR for malformed JSON without calling Strapi", async () => {
    const response = await POST(request("{not json"))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("VALIDATION_ERROR")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["a missing title", { ...VALID, title: "   " }],
    ["an invalid email", { ...VALID, submitterEmail: "not-an-email" }],
    ["a feature-length duration", { ...VALID, duration: 95 }],
    ["an unknown platform", { ...VALID, platform: "tiktok" }],
    ["an oversized synopsis", { ...VALID, synopsis: "x".repeat(5000) }],
  ])("rejects %s without calling Strapi", async (_label, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("VALIDATION_ERROR")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rate-limits a burst from one IP with Retry-After and no Strapi call", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))
    const ip = freshIp()

    for (let i = 0; i < 5; i++) {
      expect((await POST(request(VALID, ip))).status).toBe(200)
    }
    fetchMock.mockClear()

    const limited = await POST(request(VALID, ip))

    expect(limited.status).toBe(429)
    expect((await limited.json()).error).toBe("RATE_LIMIT_EXCEEDED")
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
