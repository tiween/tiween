/**
 * Tests for the public venue page (Story 7.2).
 *
 * This page is where a manager's saved edits become OBSERVABLE, and it carries
 * two pieces of untested logic: the `notFound()` split (an unknown slug and an
 * unpublished venue are deliberately indistinguishable) and the per-type
 * amenity rendering. Both are pure view logic over the whitelisted public
 * projection, so the read is mocked and the component is awaited directly —
 * it is an async Server Component, so `render(await Page(props))`.
 */
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  PublicVenue,
  VenuePropertyValue,
} from "@/features/venues/schemas/venue-profile"

import VenuePublicPage from "./page"

const { getVenueBySlugMock, notFoundMock } = vi.hoisted(() => ({
  getVenueBySlugMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    // The real `notFound()` throws to abort rendering; a mock that returns
    // would let the page carry on and dereference a null venue.
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

vi.mock("next/navigation", () => ({ notFound: notFoundMock }))

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  // Echo the key so every rendered label is queryable, and keep ICU values out
  // of it — the page must not push numbers through a placeholder.
  getTranslations: async () => (key: string) => key,
}))

vi.mock("@/lib/strapi-api/content/venues", () => ({
  getVenueBySlug: getVenueBySlugMock,
}))

vi.mock("@/features/events/components/Map", () => ({
  VenueMap: ({ venue }: { venue: { latitude: number; longitude: number } }) => (
    <div data-testid="venue-map">
      {venue.latitude},{venue.longitude}
    </div>
  ),
}))

const VENUE: PublicVenue = {
  documentId: "venue-1",
  name: "Le Rio",
  slug: "le-rio",
  description: "Une salle historique",
  address: "12 rue de Rome",
  type: "cinema",
  phone: "+21671000000",
  email: "contact@rio.test",
  website: "https://rio.test",
  capacity: 300,
  geo: { latitude: 36.8, longitude: 10.18 },
  logo: { id: 5, url: "/uploads/logo.png" },
  images: [{ id: 6, url: "/uploads/hall.png" }],
  city: { documentId: "city-1", name: "Tunis", slug: "tunis" },
  properties: [],
}

function definition(name: string, type: string) {
  return { documentId: `def-${name}`, name, slug: name, type }
}

async function renderPage(venue: PublicVenue | null) {
  getVenueBySlugMock.mockResolvedValue(venue)
  return render(
    await VenuePublicPage({
      params: Promise.resolve({ locale: "fr" as const, slug: "le-rio" }),
    })
  )
}

beforeEach(() => {
  getVenueBySlugMock.mockReset()
  notFoundMock.mockClear()
})

describe("VenuePublicPage", () => {
  it("renders the venue's public fields", async () => {
    await renderPage(VENUE)

    expect(screen.getByRole("heading", { name: "Le Rio" })).toBeTruthy()
    expect(screen.getByText("Une salle historique")).toBeTruthy()
    expect(screen.getByText("12 rue de Rome, Tunis")).toBeTruthy()
    expect(screen.getByText("+21671000000")).toBeTruthy()
    expect(screen.getByText("https://rio.test")).toBeTruthy()
    expect(document.querySelector('img[src="/uploads/logo.png"]')).toBeTruthy()
    expect(document.querySelector('img[src="/uploads/hall.png"]')).toBeTruthy()
    expect(screen.getByTestId("venue-map").textContent).toBe("36.8,10.18")
  })

  it("renders the capacity as a plain string (Western numerals in every locale)", async () => {
    await renderPage(VENUE)
    expect(screen.getByText("capacity: 300")).toBeTruthy()
  })

  it("calls notFound() when the read returns null", async () => {
    getVenueBySlugMock.mockResolvedValue(null)

    await expect(
      VenuePublicPage({
        params: Promise.resolve({ locale: "fr" as const, slug: "ghost" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFoundMock).toHaveBeenCalled()
  })

  describe("amenities", () => {
    async function renderWithProperties(properties: VenuePropertyValue[]) {
      await renderPage({ ...VENUE, properties })
    }

    it("renders a boolean amenity as yes / no", async () => {
      await renderWithProperties([
        { definition: definition("Wheelchair", "boolean"), booleanValue: true },
        { definition: definition("Parking", "boolean"), booleanValue: false },
      ])

      expect(screen.getByText("Wheelchair: amenity.yes")).toBeTruthy()
      expect(screen.getByText("Parking: amenity.no")).toBeTruthy()
    })

    it("stringifies an integer amenity instead of Intl-formatting it", async () => {
      await renderWithProperties([
        { definition: definition("Screens", "integer"), integerValue: 12 },
      ])

      expect(screen.getByText("Screens: 12")).toBeTruthy()
    })

    it("renders string and enum amenities verbatim", async () => {
      await renderWithProperties([
        { definition: definition("Sound", "string"), stringValue: "Dolby" },
        { definition: definition("Seating", "enum"), enumValue: "fixed" },
      ])

      expect(screen.getByText("Sound: Dolby")).toBeTruthy()
      expect(screen.getByText("Seating: fixed")).toBeTruthy()
    })

    it("SKIPS an entry whose definition failed to populate", async () => {
      await renderWithProperties([
        { definition: null, booleanValue: true },
        { definition: definition("Wheelchair", "boolean"), booleanValue: true },
      ])

      // Exactly one row: a value with no label is dropped, never rendered bare.
      expect(document.querySelectorAll("li")).toHaveLength(1)
      expect(screen.getByText("Wheelchair: amenity.yes")).toBeTruthy()
    })

    it("SKIPS an entry whose value is missing for its declared type", async () => {
      await renderWithProperties([
        { definition: definition("Screens", "integer"), integerValue: null },
        { definition: definition("Mystery", "relation"), stringValue: "x" },
      ])

      expect(document.querySelectorAll("li")).toHaveLength(0)
    })

    it("renders BOTH amenities when two definitions share a label", async () => {
      // The row key used to be the label alone; a collision silently dropped
      // one of the two rows.
      await renderWithProperties([
        { definition: definition("Screens", "integer"), integerValue: 3 },
        {
          definition: {
            documentId: "def-other",
            name: "Screens",
            type: "integer",
          },
          integerValue: 7,
        },
      ])

      expect(document.querySelectorAll("li")).toHaveLength(2)
      expect(screen.getByText("Screens: 3")).toBeTruthy()
      expect(screen.getByText("Screens: 7")).toBeTruthy()
    })

    it("renders no amenities section at all when nothing survives", async () => {
      await renderWithProperties([])
      expect(screen.queryByText("sections.amenities")).toBeNull()
    })
  })
})
