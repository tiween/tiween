/**
 * shorts/loading.tsx: the directory skeleton (SPAGE-01, UI-SPEC C5).
 *
 * Real catalogs through a genuine `NextIntlClientProvider`. jsdom has no
 * animation timing, so nothing here gates on it.
 */
import * as React from "react"
import { SHORTS_GRID_CLASS } from "@/features/shorts/components/shortsLayout"
import { cleanup, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it } from "vitest"

import ar from "../../../../locales/ar.json"
import en from "../../../../locales/en.json"
import fr from "../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../test/helpers/axe"
import ShortsLoading from "./loading"

const catalogs = { fr, ar, en } as const
type Locale = keyof typeof catalogs

function renderLoading(locale: Locale = "fr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <ShortsLoading />
    </NextIntlClientProvider>
  )
}

afterEach(cleanup)

describe("shorts directory loading", () => {
  it("shows the real intro, not a skeleton for the heading", () => {
    renderLoading("fr")

    expect(
      screen.getByRole("heading", { level: 1, name: "Courts métrages" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(fr.shorts.directory.description)
    ).toBeInTheDocument()
  })

  it("is aria-busy with visually hidden status text", () => {
    const { container } = renderLoading("fr")

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Chargement des courts métrages…")
    expect(status).toHaveClass("sr-only")
  })

  it("renders 12 card skeletons in the shared directory grid", () => {
    const { container } = renderLoading("fr")

    const grid = Array.from(container.querySelectorAll("div")).find((element) =>
      element.className.includes("grid-cols-2")
    )
    expect(grid).toBeDefined()
    for (const token of SHORTS_GRID_CLASS.split(" ")) {
      expect(grid).toHaveClass(token)
    }
    expect(grid?.children).toHaveLength(12)
    for (const card of Array.from(grid?.children ?? [])) {
      expect(card).toHaveClass("aspect-[2/3]", "rounded-2xl")
    }
  })

  it("has a 120px result-line bar", () => {
    const { container } = renderLoading("fr")

    expect(container.querySelector(".w-\\[120px\\]")).not.toBeNull()
  })

  it("puts no heart, button or link on skeleton cards", () => {
    renderLoading("fr")

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("turns the pulse off under reduced motion and uses no gold fill", () => {
    const { container } = renderLoading("fr")
    const root = container.querySelector("main") as HTMLElement

    expect(root.className).toContain("motion-reduce:[&_*]:animate-none")
    expect(root.innerHTML).not.toMatch(/bg-gold|bg-primary(?!\/10)/)
  })

  it.each(["fr", "ar", "en"] as const)(
    "%s: intro copy and axe",
    async (locale) => {
      const { container } = renderLoading(locale)
      const catalog = catalogs[locale]

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: catalog.shorts.directory.title,
        })
      ).toBeInTheDocument()
      expect(
        screen.getByText(catalog.shorts.directory.description)
      ).toBeInTheDocument()
      expect(screen.getByRole("status")).toHaveTextContent(
        catalog.shorts.directory.loading
      )

      await expectNoA11yViolations(container)
    }
  )
})
