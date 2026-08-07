// @vitest-environment node
/**
 * Purchase-flag gating of the public proxy (Story 3.12, defense in depth).
 *
 * With the flag OFF, `api/ticketing/orders` (and everything below it) must be
 * answered locally with an error CODE and NEVER forwarded to Strapi — the UI
 * calling it is already hidden, this is the wire-level backstop. Ticket
 * VIEWING (`api/ticketing/my-tickets`) stays open, and flipping the flag ON
 * restores forwarding with zero code changes.
 *
 * The allow-list + auth-header module is mocked (its own behavior is covered
 * by `request-auth.test.ts`); `fetch` is stubbed so "forwarded" is observable.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

// The route imports `@/env.mjs`, which validates on import — seed the required
// server vars before the dynamic import below (same pattern as the other
// node-environment route suites).
process.env.NODE_ENV = "development"
process.env.APP_PUBLIC_URL ||= "http://localhost:3000"
process.env.STRAPI_URL ||= "http://strapi.test"
process.env.STRAPI_REST_READONLY_API_KEY ||= "test-key"

const { purchaseFlag } = vi.hoisted(() => ({
  purchaseFlag: { enabled: false },
}))

vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => purchaseFlag.enabled,
}))

// Allow everything at the allow-list layer so the tests isolate the flag gate.
vi.mock("@/lib/strapi-api/request-auth", () => ({
  isStrapiEndpointAllowed: () => true,
  createStrapiAuthHeader: async () => ({}),
}))

const fetchSpy = vi.fn(
  async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
)
vi.stubGlobal("fetch", fetchSpy)

const { POST, GET } = await import("./route")

function proxyRequest(slug: string[], method: string): Parameters<typeof POST> {
  const request = new Request(
    `http://localhost:3000/api/public-proxy/${slug.join("/")}`,
    {
      method,
      ...(method === "POST"
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }
        : {}),
    }
  )
  return [request, { params: Promise.resolve({ slug }) }]
}

beforeEach(() => {
  fetchSpy.mockClear()
  purchaseFlag.enabled = false
})

describe("public proxy purchase gate (flag OFF)", () => {
  it("rejects POST api/ticketing/orders with a 404 code and never forwards", async () => {
    const response = await POST(
      ...proxyRequest(["api", "ticketing", "orders"], "POST")
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe("ticket_purchase_disabled")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("also blocks the nested confirm path", async () => {
    const response = await POST(
      ...proxyRequest(["api", "ticketing", "orders", "TW-1", "confirm"], "POST")
    )

    expect(response.status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("keeps ticket VIEWING open (my-tickets is forwarded)", async () => {
    const response = await GET(
      ...proxyRequest(["api", "ticketing", "my-tickets"], "GET")
    )

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe("public proxy purchase gate (flag ON)", () => {
  it("forwards api/ticketing/orders unchanged", async () => {
    purchaseFlag.enabled = true

    const response = await POST(
      ...proxyRequest(["api", "ticketing", "orders"], "POST")
    )

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
