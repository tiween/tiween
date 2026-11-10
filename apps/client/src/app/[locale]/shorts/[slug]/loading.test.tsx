/**
 * shorts/[slug]/loading.tsx: the detail skeleton (SPAGE-01, UI-SPEC A7).
 */
import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it } from "vitest"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../../test/helpers/axe"
import ShortFilmLoading from "./loading"

const catalogs = { fr, ar, en } as const
type Locale = keyof typeof catalogs

function renderLoading(locale: Locale = "fr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <ShortFilmLoading />
    </NextIntlClientProvider>
  )
}

afterEach(cleanup)

describe("short film detail loading", () => {
  it("is aria-busy with visually hidden status text", () => {
    const { container } = renderLoading("fr")

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Chargement du court métrage")
    expect(status).toHaveClass("sr-only")
  })

  it("renders a hero-height block with the reserved stripe, three bars and a 52px round block", () => {
    const { container } = renderLoading("fr")

    const hero = container.querySelector(
      ".h-\\[clamp\\(440px\\,62vw\\,580px\\)\\]"
    )
    expect(hero).not.toBeNull()
    // The reserved stripe is the decorative, aria-hidden artwork frame.
    expect(hero?.querySelector('[aria-hidden="true"]')).not.toBeNull()
    // Chip row, title, meta line.
    expect(hero?.querySelectorAll(".animate-pulse")).toHaveLength(3)

    const heart = container.querySelector(".size-\\[52px\\]")
    expect(heart).not.toBeNull()
    expect(heart).toHaveClass("rounded-full")
  })

  it("is static under reduced motion", () => {
    const { container } = renderLoading("fr")

    expect(container.querySelector("main")?.className).toContain(
      "motion-reduce:[&_*]:animate-none"
    )
  })

  it("has no heading, button or link to announce while loading", () => {
    renderLoading("fr")

    expect(screen.queryByRole("heading")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it.each(["fr", "ar", "en"] as const)(
    "%s: status copy and axe",
    async (locale) => {
      const { container } = renderLoading(locale)

      expect(screen.getByRole("status")).toHaveTextContent(
        catalogs[locale].shorts.detail.loading
      )
      await expectNoA11yViolations(container)
    }
  )
})
