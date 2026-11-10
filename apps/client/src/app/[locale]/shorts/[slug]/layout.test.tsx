// @vitest-environment node
/**
 * THE TRACER TEST for Phase 2: drives the real fetcher, mapper, `[slug]`
 * layout guard and page against a stubbed network.
 *
 * Only the edges are faked: the global `fetch` (Strapi), the Strapi base URL
 * and auth header, Next's `notFound`/`connection`, next-intl and the detail
 * component (which captures its props). `PublicClient`, the base client's
 * error envelope, `getShortFilm`, the error mapping, the mapper, the layout
 * and the page are all real, so a wrong query key, a mis-mapped director or an
 * outage turned into a 404 fails here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm } from "@/features/shorts/types"

import {
  detailDto,
  errorBody,
} from "../../../../../test/fixtures/short-film-api"

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    // Mirrors the real implementation, which throws to halt rendering.
    throw new Error("NEXT_NOT_FOUND")
  }),
  connection: vi.fn(async () => {}),
  setRequestLocale: vi.fn(),
}))

vi.mock("@/env.mjs", () => ({ env: { STRAPI_URL: "http://strapi.test" } }))
vi.mock("@/lib/strapi-api/request-auth", () => ({
  createStrapiAuthHeader: vi.fn(async () => ({})),
}))
vi.mock("@/lib/strapi-api", async () => {
  const { PublicClient } = await import("@/lib/strapi-api/public")
  return { PublicStrapiClient: new PublicClient() }
})
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))
vi.mock("next/server", () => ({ connection: mocks.connection }))
vi.mock("next-intl/server", () => ({
  setRequestLocale: mocks.setRequestLocale,
}))
vi.mock("@/features/shorts/components", () => ({
  ShortFilmDetail: function ShortFilmDetail() {
    return null
  },
}))

const { default: ShortFilmLayout } = await import("./layout")
const { default: ShortFilmPage } = await import("./page")

const fetchMock = vi.fn()

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

interface DetailElement {
  props: { film: ShortFilm; relatedShorts: ShortFilm[] }
}

/** Layout first (the guard), then the page, as the request would run. */
async function visit(slug: string, locale = "fr") {
  const params = Promise.resolve({ locale, slug })
  await ShortFilmLayout({ children: "child", params })
  return (await ShortFilmPage({
    params: params as Promise<{ locale: "fr"; slug: string }>,
  })) as unknown as DetailElement
}

/** What the visit rejected with, or fail the test if it resolved. */
async function failure(slug: string, locale = "fr"): Promise<Error> {
  try {
    await visit(slug, locale)
  } catch (error) {
    return error as Error
  }
  throw new Error("expected the visit to reject")
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("tracer: a published film renders through the real path", () => {
  it("hands ShortFilmDetail the director from credits and the trailer from videos", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: detailDto() }))

    const element = await visit("khalaa", "ar")

    const { film } = element.props
    expect(film.title).toBe("Khalâa")
    expect(film.directors?.map((d) => d.name)).toEqual(["Maher"])
    expect(film.trailer).toBe("https://www.youtube.com/watch?v=abc")
    expect(film.streamingLinks).toHaveLength(1)
    expect(film.locale).toBe("fr")
    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  it("requests the short-films/<slug> path with only the locale key", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: detailDto() }))

    await visit("khalaa", "ar")

    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)))
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url.origin).toBe("http://strapi.test")
      expect(url.pathname).toBe(
        "/api/creative-works/creative-works/short-films/khalaa"
      )
      expect([...url.searchParams.keys()]).toEqual(["locale"])
      expect(url.searchParams.get("locale")).toBe("ar")
    }
  })

  it("registers the locale and renders without a static-params export", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: detailDto() }))

    await visit("khalaa", "en")

    expect(mocks.setRequestLocale).toHaveBeenCalledWith("en")
    expect(mocks.connection).toHaveBeenCalled()
    expect(await import("./page")).not.toHaveProperty("generateStaticParams")
    expect(await import("./layout")).not.toHaveProperty("generateStaticParams")
  })
})

describe("tracer: not found is a real 404", () => {
  it("calls notFound() for the API's SHORT_FILM_NOT_FOUND", async () => {
    fetchMock.mockImplementation(async () =>
      json(404, errorBody(404, "SHORT_FILM_NOT_FOUND", "Short film not found"))
    )

    const error = await failure("no-such-film")

    expect(error.message).toBe("NEXT_NOT_FOUND")
    expect(mocks.notFound).toHaveBeenCalled()
  })

  it("calls notFound() for a slug that fails the API pattern, without a request", async () => {
    const error = await failure("bad slug/with?chars")

    expect(error.message).toBe("NEXT_NOT_FOUND")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("calls notFound() for a locale outside fr|ar|en, without a request", async () => {
    const error = await failure("khalaa", "de")

    expect(error.message).toBe("NEXT_NOT_FOUND")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("tracer: an outage is a real 500, never a 404 or an empty shell", () => {
  it.each([
    ["a 404 without the API code", () => json(404, errorBody(404, null))],
    ["a 500", () => json(500, errorBody(500, "INTERNAL_ERROR"))],
    [
      "a 429 from the rate limiter",
      () => json(429, errorBody(429, null, "RATE_LIMITED")),
    ],
    [
      "a non-JSON body",
      () =>
        new Response("<html>Bad gateway</html>", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    ],
  ])("throws for %s", async (_name, respond) => {
    fetchMock.mockImplementation(async () => respond())

    const error = await failure("khalaa")

    expect(error.message).not.toBe("NEXT_NOT_FOUND")
    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  it("throws for a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))

    const error = await failure("khalaa")

    expect(error.message).not.toBe("NEXT_NOT_FOUND")
    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  it("recovers on the very next request once Strapi is back", async () => {
    fetchMock.mockImplementationOnce(async () =>
      json(500, errorBody(500, "INTERNAL_ERROR"))
    )
    await failure("khalaa")

    fetchMock.mockImplementation(async () => json(200, { data: detailDto() }))
    const element = await visit("khalaa")

    expect(element.props.film.title).toBe("Khalâa")
  })
})
