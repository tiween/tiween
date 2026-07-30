import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Mock } from "vitest"

import { PublicStrapiClient } from "@/lib/strapi-api"

import { getVenuesForSelector } from "./venues"

// Mock the Strapi client so no network/Strapi boot is needed.
vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

const fetchAPI = PublicStrapiClient.fetchAPI as unknown as Mock

function selectorResponse(
  data: Array<Record<string, unknown>>,
  total = data.length
) {
  return {
    data,
    meta: {
      pagination: { page: 1, pageSize: 100, pageCount: 1, total },
    },
  }
}

beforeEach(() => {
  fetchAPI.mockReset()
})

describe("getVenuesForSelector", () => {
  it("hits the dedicated selector route with FLAT params, cinema by default", async () => {
    fetchAPI.mockResolvedValue(selectorResponse([]))

    await getVenuesForSelector("fr")

    expect(fetchAPI).toHaveBeenCalledWith(
      "/venues/venues/selector",
      expect.objectContaining({
        locale: "fr",
        type: "cinema",
        page: 1,
        pageSize: 100,
      }),
      expect.anything()
    )
    // No nested filters/populate passthrough — the route takes typed params only.
    const params = fetchAPI.mock.calls[0][1]
    expect(params).not.toHaveProperty("filters")
    expect(params).not.toHaveProperty("populate")
  })

  it("forwards city / region / include / pageSize as flat params", async () => {
    fetchAPI.mockResolvedValue(selectorResponse([]))

    await getVenuesForSelector("en", {
      type: "theater",
      cityDocumentId: "city-1",
      regionDocumentId: "region-1",
      includeDocumentId: "venue-9",
      pageSize: 50,
    })

    expect(fetchAPI).toHaveBeenCalledWith(
      "/venues/venues/selector",
      expect.objectContaining({
        locale: "en",
        type: "theater",
        city: "city-1",
        region: "region-1",
        include: "venue-9",
        pageSize: 50,
      }),
      expect.anything()
    )
  })

  it("omits absent optional scopes entirely", async () => {
    fetchAPI.mockResolvedValue(selectorResponse([]))

    await getVenuesForSelector("fr", {})

    const params = fetchAPI.mock.calls[0][1]
    expect(params).not.toHaveProperty("city")
    expect(params).not.toHaveProperty("region")
    expect(params).not.toHaveProperty("include")
  })

  it("maps the response to venues + total and reports truncation", async () => {
    fetchAPI.mockResolvedValue(
      selectorResponse(
        [
          { documentId: "v1", name: "Pathé", type: "cinema", city: "Tunis" },
          { documentId: "v2", name: "Le Colisée", type: "cinema" },
        ],
        140
      )
    )

    const result = await getVenuesForSelector("fr")

    expect(result).toEqual({
      venues: [
        { documentId: "v1", name: "Pathé", type: "cinema", city: "Tunis" },
        {
          documentId: "v2",
          name: "Le Colisée",
          type: "cinema",
          city: undefined,
        },
      ],
      total: 140,
      truncated: true,
    })
  })

  it("is not truncated when total matches the returned page", async () => {
    fetchAPI.mockResolvedValue(
      selectorResponse([{ documentId: "v1", name: "A", type: "cinema" }], 1)
    )

    const result = await getVenuesForSelector("fr")

    expect(result.total).toBe(1)
    expect(result.truncated).toBe(false)
  })

  it("stays truncated when an off-page `include` inflates the returned page", async () => {
    // The server prepends the active selection WITHOUT inflating `total`, so a
    // length-based comparison would read a genuinely capped list as complete.
    const rows = Array.from({ length: 4 }, (_, i) => ({
      documentId: `v${i}`,
      name: `Venue ${i}`,
      type: "cinema",
    }))
    // Scoped set of 4, page size 3 ⇒ one venue is genuinely unreachable, but
    // the prepended include brings the returned rows back up to 4.
    fetchAPI.mockResolvedValue(selectorResponse(rows, 4))

    const result = await getVenuesForSelector("fr", {
      pageSize: 3,
      includeDocumentId: "v3",
    })

    expect(result.venues).toHaveLength(4)
    expect(result.total).toBe(4)
    expect(result.truncated).toBe(true)
  })

  it("returns a FRESH empty result each failure (never a shared object)", async () => {
    fetchAPI.mockRejectedValue(new Error("boom"))
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const first = await getVenuesForSelector("fr")
    first.venues.push({ documentId: "poison", name: "Poison" })
    const second = await getVenuesForSelector("fr")

    expect(second.venues).toEqual([])

    spy.mockRestore()
  })

  it("fails soft on an upstream error", async () => {
    fetchAPI.mockRejectedValue(new Error("boom"))
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(getVenuesForSelector("fr")).resolves.toEqual({
      venues: [],
      total: 0,
      truncated: false,
    })

    spy.mockRestore()
  })

  it("tolerates a garbage response shape", async () => {
    fetchAPI.mockResolvedValue({})

    await expect(getVenuesForSelector("fr")).resolves.toEqual({
      venues: [],
      total: 0,
      truncated: false,
    })
  })
})
