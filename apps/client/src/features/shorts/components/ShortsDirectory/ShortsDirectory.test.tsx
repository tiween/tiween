/**
 * ShortsDirectory on the Strapi list (SPAGE-01, SPAGE-05; D-01, D-03, D-04):
 *
 *  - mounting with server-provided films makes NO request,
 *  - no filter, search, chip, sort, hero or latest surface exists,
 *  - 13 films / total 13 renders no Load more control and no observer,
 *  - Load more asks for exactly `locale` and `page`, appends de-duplicated,
 *  - a failed Load more keeps the films shown and offers an inline retry,
 *  - an empty 200 shows the empty-catalogue block, which is not an alert,
 *  - the h1 consumes a pending retry focus,
 *  - the grid sits inside ONE ShortsWatchlistProvider carrying every loaded
 *    documentId (appended pages extend it), so one list request seeds all the
 *    card hearts (FR19, D-13),
 *  - axe is clean in fr, ar and en for the results and the empty states.
 */
import * as React from "react"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilm } from "../../types"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../../test/helpers/axe"
import { markRetryPending, resetRetryFocus } from "../../utils/retryFocus"
import { ShortsDirectory } from "./ShortsDirectory"

vi.mock("@/lib/navigation", () => ({
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

const { providerIds } = vi.hoisted(() => ({
  providerIds: [] as string[][],
}))

// The provider and the heart state machine have their own suites; here the
// provider only records the ids it was handed.
vi.mock("@/features/watchlist", () => ({
  ShortsWatchlistProvider: ({
    documentIds,
    children,
  }: {
    documentIds: string[]
    children: React.ReactNode
  }) => {
    providerIds.push(documentIds)
    return <div data-testid="watchlist-provider">{children}</div>
  },
}))

vi.mock("@/features/watchlist/hooks/useShortFilmHeart", () => ({
  useShortFilmHeart: () => ({
    isSaved: false,
    isBusy: false,
    isResolved: true,
    isPending: false,
    status: "authenticated",
    toggle: vi.fn(),
  }),
}))

const MESSAGES = { fr, ar, en } as const

function film(n: number, title = `Film ${n}`): ShortFilm {
  return {
    id: n,
    documentId: `doc-${n}`,
    title,
    slug: `film-${n}`,
  } as ShortFilm
}

function films(from: number, to: number): ShortFilm[] {
  return Array.from({ length: to - from + 1 }, (_, i) => film(from + i))
}

function ok(shorts: ShortFilm[], total = shorts.length) {
  return new Response(JSON.stringify({ shorts, total }), { status: 200 })
}

const fetchMock = vi.fn()

/** Records every observer so a test can tick one by hand. */
const observers: Array<{
  callback: IntersectionObserverCallback
  observed: Element[]
  disconnected: boolean
}> = []

beforeEach(() => {
  fetchMock.mockReset()
  providerIds.length = 0
  observers.length = 0
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      private record: (typeof observers)[number]
      constructor(callback: IntersectionObserverCallback) {
        this.record = { callback, observed: [], disconnected: false }
        observers.push(this.record)
      }
      observe(element: Element) {
        this.record.observed.push(element)
      }
      disconnect() {
        this.record.disconnected = true
      }
    }
  )
})

afterEach(() => {
  cleanup()
  resetRetryFocus()
  vi.unstubAllGlobals()
})

function ui({
  locale = "fr",
  initialShorts = [film(1)],
  totalShorts = initialShorts.length,
}: {
  locale?: keyof typeof MESSAGES
  initialShorts?: ShortFilm[]
  totalShorts?: number
} = {}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Tunis"
    >
      <ShortsDirectory
        initialShorts={initialShorts}
        totalShorts={totalShorts}
      />
    </NextIntlClientProvider>
  )
}

function renderDirectory(options: Parameters<typeof ui>[0] = {}) {
  return render(ui(options))
}

function requestedUrl(call: number) {
  return new URL(String(fetchMock.mock.calls[call]![0]), "http://localhost")
}

function cardLinks() {
  return screen
    .getAllByRole("link")
    .filter((link) => /^\/shorts\/film-\d+$/.test(link.getAttribute("href")!))
}

const LOAD_MORE = "Afficher plus"
const LOADING = "Chargement des courts métrages…"

describe("ShortsDirectory", { timeout: 20_000 }, () => {
  describe("first page", () => {
    it("makes no request on mount when results came from the server", async () => {
      renderDirectory({ initialShorts: films(1, 3), totalShorts: 3 })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("renders the intro, a polite result line and the grid for 13 films", () => {
      renderDirectory({ initialShorts: films(1, 13), totalShorts: 13 })

      expect(
        screen.getByRole("heading", { level: 1, name: "Courts métrages" })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          "Courts métrages du Maghreb et du monde arabe, choisis depuis la Tunisie."
        )
      ).toBeInTheDocument()

      const result = screen.getByText("13 courts métrages")
      expect(result).toHaveAttribute("role", "status")

      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Tous les courts métrages",
        })
      ).toHaveClass("sr-only")

      const links = cardLinks()
      expect(links).toHaveLength(13)
      expect(links[0]).toHaveAttribute("href", "/shorts/film-1")
    })

    it("renders no Load more control and no observer when everything is loaded", () => {
      renderDirectory({ initialShorts: films(1, 13), totalShorts: 13 })

      expect(screen.queryByRole("button", { name: LOAD_MORE })).toBeNull()
      expect(observers).toHaveLength(0)
      // The suggestion prompt follows the complete list.
      expect(
        screen.getByText("Un court métrage manque au catalogue ?")
      ).toBeInTheDocument()
    })

    it("renders no filter, search, chip, sort, hero or latest surface (D-04)", () => {
      renderDirectory({ initialShorts: films(1, 13), totalShorts: 13 })

      expect(screen.queryByRole("searchbox")).toBeNull()
      expect(screen.queryByRole("textbox")).toBeNull()
      expect(screen.queryByRole("combobox")).toBeNull()
      expect(screen.queryByRole("region", { name: "À la une" })).toBeNull()
      expect(screen.queryByText("Derniers ajouts")).toBeNull()
      expect(screen.queryByText("Voir tout")).toBeNull()
      expect(screen.queryByRole("button", { name: /filtre/i })).toBeNull()
    })

    it("shows Western digits in the Arabic result line", () => {
      renderDirectory({
        locale: "ar",
        initialShorts: films(1, 13),
        totalShorts: 13,
      })

      expect(screen.getByRole("status")).toHaveTextContent(/13/)
      expect(screen.getByRole("status").textContent).not.toMatch(/[٠-٩]/u)
    })

    it("hands a pending retry focus to the h1", () => {
      markRetryPending()
      renderDirectory({ initialShorts: films(1, 3), totalShorts: 3 })

      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus()
    })
  })

  describe("Load more", () => {
    it("renders a secondary button while more films exist", () => {
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

      const button = screen.getByRole("button", { name: LOAD_MORE })
      expect(button).not.toHaveAttribute("aria-disabled")
      // Contribution waits until the list is complete.
      expect(screen.queryByText("Un court métrage manque au catalogue ?")).toBe(
        null
      )
    })

    it("requests exactly locale and page, and appends de-duplicated films", async () => {
      fetchMock.mockResolvedValueOnce(ok([film(24), ...films(25, 30)], 30))
      renderDirectory({
        locale: "ar",
        initialShorts: films(1, 24),
        totalShorts: 30,
      })

      fireEvent.click(screen.getByRole("button", { name: "عرض المزيد" }))
      await waitFor(() => expect(cardLinks()).toHaveLength(30))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = requestedUrl(0)
      expect(url.pathname).toBe("/api/shorts")
      expect([...url.searchParams.keys()].sort()).toEqual(["locale", "page"])
      expect(url.searchParams.get("locale")).toBe("ar")
      expect(url.searchParams.get("page")).toBe("2")
      // Film 24 was on both pages and is shown once.
      expect(
        cardLinks().filter((l) => l.getAttribute("href") === "/shorts/film-24")
      ).toHaveLength(1)
    })

    it("never sends pageSize, filters, sort or genre", async () => {
      fetchMock.mockResolvedValue(ok(films(25, 48), 60))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 60 })

      fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))
      await waitFor(() => expect(cardLinks()).toHaveLength(48))
      fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

      for (const [index] of fetchMock.mock.calls.entries()) {
        const url = requestedUrl(index)
        for (const key of [
          "pageSize",
          "q",
          "genre",
          "genres",
          "sort",
          "sortBy",
        ]) {
          expect(url.searchParams.has(key)).toBe(false)
        }
      }
      expect(requestedUrl(1).searchParams.get("page")).toBe("3")
    })

    it("keeps the button mounted and aria-disabled while loading, with one request", async () => {
      let resolve!: (response: Response) => void
      fetchMock.mockReturnValue(
        new Promise<Response>((r) => {
          resolve = r
        })
      )
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 48 })

      const button = screen.getByRole("button", { name: LOAD_MORE })
      fireEvent.click(button)

      await waitFor(() =>
        expect(screen.getByRole("button", { name: LOADING })).toHaveAttribute(
          "aria-disabled",
          "true"
        )
      )
      const busy = screen.getByRole("button", { name: LOADING })
      expect(busy).toBe(button)
      expect(busy).not.toBeDisabled()
      expect(
        screen.getAllByRole("status").some((s) => s.textContent === LOADING)
      ).toBe(true)

      fireEvent.click(busy)
      fireEvent.click(busy)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolve(ok(films(25, 48), 48))
      })
      await waitFor(() => expect(cardLinks()).toHaveLength(48))
    })

    it("keeps focus on the button when more pages remain", async () => {
      fetchMock.mockResolvedValueOnce(ok(films(25, 48), 72))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 72 })

      const button = screen.getByRole("button", { name: LOAD_MORE })
      button.focus()
      fireEvent.click(button)
      await waitFor(() => expect(cardLinks()).toHaveLength(48))

      expect(screen.getByRole("button", { name: LOAD_MORE })).toHaveFocus()
    })

    it("moves focus to the first appended card when the last page arrives", async () => {
      fetchMock.mockResolvedValueOnce(ok(films(25, 30), 30))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

      const button = screen.getByRole("button", { name: LOAD_MORE })
      button.focus()
      fireEvent.click(button)

      await waitFor(() => expect(cardLinks()).toHaveLength(30))
      await waitFor(() =>
        expect(
          cardLinks().find((l) => l.getAttribute("href") === "/shorts/film-25")
        ).toHaveFocus()
      )
      expect(screen.queryByRole("button", { name: LOAD_MORE })).toBeNull()
      // The list is complete: the suggestion prompt now follows.
      expect(
        screen.getByText("Un court métrage manque au catalogue ?")
      ).toBeInTheDocument()
    })

    it("does not pull focus when the observer loaded the page", async () => {
      fetchMock.mockResolvedValueOnce(ok(films(25, 30), 30))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

      expect(observers).toHaveLength(1)
      await act(async () => {
        observers[0]!.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        )
      })

      await waitFor(() => expect(cardLinks()).toHaveLength(30))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(document.body).toHaveFocus()
    })

    it("stops offering Load more when the server returns an empty page", async () => {
      fetchMock.mockResolvedValueOnce(ok([], 30))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

      fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))

      await waitFor(() =>
        expect(screen.queryByRole("button", { name: LOAD_MORE })).toBeNull()
      )
      expect(screen.queryByRole("alert")).toBeNull()
      expect(cardLinks()).toHaveLength(24)
    })
  })

  describe("Load more failure", () => {
    const failures: Array<[string, () => void]> = [
      [
        "a rejected request",
        () => fetchMock.mockRejectedValue(new TypeError("x")),
      ],
      [
        "a 502 answer",
        () =>
          fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
              status: 502,
            })
          ),
      ],
      [
        "a malformed body",
        () =>
          fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ nope: true }), { status: 200 })
          ),
      ],
    ]

    it.each(failures)(
      "keeps the films shown and offers one alert plus a retry on %s",
      async (_name, arrange) => {
        arrange()
        renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

        fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))

        const alert = await screen.findByRole("alert")
        expect(alert).toHaveTextContent("La suite n'a pas pu être chargée.")
        expect(screen.getAllByRole("alert")).toHaveLength(1)
        // The icon uses the destructive token, never a raw hex.
        const icon = alert.querySelector("svg")
        expect(icon).toHaveClass("text-destructive")
        expect(icon?.getAttribute("class")).not.toMatch(/#[0-9a-f]{3,8}/i)
        expect(cardLinks()).toHaveLength(24)
        expect(
          within(document.body).getByRole("button", { name: "Réessayer" })
        ).toBeInTheDocument()
        // A failure is never "no more films".
        expect(screen.queryByText("Le catalogue ouvre bientôt")).toBeNull()
      }
    )

    it("turns the scroll observer off while in error", async () => {
      fetchMock.mockRejectedValue(new TypeError("offline"))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

      expect(observers.filter((o) => !o.disconnected)).toHaveLength(1)
      fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))
      await screen.findByRole("alert")

      expect(observers.filter((o) => !o.disconnected)).toHaveLength(0)
    })

    it("retries the same page and appends on success", async () => {
      fetchMock
        .mockRejectedValueOnce(new TypeError("offline"))
        .mockResolvedValueOnce(ok(films(25, 30), 30))
      renderDirectory({ initialShorts: films(1, 24), totalShorts: 30 })

      fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))
      await screen.findByRole("alert")
      fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))

      await waitFor(() => expect(cardLinks()).toHaveLength(30))
      expect(requestedUrl(0).searchParams.get("page")).toBe("2")
      expect(requestedUrl(1).searchParams.get("page")).toBe("2")
      expect(screen.queryByRole("alert")).toBeNull()
    })
  })

  describe("watchlist hearts (FR19, D-13)", () => {
    it("mounts one provider around the grid with every loaded documentId", () => {
      renderDirectory({ initialShorts: films(1, 3), totalShorts: 3 })

      const provider = screen.getByTestId("watchlist-provider")
      expect(provider.querySelector("main")).not.toBeNull()
      expect(screen.getAllByTestId("watchlist-provider")).toHaveLength(1)
      expect(providerIds.at(-1)).toEqual(["doc-1", "doc-2", "doc-3"])
    })

    it("extends the ids when Load more appends films", async () => {
      fetchMock.mockResolvedValueOnce(ok([film(3), film(4), film(5)], 5))
      renderDirectory({ initialShorts: films(1, 3), totalShorts: 5 })

      fireEvent.click(screen.getByRole("button", { name: LOAD_MORE }))
      await waitFor(() => expect(cardLinks()).toHaveLength(5))

      expect(providerIds.at(-1)).toEqual([
        "doc-1",
        "doc-2",
        "doc-3",
        "doc-4",
        "doc-5",
      ])
    })

    it("gives every card its own heart as a sibling of its link", () => {
      renderDirectory({ initialShorts: films(1, 3), totalShorts: 3 })

      const hearts = screen.getAllByRole("button", { name: /watchlist/ })
      expect(hearts).toHaveLength(3)
      for (const [index, heart] of hearts.entries()) {
        const article = heart.closest("article")!
        expect(article.querySelector("a")!.contains(heart)).toBe(false)
        expect(heart).toHaveAccessibleName(
          `Ajouter « Film ${index + 1} » à ma watchlist`
        )
      }
    })

    it("keeps each card a direct child of the grid (focus-after-append relies on it)", () => {
      renderDirectory({ initialShorts: films(1, 3), totalShorts: 3 })

      const grid = screen.getAllByRole("article")[0]!.parentElement!
      expect(Array.from(grid.children).map((c) => c.tagName)).toEqual([
        "ARTICLE",
        "ARTICLE",
        "ARTICLE",
      ])
    })
  })

  describe("empty catalogue", () => {
    it("renders the empty-catalogue block, not an alert, with the suggestion trigger", () => {
      renderDirectory({ initialShorts: [], totalShorts: 0 })

      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Le catalogue ouvre bientôt",
        })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          "Les premiers courts métrages arrivent. Vous en connaissez un ? Suggérez-le."
        )
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /Suggérer un court métrage/ })
      ).toBeInTheDocument()

      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.queryByRole("status")).toBeNull()
      expect(screen.queryByText(/Aucun court métrage/)).toBeNull()
      expect(
        screen.queryByRole("heading", { level: 2, name: /Tous/ })
      ).toBeNull()
      expect(
        screen.getByRole("heading", { level: 1, name: "Courts métrages" })
      ).toBeInTheDocument()
    })
  })

  describe.each(["fr", "ar", "en"] as const)("accessibility (%s)", (locale) => {
    it("has no axe violations with results and a Load more button", async () => {
      const { container } = renderDirectory({
        locale,
        initialShorts: films(1, 24),
        totalShorts: 30,
      })
      await expectNoA11yViolations(container)
    })

    it("has no axe violations for the complete list", async () => {
      const { container } = renderDirectory({
        locale,
        initialShorts: films(1, 13),
        totalShorts: 13,
      })
      await expectNoA11yViolations(container)
    })

    it("has no axe violations for the empty catalogue", async () => {
      const { container } = renderDirectory({
        locale,
        initialShorts: [],
        totalShorts: 0,
      })
      await expectNoA11yViolations(container)
    })
  })
})
