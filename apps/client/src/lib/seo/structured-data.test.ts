import { describe, expect, it } from "vitest"

import type { StrapiEvent, StrapiScreening } from "@/features/events/types"

import { generateEventJsonLd } from "./structured-data"

/**
 * Pins the JSON-LD `Offer.availability` logic (structured-data.ts), which now
 * derives availability from the server-computed `soldOut` boolean instead of the
 * (no-longer-exposed) raw `ticketsAvailable` count. A screening is available
 * when `!soldOut`; unknown inventory (`soldOut` absent) is treated as available.
 */

const BASE_URL = "https://tiween.tn"

function makeEvent(screenings: Partial<StrapiScreening>[]): StrapiEvent {
  return {
    id: 1,
    documentId: "e1",
    title: "Dune",
    slug: "dune",
    featured: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    publishedAt: "2026-07-01T00:00:00.000Z",
    locale: "fr",
    startDate: "2026-07-20T20:00:00.000Z",
    endDate: "2026-07-20T22:00:00.000Z",
    status: "scheduled",
    startDateTime: "2026-07-20T20:00:00.000Z",
    category: "movie_screening",
    screenings: screenings as StrapiScreening[],
  } as StrapiEvent
}

function availabilityOf(event: StrapiEvent): string | undefined {
  const jsonLd = generateEventJsonLd(event, BASE_URL)
  const offers = jsonLd.offers
  const offer = Array.isArray(offers) ? offers[0] : offers
  return offer?.availability
}

describe("generateEventJsonLd availability", () => {
  it("marks the offer InStock when at least one priced screening is not sold-out", () => {
    const event = makeEvent([
      { price: 15, soldOut: true },
      { price: 20, soldOut: false },
    ])
    expect(availabilityOf(event)).toBe("InStock")
  })

  it("marks the offer SoldOut when every priced screening is sold-out", () => {
    const event = makeEvent([
      { price: 15, soldOut: true },
      { price: 20, soldOut: true },
    ])
    expect(availabilityOf(event)).toBe("SoldOut")
  })

  it("treats a screening with no soldOut flag as available (unknown ⇒ InStock)", () => {
    const event = makeEvent([{ price: 15 }])
    expect(availabilityOf(event)).toBe("InStock")
  })
})
