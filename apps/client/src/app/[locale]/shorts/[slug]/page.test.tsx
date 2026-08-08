/**
 * Route-level guard for the short-film detail page.
 *
 * Covers what the `ShortFilmDetail` component suite cannot reach: the
 * unknown-slug 404 row of the I/O matrix, and the route's own data shaping —
 * the related shelf must exclude the film being viewed and cap at five.
 * Deleting that filter is invisible to the component suite and would put the
 * film in its own "Dans la même veine" shelf.
 */
import { notFound } from "next/navigation"
import { MOCK_SHORT_FILMS } from "@/features/shorts/data"
import { setRequestLocale } from "next-intl/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm } from "@/features/shorts/types"

import ShortFilmPage, { generateMetadata, generateStaticParams } from "./page"

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    // Mirrors the real implementation, which throws to halt rendering.
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}))

/**
 * The detail component is a client component with its own suite; stub it, but
 * CAPTURE its props so the route's data shaping is actually asserted rather
 * than merely executed.
 */
const detailProps = vi.hoisted(
  () => [] as { film: ShortFilm; relatedShorts?: ShortFilm[] }[]
)

vi.mock("@/features/shorts/components", () => ({
  ShortFilmDetail: (props: {
    film: ShortFilm
    relatedShorts?: ShortFilm[]
  }) => {
    detailProps.push(props)
    return null
  },
}))

/** Render the route and return the props it handed the detail component. */
async function renderRoute(slug: string, locale = "fr" as const) {
  const element = await ShortFilmPage({
    params: Promise.resolve({ locale, slug }),
  })
  // The returned element is the stubbed component; invoking its type runs the
  // capture above without pulling in a renderer.
  const { type, props } = element as unknown as {
    type: (p: { film: ShortFilm; relatedShorts?: ShortFilm[] }) => unknown
    props: { film: ShortFilm; relatedShorts?: ShortFilm[] }
  }
  type(props)
  return detailProps[detailProps.length - 1]!
}

beforeEach(() => {
  vi.clearAllMocks()
  detailProps.length = 0
})

describe("shorts/[slug] route", () => {
  it("calls notFound() for a slug that matches no film", async () => {
    await expect(
      ShortFilmPage({
        params: Promise.resolve({
          locale: "fr" as const,
          slug: "no-such-film",
        }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFound).toHaveBeenCalled()
  })

  it("renders without calling notFound() for a known slug", async () => {
    const known = MOCK_SHORT_FILMS[0]
    expect(known).toBeDefined()

    await expect(
      ShortFilmPage({
        params: Promise.resolve({ locale: "fr" as const, slug: known!.slug }),
      })
    ).resolves.toBeDefined()

    expect(notFound).not.toHaveBeenCalled()
  })

  it("registers the requested locale for static rendering", async () => {
    await ShortFilmPage({
      params: Promise.resolve({
        locale: "ar" as const,
        slug: MOCK_SHORT_FILMS[0]!.slug,
      }),
    })

    expect(setRequestLocale).toHaveBeenCalledWith("ar")
  })

  it("passes the matched film and never lists it among its own related shorts", async () => {
    const known = MOCK_SHORT_FILMS[0]!
    const props = await renderRoute(known.slug)

    expect(props.film.documentId).toBe(known.documentId)
    expect(
      props.relatedShorts?.some((s) => s.documentId === known.documentId)
    ).toBe(false)
  })

  it("caps the related shelf at five", async () => {
    const props = await renderRoute(MOCK_SHORT_FILMS[0]!.slug)

    expect(props.relatedShorts?.length).toBeGreaterThan(0)
    expect(props.relatedShorts!.length).toBeLessThanOrEqual(5)
  })

  it("falls back to the not-found title in metadata for an unknown slug", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "fr" as const, slug: "no-such-film" }),
    })

    expect(metadata.title).toBe("Court métrage non trouvé - Tiween")
  })

  it("emits a static param for every mock film", async () => {
    const params = await generateStaticParams()

    expect(params).toHaveLength(MOCK_SHORT_FILMS.length)
    expect(params.every((p) => typeof p.slug === "string" && p.slug)).toBe(true)
  })
})
