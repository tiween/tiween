// @vitest-environment node
/**
 * Route-level guard for the short-film detail page: locale registration, the
 * metadata strings (and their failure behaviour) and the data it hands the
 * detail component. The 404/500 status behaviour lives in `layout.test.tsx`.
 */
import { setRequestLocale } from "next-intl/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm } from "@/features/shorts/types"

import { ShortFilmApiError } from "@/lib/strapi-api/content/shorts.errors"

import ShortFilmPage, * as pageModule from "./page"

const getShortFilm = vi.hoisted(() => vi.fn())
const getRelatedShortFilms = vi.hoisted(() => vi.fn())

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }))
vi.mock("@/lib/strapi-api/content/shorts", () => ({
  SHORT_FILM_RELATED_MAX: 6,
  getShortFilm,
  getRelatedShortFilms,
}))
vi.mock("@/features/shorts/components", () => ({
  ShortFilmDetail: function ShortFilmDetail() {
    return null
  },
}))

const film: ShortFilm = {
  id: "doc-khalaa",
  documentId: "doc-khalaa",
  title: "Khalâa",
  slug: "khalaa",
  synopsis: "<p>Deux arnaqueurs.</p>",
  directors: [{ slug: "maher", name: "Maher" }],
  poster: { url: "https://cdn.example/poster.jpg" },
}

const notFoundError = new ShortFilmApiError({
  code: "SHORT_FILM_NOT_FOUND",
  kind: "NOT_FOUND",
  status: 404,
})
const outageError = new ShortFilmApiError({
  code: "INTERNAL_ERROR",
  kind: "UPSTREAM",
})

function params(slug = "khalaa", locale = "fr" as const) {
  return Promise.resolve({ locale, slug })
}

function related(id: string): ShortFilm {
  return { id, documentId: id, title: id.toUpperCase(), slug: id }
}

type DetailProps = { film: ShortFilm; relatedShorts: ShortFilm[] }

async function render(slug = "khalaa"): Promise<DetailProps> {
  const element = (await ShortFilmPage({
    params: params(slug),
  })) as unknown as { props: DetailProps }
  return element.props
}

beforeEach(() => {
  vi.clearAllMocks()
  getShortFilm.mockResolvedValue(film)
  getRelatedShortFilms.mockResolvedValue([])
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("shorts/[slug] page", () => {
  it("exports no static params (no deploy-time dependency on Strapi)", () => {
    expect(pageModule).not.toHaveProperty("generateStaticParams")
  })

  it("registers the requested locale for next-intl", async () => {
    await ShortFilmPage({ params: params("khalaa", "ar" as never) })

    expect(setRequestLocale).toHaveBeenCalledWith("ar")
  })

  it("fetches the film for the page locale and hands it to the detail component", async () => {
    const element = (await ShortFilmPage({ params: params() })) as unknown as {
      props: { film: ShortFilm }
    }

    expect(getShortFilm).toHaveBeenCalledWith("khalaa", "fr")
    expect(element.props.film).toBe(film)
  })

  it("throws on a fetch failure instead of rendering an empty shell", async () => {
    getShortFilm.mockRejectedValue(outageError)

    await expect(ShortFilmPage({ params: params() })).rejects.toBe(outageError)
  })
})

describe("shorts/[slug] related shelf (D-20)", () => {
  it("passes the related films for the page locale", async () => {
    getRelatedShortFilms.mockResolvedValue([related("a"), related("b")])

    const props = await render()

    expect(getRelatedShortFilms).toHaveBeenCalledWith("khalaa", "fr")
    expect(props.relatedShorts.map((s) => s.documentId)).toEqual(["a", "b"])
  })

  it("never lists the viewed film among its own related films", async () => {
    getRelatedShortFilms.mockResolvedValue([
      related("a"),
      related(film.documentId),
      related("b"),
    ])

    const props = await render()

    expect(props.relatedShorts.map((s) => s.documentId)).toEqual(["a", "b"])
  })

  it("caps the shelf at the API maximum of six", async () => {
    getRelatedShortFilms.mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => related(`r${i}`))
    )

    const props = await render()

    expect(props.relatedShorts).toHaveLength(6)
  })

  it("omits the shelf softly when the related read fails, and the page still renders", async () => {
    getRelatedShortFilms.mockRejectedValue(outageError)

    const props = await render()

    expect(props.film).toBe(film)
    expect(props.relatedShorts).toEqual([])
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it("omits the shelf softly on a related not-found too", async () => {
    getRelatedShortFilms.mockRejectedValue(notFoundError)

    const props = await render()

    expect(props.relatedShorts).toEqual([])
  })
})

describe("shorts/[slug] generateMetadata", () => {
  it("titles a known film without duplicating the brand suffix, noindex", async () => {
    const metadata = await pageModule.generateMetadata({ params: params() })

    expect(metadata.title).toBe("Khalâa - Courts métrages")
    expect(String(metadata.title)).not.toMatch(/Tiween/)
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(metadata.description).toBe("Deux arnaqueurs.")
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://cdn.example/poster.jpg", alt: "Khalâa" },
    ])
  })

  it("falls back to the not-found title for an unknown slug", async () => {
    getShortFilm.mockRejectedValue(notFoundError)

    const metadata = await pageModule.generateMetadata({ params: params() })

    // The layout template appends "| Tiween": the page must not repeat it.
    expect(metadata.title).toBe("Court métrage non trouvé")
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("returns only noindex robots, without throwing, on any other failure", async () => {
    getShortFilm.mockRejectedValue(outageError)

    const metadata = await pageModule.generateMetadata({ params: params() })

    expect(metadata).toEqual({ robots: { index: false, follow: false } })
  })
})
