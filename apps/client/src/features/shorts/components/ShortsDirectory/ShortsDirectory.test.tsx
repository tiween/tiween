/**
 * ShortsDirectory — data-path hardening:
 *
 *  - mounting with server-provided results makes NO request (the search box
 *    used to fire a refetch on mount because `undefined !== ""`),
 *  - requests carry the visitor's locale (they used to default to French),
 *  - an API failure shows an error with retry, never "no results",
 *  - a slow, superseded response can never overwrite a newer one,
 *  - a failed "load more" keeps the films already on screen,
 *  - ratings are out of v1: no rating filter or sort reaches the API,
 *  - the suggestion prompt sits after the grid, not beside the heading.
 */
import * as React from "react"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm, ShortsFilters } from "../../types"

import ar from "../../../../../locales/ar.json"
import fr from "../../../../../locales/fr.json"
import { ShortsDirectory } from "./ShortsDirectory"

vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const MESSAGES = { fr, ar } as const

function film(n: number, title = `Film ${n}`): ShortFilm {
  return {
    id: n,
    documentId: `doc-${n}`,
    title,
    slug: `film-${n}`,
  } as ShortFilm
}

function ok(shorts: ShortFilm[], total = shorts.length) {
  return new Response(JSON.stringify({ shorts, total }), { status: 200 })
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function renderDirectory({
  locale = "fr",
  initialShorts = [film(1)],
  totalShorts = initialShorts.length,
  initialFilters,
}: {
  locale?: keyof typeof MESSAGES
  initialShorts?: ShortFilm[]
  totalShorts?: number
  initialFilters?: ShortsFilters
} = {}) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Tunis"
    >
      <ShortsDirectory
        featuredShorts={[]}
        latestShorts={[]}
        initialShorts={initialShorts}
        totalShorts={totalShorts}
        genres={[]}
        initialFilters={initialFilters}
      />
    </NextIntlClientProvider>
  )
}

/** Type into the search box and let the 300ms debounce elapse. */
async function search(query: string, placeholder = "Titre, réalisateur…") {
  fireEvent.change(screen.getByPlaceholderText(placeholder), {
    target: { value: query },
  })
  await act(async () => {
    vi.advanceTimersByTime(350)
  })
}

/** A card renders its title more than once (mobile + desktop overlays). */
function isShown(title: string) {
  return screen.queryAllByText(title).length > 0
}

async function waitForShown(title: string) {
  await waitFor(() => expect(isShown(title)).toBe(true))
}

function requestedUrl(call: number) {
  return new URL(String(fetchMock.mock.calls[call]![0]), "http://localhost")
}

describe("ShortsDirectory", { timeout: 20_000 }, () => {
  it("does not refetch on mount when results came from the server", async () => {
    vi.useFakeTimers()
    renderDirectory()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(isShown("Film 1")).toBe(true)
  })

  it("sends the visitor's locale with every request", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(ok([film(2)]))
    renderDirectory({ locale: "ar" })

    await search("نور", "العنوان، المخرج…")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestedUrl(0).searchParams.get("locale")).toBe("ar")
    expect(requestedUrl(0).searchParams.get("q")).toBe("نور")
  })

  it("shows an error with retry — not an empty catalog — when the API fails", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "SHORTS_UNAVAILABLE" }), {
        status: 503,
      })
    )
    renderDirectory()

    await search("drame")
    vi.useRealTimers()

    expect(
      await screen.findByText("Le catalogue ne répond pas")
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Rien ne correspond à cette recherche")
    ).not.toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(ok([film(7, "Retour")]))
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))

    await waitForShown("Retour")
  })

  it("ignores a slow response that a newer search superseded", async () => {
    vi.useFakeTimers()
    let resolveSlow!: (r: Response) => void
    fetchMock
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            resolveSlow = resolve
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError"))
            )
          })
      )
      .mockResolvedValueOnce(ok([film(3, "Drame récent")]))
    renderDirectory()

    await search("dra")
    await search("drame")
    vi.useRealTimers()

    await waitForShown("Drame récent")
    // The first request was aborted; even if its body still arrives, it is
    // discarded.
    resolveSlow(ok([film(4, "Résultat périmé")]))
    await new Promise((r) => setTimeout(r, 0))
    expect(isShown("Résultat périmé")).toBe(false)
  })

  it("keeps loaded films and offers retry when loading more fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    renderDirectory({ initialShorts: [film(1)], totalShorts: 30 })

    fireEvent.click(screen.getByRole("button", { name: "Afficher plus" }))

    expect(
      await screen.findByText("La suite n'a pas pu être chargée.")
    ).toBeInTheDocument()
    expect(isShown("Film 1")).toBe(true)

    fetchMock.mockResolvedValueOnce(ok([film(2)], 30))
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))

    await waitForShown("Film 2")
    expect(requestedUrl(1).searchParams.get("page")).toBe("2")
  })

  it("never sends a rating filter or rating sort, even from legacy state", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(ok([film(2)]))
    renderDirectory({ initialFilters: { rating: 8, sortBy: "rating" } })

    await search("drame")

    const params = requestedUrl(0).searchParams
    expect(params.has("rating")).toBe(false)
    expect(params.has("sortBy")).toBe(false)
    expect(window.location.search).not.toMatch(/rating/)
  })

  it("offers the suggestion after the grid, as a quiet link", () => {
    renderDirectory()

    const heading = screen.getByRole("heading", {
      name: "Tous les courts métrages",
    })
    const trigger = screen.getByRole("button", {
      name: "Suggérer un court métrage",
    })
    expect(
      screen.getByText("Un court métrage manque au catalogue ?")
    ).toBeInTheDocument()
    // After the heading and the first card in document order.
    expect(
      heading.compareDocumentPosition(trigger) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const card = screen.getAllByRole("link")[0]!
    expect(
      card.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(trigger.className).not.toMatch(/\bbg-primary\b/)
  })

  it("keeps the suggestion prompt in the empty state", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(ok([]))
    renderDirectory()

    await search("introuvable")
    vi.useRealTimers()

    expect(
      await screen.findByText("Rien ne correspond à cette recherche")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Suggérer un court métrage" })
    ).toBeInTheDocument()
  })
})
