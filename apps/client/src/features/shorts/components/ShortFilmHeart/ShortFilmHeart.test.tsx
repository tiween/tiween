/**
 * ShortFilmHeart — the card heart (FR19, FR20; UI-SPEC B1; D-13, D-14).
 *
 * The state machine is covered in `useShortFilmHeart.test.tsx`; here the hook
 * is mocked and the REAL fr, ar and en catalogs prove the accessible name, the
 * `aria-pressed` agreement, the busy state, the click isolation and the
 * overlay styling contract.
 */
import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../../test/helpers/axe"
import { ShortFilmHeart } from "./ShortFilmHeart"

const { heartState, toggleSpy, heartArgs } = vi.hoisted(() => ({
  heartState: {
    isSaved: false,
    isBusy: false,
    isResolved: true,
    isPending: false,
    status: "authenticated" as const,
  },
  toggleSpy: vi.fn(),
  heartArgs: vi.fn(),
}))

vi.mock("@/features/watchlist/hooks/useShortFilmHeart", () => ({
  useShortFilmHeart: (...args: unknown[]) => {
    heartArgs(...args)
    return { ...heartState, toggle: toggleSpy }
  },
}))

const MESSAGES = { fr, ar, en } as const
type TestLocale = keyof typeof MESSAGES

const FILM = { documentId: "doc-1", title: "Communion" }

function ui(locale: TestLocale = "fr") {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Tunis"
    >
      <ShortFilmHeart film={FILM} />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  heartState.isSaved = false
  heartState.isBusy = false
  toggleSpy.mockClear()
  heartArgs.mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ShortFilmHeart", () => {
  it("reads the card surface of the shared state machine", () => {
    render(ui())

    expect(heartArgs).toHaveBeenCalledWith("doc-1", { surface: "card" })
  })

  it("renders one button named after the film, agreeing with aria-pressed", () => {
    const { rerender } = render(ui())

    const add = screen.getByRole("button", {
      name: "Ajouter « Communion » à ma watchlist",
    })
    expect(add).toHaveAttribute("aria-pressed", "false")
    expect(screen.getAllByRole("button")).toHaveLength(1)

    heartState.isSaved = true
    rerender(ui())

    const remove = screen.getByRole("button", {
      name: "Retirer « Communion » de ma watchlist",
    })
    expect(remove).toHaveAttribute("aria-pressed", "true")
  })

  it("uses the watchlist wording in ar and en", () => {
    const { rerender } = render(ui("ar"))
    expect(
      screen.getByRole("button", {
        name: "إضافة «Communion» إلى قائمة المتابعة",
      })
    ).toBeInTheDocument()

    rerender(ui("en"))
    expect(
      screen.getByRole("button", { name: "Add Communion to my watchlist" })
    ).toBeInTheDocument()
  })

  it("is aria-busy but still focusable and inert while unresolved or pending", () => {
    heartState.isBusy = true
    render(ui())

    const heart = screen.getByRole("button")
    expect(heart).toHaveAttribute("aria-busy", "true")
    expect(heart).not.toBeDisabled()

    heart.focus()
    expect(heart).toHaveFocus()

    fireEvent.click(heart)
    expect(toggleSpy).not.toHaveBeenCalled()
  })

  it("is not busy by default", () => {
    render(ui())

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy")
  })

  it("toggles on tap and never reaches an ancestor link or navigates", () => {
    const parentClick = vi.fn()
    render(
      <NextIntlClientProvider locale="fr" messages={fr} timeZone="Africa/Tunis">
        <div onClick={parentClick}>
          <a href="/shorts/communion">
            <ShortFilmHeart film={FILM} />
          </a>
        </div>
      </NextIntlClientProvider>
    )

    const heart = screen.getByRole("button")
    const notPrevented = fireEvent.click(heart)

    expect(toggleSpy).toHaveBeenCalledTimes(1)
    expect(parentClick).not.toHaveBeenCalled()
    // fireEvent returns false when preventDefault() was called.
    expect(notPrevented).toBe(false)
  })

  it("sits at the top-end corner above the link, with logical properties only", () => {
    render(ui())

    const heart = screen.getByRole("button")
    expect(heart.className).toMatch(/\bend-1\b/)
    expect(heart.className).toMatch(/\btop-1\b/)
    expect(heart.className).toMatch(/\bz-20\b/)
    expect(heart.className).toMatch(/\babsolute\b/)
    expect(heart.className).not.toMatch(/\b(left|right|ml|mr|pl|pr)-/)
  })

  it("is a 44px target around a 40px disc with a 20px glyph on Tiween tokens", () => {
    const { container } = render(ui())

    const heart = screen.getByRole("button")
    expect(heart.className).toMatch(/\bsize-11\b/)
    expect(heart.className).toMatch(/rounded-full/)

    const disc = heart.firstElementChild as HTMLElement
    expect(disc.className).toMatch(/\bsize-10\b/)
    expect(disc.className).toMatch(/bg-aubergine-deep\/80/)
    expect(disc.className).toMatch(/\bborder-border\b/)
    expect(disc.className).toMatch(/backdrop-blur/)
    expect(disc.className).not.toMatch(/shadow/)

    const glyph = container.querySelector("svg") as SVGElement
    expect(glyph.getAttribute("class")).toMatch(/\bsize-5\b/)
  })

  it("never uses a black/50 scrim or a raw white utility", () => {
    for (const saved of [false, true]) {
      heartState.isSaved = saved
      const { container, unmount } = render(ui())

      const classes = container.innerHTML
      expect(classes).not.toMatch(/black\/50|black\/70/)
      expect(classes).not.toMatch(/\btext-white\b|\bfill-white\b|\bbg-white\b/)
      unmount()
    }
  })

  it("draws outline vs filled Gold Leaf, never colour alone", () => {
    const { container, rerender } = render(ui())

    const glyph = () =>
      container.querySelector("svg")!.getAttribute("class") ?? ""
    expect(glyph()).toMatch(/fill-transparent/)
    expect(glyph()).toMatch(/text-foreground/)

    heartState.isSaved = true
    rerender(ui())

    expect(glyph()).toMatch(/fill-primary/)
    expect(glyph()).toMatch(/text-primary/)
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  describe("save pulse", () => {
    function stubMotion(reduce: boolean) {
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
          matches: reduce && query.includes("prefers-reduced-motion"),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }))
      )
    }

    it("pulses on the unsaved to saved transition only", () => {
      stubMotion(false)
      const { rerender } = render(ui())
      expect(screen.getByRole("button").className).not.toMatch(
        /animate-watchlist-pulse/
      )

      heartState.isSaved = true
      rerender(ui())
      expect(screen.getByRole("button").className).toMatch(
        /animate-watchlist-pulse/
      )
    })

    it("does not pulse under reduced motion", () => {
      stubMotion(true)
      const { rerender } = render(ui())

      heartState.isSaved = true
      rerender(ui())

      expect(screen.getByRole("button").className).not.toMatch(
        /animate-watchlist-pulse/
      )
    })

    it("does not pulse when a saved heart first renders", () => {
      stubMotion(false)
      heartState.isSaved = true
      render(ui())

      expect(screen.getByRole("button").className).not.toMatch(
        /animate-watchlist-pulse/
      )
    })
  })

  describe.each(["fr", "ar", "en"] as const)("axe in %s", (locale) => {
    it.each([false, true])("is clean (saved: %s)", async (saved) => {
      heartState.isSaved = saved
      const { container } = render(ui(locale))

      await expectNoA11yViolations(container)
    })

    it("is clean while busy", async () => {
      heartState.isBusy = true
      const { container } = render(ui(locale))

      await expectNoA11yViolations(container)
    })
  })
})
