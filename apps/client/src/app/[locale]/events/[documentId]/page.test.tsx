/**
 * Serializability guard for the `/[locale]/events/[documentId]` detail route.
 *
 * This route built `priceFrom` / `ticketsAvailable` as arrow functions and
 * handed them to the `EventDetailPage` island, so it crashed with "Functions
 * cannot be passed directly to Client Components" exactly like the homepage and
 * the listing. Both siblings carry this guard; without it here, a re-introduced
 * parameterized label on the detail route would ship green.
 *
 * Mirrors `../page.test.tsx` and `../../page.test.tsx`: data reads are mocked,
 * the async Server Component is awaited directly, and every prop handed to the
 * mocked island is walked for function values.
 */
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { assertNoFunctionProps } from "../../../../../test/assert-serializable-props"
import EventDetailRoute from "./page"

const {
  getEventByDocumentIdMock,
  getRelatedEventsByParamsMock,
  detailPropsSpy,
} = vi.hoisted(() => ({
  getEventByDocumentIdMock: vi.fn(),
  getRelatedEventsByParamsMock: vi.fn(),
  detailPropsSpy: vi.fn(),
}))

vi.mock("next-intl/server", () => {
  // The route reads `dateRange` via `t.raw(...)`, so the echoing translator
  // needs the same `.raw` surface the real one exposes.
  const translator = Object.assign((key: string) => key, {
    raw: (key: string) => key,
  })
  return {
    setRequestLocale: vi.fn(),
    getTranslations: async () => translator,
  }
})

// Fully stubbed (no importOriginal): the real module drags in the Strapi client
// and its env validation.
vi.mock("@/lib/strapi-api/content/server", () => ({
  getEventByDocumentId: getEventByDocumentIdMock,
  getRelatedEventsByParams: getRelatedEventsByParamsMock,
}))

// The JSON-LD chain reaches `lib/feature-flags` → `env.mjs`, whose schema
// rejects NODE_ENV=test at import time. Structured data is irrelevant to the
// prop-shape contract under test, so stub the whole chain out.
vi.mock("@/lib/seo", () => ({
  generateEventJsonLd: () => ({}),
  generateBreadcrumbJsonLd: () => ({}),
}))

vi.mock("@/components/seo", () => ({
  JsonLd: () => null,
}))

vi.mock("@/features/events/utils", () => ({
  getEventFilm: () => ({ title: "Le Film", type: "film" }),
  mapTypeToCategory: () => "Cinéma",
  toAbsoluteMediaUrl: () => undefined,
}))

// The island pulls in next/navigation, next-auth and react-query — none of
// which matter for the prop-shape contract under test. The factory is hoisted,
// so React is imported inside it.
vi.mock("@/features/events/components", async () => {
  const ReactModule = await import("react")
  return {
    EventDetailPage: (props: Record<string, unknown>) => {
      detailPropsSpy(props)
      return ReactModule.createElement("div", {
        "data-testid": "event-detail-page",
      })
    },
  }
})

beforeEach(() => {
  detailPropsSpy.mockReset()
  getEventByDocumentIdMock.mockReset().mockResolvedValue({
    id: 1,
    documentId: "evt-1",
    title: "Le Film",
    venue: { documentId: "venue-1" },
  })
  getRelatedEventsByParamsMock.mockReset().mockResolvedValue([])
})

describe("EventDetailRoute prop serializability", () => {
  it("hands the client island props with no function values anywhere", async () => {
    render(
      await EventDetailRoute({
        params: Promise.resolve({
          locale: "fr" as const,
          documentId: "evt-1",
        }),
      })
    )

    expect(detailPropsSpy).toHaveBeenCalled()
    const props = detailPropsSpy.mock.calls[0]![0] as Record<string, unknown>
    // Guard the WHOLE prop object, not just `labels`: `event` and
    // `relatedEvents` cross the same boundary.
    expect(props.labels).toBeDefined()
    expect(() => assertNoFunctionProps(props)).not.toThrow()
  })
})
