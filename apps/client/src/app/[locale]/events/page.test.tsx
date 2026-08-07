/**
 * Tests for the `/[locale]/events` SSR listing route (Story 3.2).
 *
 * The route is where the validated URL `category` token either reaches
 * `fetchEvents` or is dropped — deleting the `category: filters.category`
 * forwarding line (or re-scoping the venue selector back to cinema) must break
 * a test, not just the browser. The data reads and the client island are
 * mocked; the async Server Component is awaited directly
 * (`render(await Page(props))`), like the venue page test.
 */
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import EventsListingRoute from "./page"

const { fetchEventsMock, getRegionsMock, getVenuesForSelectorMock } =
  vi.hoisted(() => ({
    fetchEventsMock: vi.fn(),
    getRegionsMock: vi.fn(),
    getVenuesForSelectorMock: vi.fn(),
  }))

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  // Echo the key so label building never throws on a missing message.
  getTranslations: async () => (key: string) => key,
}))

// Fully stubbed (no importOriginal): pulling the real module would drag in the
// Strapi client and its env validation. `buildDateRange` is pure and already
// unit-tested in events-extended.test.ts; an empty window is fine here.
vi.mock("@/lib/strapi-api/content/events-extended", () => ({
  fetchEvents: fetchEventsMock,
  buildDateRange: () => ({}),
}))

vi.mock("@/lib/strapi-api/content/geography", () => ({
  getRegions: getRegionsMock,
}))

vi.mock("@/lib/strapi-api/content/venues", () => ({
  getVenuesForSelector: getVenuesForSelectorMock,
}))

// The client island pulls in next/navigation, next-auth and react-query — none
// of which matter for the route's param-forwarding contract under test. The
// factory is hoisted, so React is imported inside it (a top-level reference
// would be undefined at mock time).
vi.mock("@/features/events/components", async () => {
  const ReactModule = await import("react")
  return {
    EventsListing: () =>
      ReactModule.createElement("div", { "data-testid": "events-listing" }),
  }
})

async function renderRoute(
  searchParams: Record<string, string | string[] | undefined>
) {
  return render(
    await EventsListingRoute({
      params: Promise.resolve({ locale: "fr" as const }),
      searchParams: Promise.resolve(searchParams),
    })
  )
}

beforeEach(() => {
  fetchEventsMock.mockReset().mockResolvedValue({ events: [], total: 0 })
  getRegionsMock.mockReset().mockResolvedValue([])
  getVenuesForSelectorMock
    .mockReset()
    .mockResolvedValue({ venues: [], total: 0, truncated: false })
})

describe("EventsListingRoute (Story 3.2 category wiring)", () => {
  it("forwards a valid category token to fetchEvents", async () => {
    await renderRoute({ category: "theater" })

    expect(fetchEventsMock).toHaveBeenCalledTimes(1)
    expect(fetchEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "fr", category: "theater" })
    )
  })

  it("drops an invalid category token before fetchEvents (no category key)", async () => {
    await renderRoute({ category: "bogus" })

    expect(fetchEventsMock).toHaveBeenCalledTimes(1)
    const arg = fetchEventsMock.mock.calls[0][0]
    expect(arg.category).toBeUndefined()
  })

  it("fetches with no category when the param is absent (all categories)", async () => {
    await renderRoute({})

    const arg = fetchEventsMock.mock.calls[0][0]
    expect(arg.category).toBeUndefined()
  })

  it("un-scopes the venue selector with type: null (multi-category listing)", async () => {
    await renderRoute({ category: "music" })

    expect(getVenuesForSelectorMock).toHaveBeenCalledWith(
      "fr",
      expect.objectContaining({ type: null })
    )
  })
})
