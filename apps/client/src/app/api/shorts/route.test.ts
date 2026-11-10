// @vitest-environment node
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ShortFilmApiError } from "@/lib/strapi-api/content/shorts.errors"

/**
 * Contract tests for `GET /api/shorts`, the load-more endpoint (D-03, T-02-01):
 * a closed query (`locale`, `page`), a server-fixed page size, 400 for bad
 * input and 502 (never a 200 with an empty list) for an upstream failure.
 */

const getShortFilmsPage = vi.hoisted(() => vi.fn())

vi.mock("@/lib/strapi-api/content/shorts", () => ({
  SHORT_FILM_PAGE_SIZE: 24,
  getShortFilmsPage,
}))

const { GET } = await import("./route")

const PAGE = { shorts: [], total: 0, page: 1, pageSize: 24, hasMore: false }

function get(query: string) {
  return GET(new NextRequest(`http://localhost/api/shorts?${query}`))
}

beforeEach(() => {
  getShortFilmsPage.mockReset().mockResolvedValue(PAGE)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("GET /api/shorts: validation", () => {
  it.each([
    ["an unknown query key", "locale=fr&page=1&x=1"],
    ["a caller-chosen pageSize", "locale=fr&page=1&pageSize=48"],
    ["a sort key", "locale=fr&page=1&sort=title:asc"],
    ["a genre filter", "locale=fr&page=1&genre=drame"],
    ["no locale", "page=1"],
    ["an unsupported locale", "locale=de&page=1"],
    ["a numeric locale", "locale=1&page=1"],
    ["page 0", "locale=fr&page=0"],
    ["page 501", "locale=fr&page=501"],
    ["a non-numeric page", "locale=fr&page=abc"],
    ["a fractional page", "locale=fr&page=1.5"],
    ["a missing page", "locale=fr"],
  ])("answers 400 VALIDATION_FAILED for %s", async (_why, query) => {
    const response = await get(query)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "VALIDATION_FAILED" })
    expect(getShortFilmsPage).not.toHaveBeenCalled()
  })

  it("never echoes the input back", async () => {
    const response = await get("locale=fr&page=1&evil=%3Cscript%3E")

    expect(JSON.stringify(await response.json())).not.toContain("script")
  })
})

describe("GET /api/shorts: success", () => {
  it("calls the fetcher with the validated locale and page and a fixed pageSize", async () => {
    getShortFilmsPage.mockResolvedValue({ ...PAGE, page: 3, hasMore: true })

    const response = await get("locale=ar&page=3")

    expect(response.status).toBe(200)
    expect(getShortFilmsPage).toHaveBeenCalledWith({
      locale: "ar",
      page: 3,
      pageSize: 24,
    })
    expect(await response.json()).toEqual({ ...PAGE, page: 3, hasMore: true })
  })

  it("accepts the page bounds 1 and 500", async () => {
    expect((await get("locale=en&page=1")).status).toBe(200)
    expect((await get("locale=en&page=500")).status).toBe(200)
  })
})

describe("GET /api/shorts: upstream failure", () => {
  it("answers 502 with the user-facing code, never a 200 with an empty list", async () => {
    getShortFilmsPage.mockRejectedValue(
      new ShortFilmApiError({ code: "INTERNAL_ERROR", kind: "UPSTREAM" })
    )

    const response = await get("locale=fr&page=2")

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" })
  })

  it("reports a network failure as NETWORK_ERROR", async () => {
    getShortFilmsPage.mockRejectedValue(
      new ShortFilmApiError({ code: "NETWORK_ERROR", kind: "NETWORK" })
    )

    const response = await get("locale=fr&page=2")

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "NETWORK_ERROR" })
  })

  it("collapses an unexpected throw to INTERNAL_ERROR", async () => {
    getShortFilmsPage.mockRejectedValue(new Error("boom"))

    const response = await get("locale=fr&page=2")

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" })
  })
})
