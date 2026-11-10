// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { detailDto, summaryDto } from "../../../../test/fixtures/short-film-api"
import {
  getRelatedShortFilms,
  getShortFilm,
  getShortFilmsPage,
  SHORT_FILM_PAGE_SIZE,
  SHORT_FILMS_TAG,
} from "./shorts"
import {
  isShortFilmNotFound,
  ShortFilmApiError,
  toShortFilmApiError,
  toUserErrorCode,
} from "./shorts.errors"

const fetchAPI = vi.hoisted(() => vi.fn())

vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI },
}))

/** The `Error(JSON.stringify(appError))` BaseStrapiClient.fetchAPI throws. */
function strapiFailure(
  status: number,
  code: string | null,
  extra: Record<string, unknown> = {}
) {
  return new Error(
    JSON.stringify({
      name: "ShortFilmError",
      message: "failed",
      details: code ? { code } : {},
      status,
      ...extra,
    })
  )
}

/** Parse the (path, params, init) of the most recent fetchAPI call. */
function lastCall() {
  const [path, params, init] = fetchAPI.mock.calls.at(-1) as [
    string,
    Record<string, unknown>,
    RequestInit & { next?: { revalidate?: number; tags?: string[] } },
  ]
  return { path, params, init }
}

beforeEach(() => {
  fetchAPI.mockReset()
})

describe("getShortFilm", () => {
  it("sends only the locale key and maps the detail response", async () => {
    fetchAPI.mockResolvedValue({ data: detailDto() })

    const film = await getShortFilm("khalaa", "ar")

    const { path, params } = lastCall()
    expect(path).toBe("/creative-works/creative-works/short-films/khalaa")
    expect(Object.keys(params)).toEqual(["locale"])
    expect(params.locale).toBe("ar")
    expect(film.title).toBe("Khalâa")
    expect(film.trailer).toBe("https://www.youtube.com/watch?v=abc")
  })

  it("sends the 60s revalidate, both cache tags and a timeout signal", async () => {
    fetchAPI.mockResolvedValue({ data: detailDto() })

    await getShortFilm("khalaa", "fr")

    const { init } = lastCall()
    expect(init.next?.revalidate).toBe(60)
    expect(init.next?.tags).toEqual([SHORT_FILMS_TAG, "short-film:khalaa"])
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("preserves the served locale reported by the API", async () => {
    fetchAPI.mockResolvedValue({ data: detailDto({ locale: "fr" }) })

    const film = await getShortFilm("khalaa", "ar")

    expect(film.locale).toBe("fr")
  })

  it.each([
    ["has a slash", "a/b"],
    ["has a space", "a b"],
    ["has a query", "a?b=c"],
    ["has a percent sequence", "%2e%2e"],
    ["is longer than 200 characters", "a".repeat(201)],
    ["is empty", ""],
  ])("rejects a slug that %s without calling the API", async (_why, slug) => {
    const error = await getShortFilm(slug, "fr").catch((e: unknown) => e)

    expect(isShortFilmNotFound(error)).toBe(true)
    expect(fetchAPI).not.toHaveBeenCalled()
  })

  it("accepts the full unreserved slug alphabet and 200 characters", async () => {
    fetchAPI.mockResolvedValue({ data: detailDto() })

    await getShortFilm("A.b.c~d-1", "fr")
    await getShortFilm("a".repeat(200), "fr")

    expect(fetchAPI).toHaveBeenCalledTimes(2)
  })

  it("maps the API's SHORT_FILM_NOT_FOUND to a not-found error", async () => {
    fetchAPI.mockRejectedValue(strapiFailure(404, "SHORT_FILM_NOT_FOUND"))

    const error = await getShortFilm("nope", "fr").catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ShortFilmApiError)
    expect(isShortFilmNotFound(error)).toBe(true)
  })

  it.each([
    ["a 404 without the API code", strapiFailure(404, null)],
    ["a 400", strapiFailure(400, "VALIDATION_FAILED")],
    ["a 429", strapiFailure(429, null, { message: "RATE_LIMITED" })],
    ["a 500", strapiFailure(500, "INTERNAL_ERROR")],
    ["a 502 with an empty body", strapiFailure(502, null)],
    [
      "a non-JSON body",
      new Error(
        JSON.stringify({
          name: "Invalid response format",
          message: "<html>Bad gateway</html>",
          status: 200,
        })
      ),
    ],
    ["an error whose message is not JSON", new Error("boom")],
  ])("treats %s as INTERNAL_ERROR, never as not found", async (_n, failure) => {
    fetchAPI.mockRejectedValue(failure)

    const error = (await getShortFilm("khalaa", "fr").catch(
      (e: unknown) => e
    )) as ShortFilmApiError

    expect(error).toBeInstanceOf(ShortFilmApiError)
    expect(isShortFilmNotFound(error)).toBe(false)
    expect(error.code).toBe("INTERNAL_ERROR")
    expect(error.kind).toBe("UPSTREAM")
  })

  it.each([
    ["TypeError", new TypeError("fetch failed")],
    ["AbortError", Object.assign(new Error("aborted"), { name: "AbortError" })],
    [
      "TimeoutError",
      Object.assign(new Error("timeout"), { name: "TimeoutError" }),
    ],
  ])("treats a %s as NETWORK_ERROR", async (_n, failure) => {
    fetchAPI.mockRejectedValue(failure)

    const error = (await getShortFilm("khalaa", "fr").catch(
      (e: unknown) => e
    )) as ShortFilmApiError

    expect(error.code).toBe("NETWORK_ERROR")
    expect(error.kind).toBe("NETWORK")
  })

  it.each([
    ["no data", {}],
    ["null data", { data: null }],
    ["a list instead of an item", { data: [] }],
  ])("treats a response with %s as INTERNAL_ERROR", async (_n, body) => {
    fetchAPI.mockResolvedValue(body)

    const error = (await getShortFilm("khalaa", "fr").catch(
      (e: unknown) => e
    )) as ShortFilmApiError

    expect(error.code).toBe("INTERNAL_ERROR")
  })
})

describe("getShortFilmsPage", () => {
  const body = (page: number, pageCount: number) => ({
    data: [summaryDto()],
    meta: { pagination: { page, pageSize: 24, pageCount, total: 30 } },
  })

  it("sends exactly locale, page and pageSize", async () => {
    fetchAPI.mockResolvedValue(body(1, 2))

    await getShortFilmsPage({ locale: "en", page: 1 })

    const { path, params } = lastCall()
    expect(path).toBe("/creative-works/creative-works/short-films")
    expect(Object.keys(params).sort()).toEqual(["locale", "page", "pageSize"])
    expect(params).toEqual({
      locale: "en",
      page: 1,
      pageSize: SHORT_FILM_PAGE_SIZE,
    })
  })

  it("carries the list tag and the 60s revalidate", async () => {
    fetchAPI.mockResolvedValue(body(1, 1))

    await getShortFilmsPage({ locale: "fr", page: 1 })

    const { init } = lastCall()
    expect(init.next?.revalidate).toBe(60)
    expect(init.next?.tags).toEqual([SHORT_FILMS_TAG])
  })

  it("computes hasMore from the API page count", async () => {
    fetchAPI.mockResolvedValueOnce(body(1, 2))
    fetchAPI.mockResolvedValueOnce(body(2, 2))

    const first = await getShortFilmsPage({ locale: "fr", page: 1 })
    const last = await getShortFilmsPage({ locale: "fr", page: 2 })

    expect(first).toMatchObject({ page: 1, total: 30, hasMore: true })
    expect(first.shorts).toHaveLength(1)
    expect(first.shorts[0]!.documentId).toBe("doc-khalaa")
    expect(last.hasMore).toBe(false)
  })

  it("raises instead of returning an empty list on failure", async () => {
    fetchAPI.mockRejectedValue(strapiFailure(500, "INTERNAL_ERROR"))

    const error = (await getShortFilmsPage({ locale: "fr", page: 1 }).catch(
      (e: unknown) => e
    )) as ShortFilmApiError

    expect(error).toBeInstanceOf(ShortFilmApiError)
    expect(error.code).toBe("INTERNAL_ERROR")
  })

  it("raises on a malformed list body", async () => {
    fetchAPI.mockResolvedValue({ data: [], meta: {} })

    await expect(
      getShortFilmsPage({ locale: "fr", page: 1 })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
  })
})

describe("getRelatedShortFilms", () => {
  it("sends only the locale key to the /:slug/related route", async () => {
    fetchAPI.mockResolvedValue({ data: [summaryDto()] })

    await getRelatedShortFilms("khalaa", "ar")

    const { path, params } = lastCall()
    expect(path).toBe(
      "/creative-works/creative-works/short-films/khalaa/related"
    )
    expect(Object.keys(params)).toEqual(["locale"])
    expect(params.locale).toBe("ar")
  })

  it("carries the shared tags, its own tag, 60s revalidate and a timeout", async () => {
    fetchAPI.mockResolvedValue({ data: [] })

    await getRelatedShortFilms("khalaa", "fr")

    const { init } = lastCall()
    expect(init.next?.revalidate).toBe(60)
    expect(init.next?.tags).toEqual([
      SHORT_FILMS_TAG,
      "short-film:khalaa",
      "short-film-related:khalaa",
    ])
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("maps summaries", async () => {
    fetchAPI.mockResolvedValue({
      data: [
        summaryDto({ documentId: "a", slug: "a", title: "A" }),
        summaryDto({ documentId: "b", slug: "b", title: "B" }),
      ],
    })

    const related = await getRelatedShortFilms("khalaa", "fr")

    expect(related.map((r) => r.title)).toEqual(["A", "B"])
    expect(related[0]!.trailer).toBeUndefined()
  })

  it("rejects a pattern-failing slug without calling the API", async () => {
    const error = await getRelatedShortFilms("a/b", "fr").catch(
      (e: unknown) => e
    )

    expect(isShortFilmNotFound(error)).toBe(true)
    expect(fetchAPI).not.toHaveBeenCalled()
  })

  it("raises typed errors like the other fetchers", async () => {
    fetchAPI.mockRejectedValueOnce(strapiFailure(404, "SHORT_FILM_NOT_FOUND"))
    fetchAPI.mockRejectedValueOnce(strapiFailure(500, "INTERNAL_ERROR"))
    fetchAPI.mockRejectedValueOnce(new TypeError("fetch failed"))
    fetchAPI.mockResolvedValueOnce({ data: null })

    const errors = await Promise.all(
      [1, 2, 3, 4].map(() =>
        getRelatedShortFilms("khalaa", "fr").catch((e: unknown) => e)
      )
    )

    expect(errors.map((e) => (e as ShortFilmApiError).code).sort()).toEqual([
      "INTERNAL_ERROR",
      "INTERNAL_ERROR",
      "NETWORK_ERROR",
      "SHORT_FILM_NOT_FOUND",
    ])
  })
})

describe("mapper failures", () => {
  // A `null` entry makes the mappers throw a TypeError ("Cannot read properties
  // of null"), which looks exactly like a failed `fetch`.
  const cases: Array<[string, () => Promise<unknown>]> = [
    [
      "getShortFilm",
      async () => {
        fetchAPI.mockResolvedValueOnce({ data: detailDto({ credits: [null] }) })
        return getShortFilm("khalaa", "fr")
      },
    ],
    [
      "getShortFilmsPage",
      async () => {
        fetchAPI.mockResolvedValueOnce({
          data: [null],
          meta: { pagination: { page: 1, pageCount: 1, total: 1 } },
        })
        return getShortFilmsPage({ locale: "fr", page: 1 })
      },
    ],
    [
      "getRelatedShortFilms",
      async () => {
        fetchAPI.mockResolvedValueOnce({ data: [null] })
        return getRelatedShortFilms("khalaa", "fr")
      },
    ],
  ]

  it.each(cases)(
    "%s reports a mapper TypeError as INTERNAL_ERROR, not NETWORK_ERROR",
    async (_name, run) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {})

      const error = (await run().catch((e: unknown) => e)) as ShortFilmApiError

      expect(error).toBeInstanceOf(ShortFilmApiError)
      expect(error.code).toBe("INTERNAL_ERROR")
      expect(error.kind).toBe("UPSTREAM")
      expect(error.cause).toBeInstanceOf(TypeError)
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("unexpected API shape"),
        expect.any(TypeError)
      )
      log.mockRestore()
    }
  )
})

describe("error helpers", () => {
  it("passes an existing ShortFilmApiError through unchanged", () => {
    const original = new ShortFilmApiError({
      code: "NETWORK_ERROR",
      kind: "NETWORK",
    })

    expect(toShortFilmApiError(original)).toBe(original)
  })

  it("collapses validation and unknown codes to INTERNAL_ERROR for visitors", () => {
    expect(toUserErrorCode("VALIDATION_FAILED")).toBe("INTERNAL_ERROR")
    expect(toUserErrorCode("UNSUPPORTED_LOCALE")).toBe("INTERNAL_ERROR")
    expect(toUserErrorCode("whatever")).toBe("INTERNAL_ERROR")
    expect(toUserErrorCode("NETWORK_ERROR")).toBe("NETWORK_ERROR")
    expect(toUserErrorCode("SHORT_FILM_NOT_FOUND")).toBe("SHORT_FILM_NOT_FOUND")
  })
})
