/**
 * Serializability guard for the `/[locale]` homepage Server Component.
 *
 * The homepage was the reported crash site: `buildLabels` handed
 * `bottomNav.unscannedTickets` / `.notifications` to a `"use client"` island as
 * arrow functions, and React refuses to serialize functions across the RSC
 * boundary ("Functions cannot be passed directly to Client Components").
 *
 * Mirrors `events/page.test.tsx`: the data reads are mocked, the async Server
 * Component is awaited directly, and the props handed to the mocked island are
 * walked for function values.
 */
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { assertNoFunctionProps } from "../../../test/assert-serializable-props"
import HomePageRoute from "./page"

const { getRegionsMock, getVenuesForSelectorMock, sliceMock, homePropsSpy } =
  vi.hoisted(() => ({
    getRegionsMock: vi.fn(),
    getVenuesForSelectorMock: vi.fn(),
    sliceMock: vi.fn(),
    homePropsSpy: vi.fn(),
  }))

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  // Echo the key so label building never throws on a missing message.
  getTranslations: async () => (key: string) => key,
}))

// Fully stubbed (no importOriginal): the real module drags in the Strapi client
// and its env validation. Every curated slice resolves empty, which is enough —
// the labels are built independently of the event data.
vi.mock("@/lib/strapi-api/content/events-extended", () => ({
  getFeaturedSlice: sliceMock,
  getTonightSlice: sliceMock,
  getThisWeekSlice: sliceMock,
  getTrendingSlice: sliceMock,
}))

vi.mock("@/lib/strapi-api/content/geography", () => ({
  getRegions: getRegionsMock,
}))

vi.mock("@/lib/strapi-api/content/venues", () => ({
  getVenuesForSelector: getVenuesForSelectorMock,
}))

// The JSON-LD chain reaches `lib/feature-flags` → `env.mjs`, whose schema
// rejects NODE_ENV=test at import time. Structured data is irrelevant to the
// prop-shape contract under test, so stub the whole chain out.
vi.mock("@/lib/seo", () => ({
  generateEventJsonLd: () => ({}),
  generateWebsiteJsonLd: () => ({}),
}))

vi.mock("@/components/seo", () => ({
  JsonLd: () => null,
}))

// The island pulls in next/navigation, next-auth and react-query — none of
// which matter for the prop-shape contract under test. The factory is hoisted,
// so React is imported inside it.
vi.mock("@/features/events/components/HomePage/HomePageWithVenue", async () => {
  const ReactModule = await import("react")
  return {
    HomePageWithVenue: (props: Record<string, unknown>) => {
      homePropsSpy(props)
      return ReactModule.createElement("div", { "data-testid": "home-page" })
    },
  }
})

beforeEach(() => {
  homePropsSpy.mockReset()
  sliceMock.mockReset().mockResolvedValue({ events: [], total: 0 })
  getRegionsMock.mockReset().mockResolvedValue([])
  getVenuesForSelectorMock
    .mockReset()
    .mockResolvedValue({ venues: [], truncated: false })
})

describe("HomePageRoute prop serializability", () => {
  it("hands the client island props with no function values anywhere", async () => {
    render(
      await HomePageRoute({
        params: Promise.resolve({ locale: "fr" as const }),
        searchParams: Promise.resolve({}),
      })
    )

    expect(homePropsSpy).toHaveBeenCalled()
    const props = homePropsSpy.mock.calls[0]![0] as Record<string, unknown>
    // Guard the WHOLE prop object, not just `labels`: the island also receives
    // `regions`/`venues`/event slices, any of which could carry a function.
    expect(props.labels).toBeDefined()
    expect(() => assertNoFunctionProps(props)).not.toThrow()
  })
})
