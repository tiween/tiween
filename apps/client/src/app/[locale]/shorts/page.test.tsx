// @vitest-environment node
/**
 * Route-level guard for the `/shorts` directory page (SPAGE-01, SPAGE-05;
 * D-06, D-07, T-02-20): it opts into request-time rendering before it touches
 * Strapi, reads the typed fetcher, and lets a failure throw so `error.tsx`
 * renders instead of an error shell or an empty catalogue.
 */
import { connection } from "next/server"
import { setRequestLocale } from "next-intl/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm } from "@/features/shorts/types"

import { ShortFilmApiError } from "@/lib/strapi-api/content/shorts.errors"

import ShortsPage, * as pageModule from "./page"

const getShortFilmsPage = vi.hoisted(() => vi.fn())
const order = vi.hoisted(() => [] as string[])

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {
    order.push("connection")
  }),
}))
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }))
vi.mock("@/lib/strapi-api/content/shorts", () => ({
  getShortFilmsPage,
}))
vi.mock("@/features/shorts/components", () => ({
  ShortsDirectory: function ShortsDirectory() {
    return null
  },
}))

const films: ShortFilm[] = [
  { id: "a", documentId: "a", title: "Khalâa", slug: "khalaa" },
  { id: "b", documentId: "b", title: "Sabbat", slug: "sabbat" },
]

const outageError = new ShortFilmApiError({
  code: "INTERNAL_ERROR",
  kind: "UPSTREAM",
})

function params(locale = "fr") {
  return Promise.resolve({ locale: locale as "fr" })
}

type DirectoryProps = { initialShorts: ShortFilm[]; totalShorts: number }

async function render(locale = "fr"): Promise<DirectoryProps> {
  const element = (await ShortsPage({
    params: params(locale),
  })) as unknown as { props: DirectoryProps }
  return element.props
}

beforeEach(() => {
  vi.clearAllMocks()
  order.length = 0
  getShortFilmsPage.mockImplementation(async () => {
    order.push("fetch")
    return { shorts: films, total: 2, page: 1, pageSize: 24, hasMore: false }
  })
})

describe("shorts page", () => {
  it("opts into request-time rendering before it fetches", async () => {
    await render()

    expect(connection).toHaveBeenCalledTimes(1)
    expect(order).toEqual(["connection", "fetch"])
  })

  it("exports no static params and does not force dynamic rendering", () => {
    expect(pageModule).not.toHaveProperty("generateStaticParams")
    expect(pageModule).not.toHaveProperty("dynamic")
  })

  it("registers the requested locale for next-intl", async () => {
    await render("ar")

    expect(setRequestLocale).toHaveBeenCalledWith("ar")
  })

  it("asks for the first 24 films in the page locale", async () => {
    await render("ar")

    expect(getShortFilmsPage).toHaveBeenCalledWith({
      locale: "ar",
      page: 1,
      pageSize: 24,
    })
  })

  it("hands the films and the total to the directory", async () => {
    const props = await render()

    expect(props.initialShorts).toBe(films)
    expect(props.totalShorts).toBe(2)
  })

  it("still renders the directory for an HTTP 200 with zero rows", async () => {
    getShortFilmsPage.mockResolvedValue({
      shorts: [],
      total: 0,
      page: 1,
      pageSize: 24,
      hasMore: false,
    })

    const props = await render()

    expect(props.initialShorts).toEqual([])
    expect(props.totalShorts).toBe(0)
  })

  it("lets a fetch failure throw out of the page instead of rendering a shell", async () => {
    getShortFilmsPage.mockRejectedValue(outageError)

    await expect(ShortsPage({ params: params() })).rejects.toBe(outageError)
  })

  it("leaves the Tiween suffix to the locale layout title template", () => {
    expect(pageModule.metadata.title).toBe("Courts Métrages")
  })

  it("stays noindex and nofollow until the go-live switch", () => {
    expect(pageModule.metadata.robots).toEqual({ index: false, follow: false })
  })
})
