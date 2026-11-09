/**
 * ShortFilmCard — ratings are out of v1 (PRODUCT.md) and mock values must not
 * read as real, so a film record carrying a rating renders none of it; the
 * featured badge is a neutral chip, not a gold fill (Gold Means Go).
 */
import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ShortFilmCard as ShortFilmCardType } from "../../types"

import fr from "../../../../../locales/fr.json"
import { ShortFilmCard } from "./ShortFilmCard"

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

afterEach(cleanup)

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

function renderCard(film: ShortFilmCardType = FILM) {
  return render(
    <NextIntlClientProvider locale="fr" messages={fr} timeZone="Africa/Tunis">
      <ShortFilmCard film={film} />
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
