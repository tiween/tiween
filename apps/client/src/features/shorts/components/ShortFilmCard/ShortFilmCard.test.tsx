/**
 * ShortFilmCard — ratings are out of v1 (PRODUCT.md) and mock values must not
 * read as real, so a film record carrying a rating renders none of it; the
 * featured badge is a neutral chip, not a gold fill (Gold Means Go).
 *
 * Phase 2 (FR19, FR56; D-11, D-13): the watchlist heart is a SIBLING of the
 * card link (never inside it) and a tap never navigates; duration left the
 * top-end corner for the second meta line `{year} · {duration}`; the title is
 * tagged `lang="fr"` when French text is served on another page locale. The
 * heart's state machine is mocked here (see `useShortFilmHeart.test.tsx`).
 */
import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ShortFilmCard as ShortFilmCardType } from "../../types"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../../test/helpers/axe"
import { ShortFilmCard } from "./ShortFilmCard"

const { toggleSpy } = vi.hoisted(() => ({ toggleSpy: vi.fn() }))

vi.mock("@/features/watchlist/hooks/useShortFilmHeart", () => ({
  useShortFilmHeart: () => ({
    isSaved: false,
    isBusy: false,
    isResolved: true,
    isPending: false,
    status: "authenticated",
    toggle: toggleSpy,
  }),
}))

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

beforeEach(() => toggleSpy.mockClear())
afterEach(cleanup)

const MESSAGES = { fr, ar, en } as const

const FILM = {
  id: 1,
  documentId: "doc-1",
  title: "Communion",
  posterUrl: "/poster.jpg",
  slug: "communion",
  duration: 18,
  releaseYear: 2021,
  director: "Nejib Ayed",
  isFeatured: true,
  isAvailableOnline: true,
  // A legacy CMS / mock value: must never surface.
  rating: 8.7,
} as ShortFilmCardType

function renderCard(
  film: ShortFilmCardType = FILM,
  locale: keyof typeof MESSAGES = "fr",
  props: Partial<React.ComponentProps<typeof ShortFilmCard>> = {}
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Tunis"
    >
      <ShortFilmCard film={film} {...props} />
    </NextIntlClientProvider>
  )
}

describe("ShortFilmCard", () => {
  it("renders no rating, visually or in the link name", () => {
    const { container } = renderCard()

    expect(container.textContent).not.toMatch(/8[.,]7/)
    expect(container.querySelector(".lucide-star")).toBeNull()

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/shorts/communion")
    expect(link.textContent).not.toMatch(/8[.,]7/)
  })

  it("shows the featured badge as a neutral chip, not a gold fill", () => {
    renderCard()

    const badge = screen.getByText("À la une")
    expect(badge.className).not.toMatch(/\bbg-primary\b/)
    expect(badge.className).toMatch(/bg-aubergine-deep/)
  })

  it("labels online availability with text, not color alone", () => {
    renderCard()

    expect(screen.getAllByText("Disponible en ligne").length).toBeGreaterThan(0)
    expect(screen.getByRole("link").textContent).toContain(
      "Disponible en ligne"
    )
  })
})

describe("ShortFilmCard — heart (D-13)", () => {
  it("renders the heart as a sibling of the link, after it, never inside", () => {
    renderCard()

    const link = screen.getByRole("link")
    const heart = screen.getByRole("button", {
      name: "Ajouter « Communion » à ma watchlist",
    })

    expect(link.contains(heart)).toBe(false)
    expect(heart.closest("a")).toBeNull()
    expect(
      link.compareDocumentPosition(heart) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("names the film in the heart's accessible name", () => {
    renderCard({ ...FILM, title: "La Nuit" })

    expect(screen.getByRole("button", { name: /La Nuit/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("has exactly two controls without a trailer handler: link, then heart", () => {
    const { container } = renderCard()

    const controls = Array.from(container.querySelectorAll("a, button"))
    expect(controls.map((el) => el.tagName)).toEqual(["A", "BUTTON"])
  })

  it("orders link, heart, trailer when the trailer button is present", () => {
    const { container } = renderCard(FILM, "fr", {
      onPlayTrailer: vi.fn(),
    })

    const controls = Array.from(container.querySelectorAll("a, button"))
    expect(controls.map((el) => el.tagName)).toEqual(["A", "BUTTON", "BUTTON"])
    expect(controls[1]).toHaveAccessibleName(/Ajouter/)
    expect(controls[2]).toHaveAccessibleName("Bande-annonce de Communion")
  })

  it("a heart tap toggles and never reaches the card or navigates", () => {
    // React delegates at the root: a document-level listener sees the click
    // only if the heart failed to stop propagation.
    const reachedDocument = vi.fn()
    document.body.addEventListener("click", reachedDocument)
    try {
      renderCard()

      const notPrevented = fireEvent.click(screen.getByRole("button"))

      expect(toggleSpy).toHaveBeenCalledTimes(1)
      expect(reachedDocument).not.toHaveBeenCalled()
      // fireEvent returns false when preventDefault() ran.
      expect(notPrevented).toBe(false)
    } finally {
      document.body.removeEventListener("click", reachedDocument)
    }
  })

  it("leaves the heart out with hideHeart", () => {
    renderCard(FILM, "fr", { hideHeart: true })

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders no heart on a skeleton card", () => {
    const { container } = renderCard(FILM, "fr", { isLoading: true })

    expect(screen.queryByRole("button")).toBeNull()
    expect(container.querySelector("a")).toBeNull()
  })
})

describe("ShortFilmCard — relocated duration (D-13)", () => {
  /** The card's second meta line, in either overlay. */
  function metaLines(container: HTMLElement) {
    return Array.from(container.querySelectorAll("span.truncate"))
      .map((el) => el.textContent)
      .filter((text) => text && /\d/.test(text))
  }

  it("keeps no duration pill or clock at the top-end corner", () => {
    const { container } = renderCard()

    expect(container.querySelector(".lucide-clock")).toBeNull()
    expect(container.querySelector(".end-2.top-2")).toBeNull()
    expect(container.innerHTML).not.toMatch(/bg-black\/60/)
  })

  it("reads 'year · duration' on the second line, in both overlays", () => {
    const { container } = renderCard()

    expect(metaLines(container)).toEqual(["2021 · 18 min", "2021 · 18 min"])
  })

  it("puts the director alone on the first line", () => {
    const { container } = renderCard()

    const first = container.querySelectorAll("div.flex-col > bdi")
    expect(first).toHaveLength(2)
    expect(first[0]!.textContent).toBe("Nejib Ayed")
    expect(first[0]!.textContent).not.toMatch(/2021|•/)
  })

  it.each([
    ["year only", { duration: undefined }, "2021"],
    ["duration only", { releaseYear: undefined }, "18 min"],
  ])("omits the missing part (%s) with no lone separator", (_, patch, text) => {
    const { container } = renderCard({ ...FILM, ...patch })

    expect(metaLines(container)).toEqual([text, text])
    expect(container.textContent).not.toMatch(/ · /)
  })

  it("renders no second line without a year or a duration", () => {
    const { container } = renderCard({
      ...FILM,
      duration: undefined,
      releaseYear: undefined,
    })

    expect(metaLines(container)).toEqual([])
    expect(container.textContent).not.toMatch(/ · | 0 /)
    // The director still shows.
    expect(screen.getAllByText("Nejib Ayed").length).toBeGreaterThan(0)
  })

  it("treats a zero duration as absent", () => {
    const { container } = renderCard({ ...FILM, duration: 0 })

    expect(metaLines(container)).toEqual(["2021", "2021"])
  })

  it("keeps title, director, year and duration in the link's screen-reader text", () => {
    renderCard()

    const text = screen.getByRole("link").textContent
    expect(text).toContain("Communion")
    expect(text).toContain("Nejib Ayed")
    expect(text).toContain("2021")
    expect(text).toContain("18 min")
  })
})

describe("ShortFilmCard — silent French fallback (D-11, FR56)", () => {
  function titleNodes(container: HTMLElement) {
    return Array.from(container.querySelectorAll("h3 > bdi"))
  }

  it("tags the title lang=fr when French is served on an English page", () => {
    const { container } = renderCard({ ...FILM, locale: "fr" }, "en")

    const nodes = titleNodes(container)
    expect(nodes).toHaveLength(2)
    for (const node of nodes) {
      expect(node).toHaveAttribute("lang", "fr")
      expect(node).not.toHaveAttribute("dir")
    }
    // Nothing visible says so.
    expect(container.textContent).not.toMatch(/français|french|fallback/i)
  })

  it("adds dir=ltr on an Arabic page showing Latin text", () => {
    const { container } = renderCard({ ...FILM, locale: "fr" }, "ar")

    for (const node of titleNodes(container)) {
      expect(node).toHaveAttribute("lang", "fr")
      expect(node).toHaveAttribute("dir", "ltr")
    }
  })

  it("does not tag Arabic text on an Arabic page", () => {
    const { container } = renderCard(
      { ...FILM, title: "اتحاد", locale: "fr" },
      "ar"
    )

    for (const node of titleNodes(container)) {
      expect(node).not.toHaveAttribute("lang")
    }
  })

  it("does not tag when the served locale matches the page, or on a French page", () => {
    const matching = renderCard({ ...FILM, locale: "en" }, "en")
    for (const node of titleNodes(matching.container)) {
      expect(node).not.toHaveAttribute("lang")
    }
    cleanup()

    const french = renderCard({ ...FILM, locale: "fr" }, "fr")
    for (const node of titleNodes(french.container)) {
      expect(node).not.toHaveAttribute("lang")
    }
  })

  it("keeps the poster alt empty", () => {
    const { container } = renderCard({ ...FILM, locale: "fr" }, "en")

    expect(container.querySelector("img")).toHaveAttribute("alt", "")
  })
})

describe.each(["fr", "ar", "en"] as const)(
  "ShortFilmCard — axe in %s",
  (locale) => {
    it("is clean with the heart", async () => {
      const { container } = renderCard(FILM, locale)

      await expectNoA11yViolations(container)
    })

    it("is clean with the trailer button too", async () => {
      const { container } = renderCard(FILM, locale, {
        onPlayTrailer: vi.fn(),
      })

      await expectNoA11yViolations(container)
    })
  }
)
