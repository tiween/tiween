/**
 * shorts/not-found.tsx: the "Court métrage introuvable" block (SPAGE-01, D-07).
 *
 * The locale regression this guards (wave 1 finding): on the unprefixed French
 * path the generic `[locale]/not-found.tsx` rendered ENGLISH copy. This file
 * must follow the locale the `NextIntlClientProvider` carries, so French is
 * French. Copy comes from the REAL catalogs.
 */
import * as React from "react"
import { cleanup, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"

import ar from "../../../../locales/ar.json"
import en from "../../../../locales/en.json"
import fr from "../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../test/helpers/axe"
import ShortsNotFound from "./not-found"

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

const catalogs = { fr, ar, en } as const
type Locale = keyof typeof catalogs

function renderNotFound(locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <ShortsNotFound />
    </NextIntlClientProvider>
  )
}

afterEach(cleanup)

describe("shorts not-found", () => {
  it("renders the French block under the default locale, never English", () => {
    const { container } = renderNotFound("fr")

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Court métrage introuvable",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Ce court métrage n'existe pas ou n'est plus en ligne.")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Voir tous les courts métrages" })
    ).toBeInTheDocument()

    expect(container.textContent).not.toContain(en.shorts.detail.notFoundTitle)
    expect(container.textContent).not.toContain(en.errors.SHORT_FILM_NOT_FOUND)
    expect(container.textContent).not.toContain(en.errors.notFound.title)
  })

  it("has exactly one primary pill, linking to /shorts", () => {
    renderNotFound("fr")
    const main = screen.getByRole("main")

    const links = within(main).getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "/shorts")
  })

  it("is plain content, not an alert", () => {
    const { container } = renderNotFound("fr")

    expect(screen.queryByRole("alert")).toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it("carries the wordmark header", () => {
    renderNotFound("fr")

    expect(screen.getByAltText("tiween")).toBeInTheDocument()
  })

  it("shows no error code, status number or raw key", () => {
    const { container } = renderNotFound("fr")
    const text = container.textContent ?? ""

    expect(text).not.toMatch(/\b404\b/)
    expect(text).not.toContain("SHORT_FILM_NOT_FOUND")
    expect(text).not.toMatch(/shorts\.|errors\./)
  })

  it.each(["fr", "ar", "en"] as const)(
    "%s: catalog copy and axe",
    async (locale) => {
      const { container } = renderNotFound(locale)
      const catalog = catalogs[locale]

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: catalog.shorts.detail.notFoundTitle,
        })
      ).toBeInTheDocument()
      expect(
        screen.getByText(catalog.errors.SHORT_FILM_NOT_FOUND)
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: catalog.shorts.detail.browseAll })
      ).toHaveAttribute("href", "/shorts")

      await expectNoA11yViolations(container)
    }
  )

  it("English copy appears only when the provider locale is English", () => {
    renderNotFound("en")

    expect(screen.getByText(en.shorts.detail.notFoundTitle)).toBeInTheDocument()
    expect(screen.queryByText(fr.shorts.detail.notFoundTitle)).toBeNull()
  })
})
