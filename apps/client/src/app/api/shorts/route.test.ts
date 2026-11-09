// @vitest-environment node
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Contract tests for `GET /api/shorts`: ratings are out of v1, so the route
 * neither filters nor sorts by rating, whatever an old shared link carries.
 */

const getShortFilms = vi.fn()
const searchShortFilms = vi.fn()

vi.mock("@/lib/strapi-api/content/shorts", () => ({
  getShortFilms: (...args: unknown[]) => getShortFilms(...args),
  searchShortFilms: (...args: unknown[]) => searchShortFilms(...args),
}))

const { GET } = await import("./route")

const EMPTY = { shorts: [], total: 0, page: 1, pageSize: 24, hasMore: false }

function get(query: string) {
  return GET(new NextRequest(`http://localhost/api/shorts?${query}`))
}

function forwardedFilters() {
  const [, options] = getShortFilms.mock.calls[0]!
  return (options as { filters: Record<string, unknown> }).filters
}

beforeEach(() => {
  getShortFilms.mockReset().mockResolvedValue(EMPTY)
  searchShortFilms.mockReset().mockResolvedValue(EMPTY)
})

describe("GET /api/shorts", () => {
  it("falls back to the latest sort when asked to sort by rating", async () => {
    const response = await get("sortBy=rating&locale=fr")

    expect(response.status).toBe(200)
    expect(forwardedFilters().sortBy).toBe("latest")
  })

  it("ignores a rating filter param", async () => {
    await get("rating=8&locale=fr")

    expect(forwardedFilters().rating).toBeUndefined()
  })

  it("still honours the supported sort keys", async () => {
    await get("sortBy=duration&sortOrder=asc")

    expect(forwardedFilters()).toMatchObject({
      sortBy: "duration",
      sortOrder: "asc",
    })
  })
})
