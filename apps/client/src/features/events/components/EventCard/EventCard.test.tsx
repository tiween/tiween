/**
 * EventCard Component Tests
 *
 * NOTE: These tests require Vitest and @testing-library/react to be installed.
 * Run: yarn add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
 *
 * Then create vitest.config.ts with jsdom environment.
 *
 * This file is excluded from type checking until Vitest is installed.
 * @ts-nocheck
 */

import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { EventCardEvent } from "../../types/event.types"

import { EventCard } from "./EventCard"
import { EventCardSkeleton } from "./EventCardSkeleton"

// Purchase flag (Story 3.12): stubbed ON by default so the pre-gating price
// assertions keep passing; the flag-off case flips it per-test.
const { purchaseFlag } = vi.hoisted(() => ({ purchaseFlag: { enabled: true } }))
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => purchaseFlag.enabled,
}))

// `priceFrom` interpolates `{price}`, so it is NOT a prop (a function cannot
// cross the RSC boundary) — `EventCard` looks it up itself. Echo the key plus
// the interpolated price so the wiring, not a hardcoded string, is asserted.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.price === undefined ? key : `${key}:${values.price}`,
}))

// Locale-aware Link (short-film entries on the watchlist page, plan 02-07): the
// real one needs the next-intl routing context, so render a plain anchor.
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

// Mock next/image for testing
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

const mockEvent: EventCardEvent = {
  id: "test-1",
  title: "Test Event",
  posterUrl: "https://example.com/poster.jpg",
  category: "Cinéma",
  venueName: "Test Venue",
  date: new Date("2025-02-15"),
  price: 25,
  currency: "TND",
}

describe("EventCard", () => {
  describe("Rendering", () => {
    it("renders event title", () => {
      render(<EventCard event={mockEvent} />)
      expect(screen.getByText("Test Event")).toBeInTheDocument()
    })

    it("renders event venue name", () => {
      render(<EventCard event={mockEvent} />)
      expect(screen.getByText("Test Venue")).toBeInTheDocument()
    })

    it("renders category badge", () => {
      render(<EventCard event={mockEvent} />)
      expect(screen.getByText("Cinéma")).toBeInTheDocument()
    })

    it("renders price when provided", () => {
      render(<EventCard event={mockEvent} />)
      // The label comes from the `events.priceFrom` message resolved on the
      // client, with the formatted price interpolated into `{price}`. Match the
      // key-prefixed node; a bare /25/ also matches the date "2025".
      expect(screen.getByText(/^priceFrom:/)).toHaveTextContent("25,000")
    })

    it("does not render price when not provided", () => {
      const eventWithoutPrice = { ...mockEvent, price: undefined }
      render(<EventCard event={eventWithoutPrice} />)
      // No empty "From " string either — the whole line is omitted.
      expect(screen.queryByText(/priceFrom/)).not.toBeInTheDocument()
    })

    it("hides the price when ticket purchase is disabled (Story 3.12)", () => {
      purchaseFlag.enabled = false
      try {
        render(<EventCard event={mockEvent} />)
        // Informational content stays; only the ticket price disappears.
        expect(screen.getByText("Test Event")).toBeInTheDocument()
        expect(screen.getByText("Test Venue")).toBeInTheDocument()
        expect(screen.queryByText(/priceFrom/)).not.toBeInTheDocument()
        expect(screen.queryByText(/25,000/)).not.toBeInTheDocument()
      } finally {
        purchaseFlag.enabled = true
      }
    })
  })

  describe("Variants", () => {
    it("renders default variant", () => {
      const { container } = render(
        <EventCard event={mockEvent} variant="default" />
      )
      expect(container.querySelector("article")).toBeInTheDocument()
    })

    it("renders compact variant", () => {
      const { container } = render(
        <EventCard event={mockEvent} variant="compact" />
      )
      expect(container.querySelector("article")).toBeInTheDocument()
    })

    it("renders featured variant", () => {
      const { container } = render(
        <EventCard event={mockEvent} variant="featured" />
      )
      expect(container.querySelector("article")).toBeInTheDocument()
    })
  })

  describe("Watchlist functionality", () => {
    it("calls onWatchlist when heart button is clicked", () => {
      const onWatchlist = vi.fn()
      render(<EventCard event={mockEvent} onWatchlist={onWatchlist} />)

      const watchlistButton = screen.getByRole("button", {
        name: /ajouter à la liste de suivi/i,
      })
      fireEvent.click(watchlistButton)

      expect(onWatchlist).toHaveBeenCalledTimes(1)
    })

    it("shows filled heart when isWatchlisted is true", () => {
      render(<EventCard event={mockEvent} isWatchlisted={true} />)

      const watchlistButton = screen.getByRole("button", {
        name: /retirer de la liste de suivi/i,
      })
      expect(watchlistButton).toHaveAttribute("aria-pressed", "true")
    })

    it("shows outline heart when isWatchlisted is false", () => {
      render(<EventCard event={mockEvent} isWatchlisted={false} />)

      const watchlistButton = screen.getByRole("button", {
        name: /ajouter à la liste de suivi/i,
      })
      expect(watchlistButton).toHaveAttribute("aria-pressed", "false")
    })

    it("does not trigger card onClick when watchlist button is clicked", () => {
      const onClick = vi.fn()
      const onWatchlist = vi.fn()
      render(
        <EventCard
          event={mockEvent}
          onClick={onClick}
          onWatchlist={onWatchlist}
        />
      )

      const watchlistButton = screen.getByRole("button", {
        name: /ajouter à la liste de suivi/i,
      })
      fireEvent.click(watchlistButton)

      expect(onWatchlist).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe("Click functionality", () => {
    it("calls onClick when card is clicked", () => {
      const onClick = vi.fn()
      render(<EventCard event={mockEvent} onClick={onClick} />)

      const article = screen.getByRole("article")
      fireEvent.click(article)

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has correct role and aria-labelledby", () => {
      render(<EventCard event={mockEvent} />)

      const article = screen.getByRole("article")
      expect(article).toHaveAttribute(
        "aria-labelledby",
        `event-title-${mockEvent.id}`
      )
    })

    it("watchlist button has aria-label", () => {
      render(<EventCard event={mockEvent} />)

      const watchlistButton = screen.getByRole("button")
      expect(watchlistButton).toHaveAttribute("aria-label")
    })

    it("watchlist button has aria-pressed state", () => {
      render(<EventCard event={mockEvent} isWatchlisted={false} />)

      const watchlistButton = screen.getByRole("button")
      expect(watchlistButton).toHaveAttribute("aria-pressed")
    })

    it("image has descriptive alt text", () => {
      render(<EventCard event={mockEvent} />)

      const image = screen.getByRole("img")
      expect(image).toHaveAttribute("alt", mockEvent.title)
    })
  })
})

// Story 5.4 — the additive `watchlistDisabled` read-only affordance.
describe("EventCard watchlistDisabled (Story 5.4)", () => {
  const disabledLabels = {
    addToWatchlist: "Add",
    removeFromWatchlist: "Remove",
    watchlistDisabledHint: "Unavailable offline",
  }

  it("renders a disabled heart whose click does not call onWatchlist", () => {
    const onWatchlist = vi.fn()
    render(
      <EventCard
        event={mockEvent}
        onWatchlist={onWatchlist}
        watchlistDisabled
        labels={disabledLabels}
      />
    )

    const heart = screen.getByRole("button", { name: "Add" })
    // `aria-disabled` (not the native `disabled` attribute) so the control stays
    // focusable and the Radix tooltip can open on hover/keyboard focus.
    expect(heart).toHaveAttribute("aria-disabled", "true")
    expect(heart).not.toBeDisabled()

    // A click on the disabled control is a no-op (no add/remove, no queue).
    fireEvent.click(heart)
    expect(onWatchlist).not.toHaveBeenCalled()
  })

  it("exposes the disabled hint so the tooltip content is reachable", () => {
    render(
      <EventCard event={mockEvent} watchlistDisabled labels={disabledLabels} />
    )

    expect(screen.getByTitle("Unavailable offline")).toBeInTheDocument()
  })

  it("keeps the default enabled behavior when the prop is omitted", () => {
    const onWatchlist = vi.fn()
    render(
      <EventCard
        event={mockEvent}
        onWatchlist={onWatchlist}
        labels={disabledLabels}
      />
    )

    const heart = screen.getByRole("button", { name: "Add" })
    expect(heart).toHaveAttribute("aria-disabled", "false")
    expect(heart).not.toBeDisabled()

    fireEvent.click(heart)
    expect(onWatchlist).toHaveBeenCalledTimes(1)
    expect(screen.queryByTitle("Unavailable offline")).not.toBeInTheDocument()
  })
})

// Plan 02-07 (FR21, D-16): the additive `shortFilm` prop turns the default card
// into the watchlist's short-film entry. Without it nothing changes (every
// suite above).
describe("EventCard shortFilm (plan 02-07)", () => {
  const shortEvent: EventCardEvent = {
    id: "cw-short-1",
    title: "Les Souliers de l'Aïd",
    posterUrl: "",
    category: "Court métrage",
    venueName: "",
    date: "",
  }
  const fallback = <div data-testid="reserved-artwork" />

  it("renders the same markup as before when the prop is omitted", () => {
    const { container: plain } = render(<EventCard event={mockEvent} />)
    const { container: withUndefined } = render(
      <EventCard event={mockEvent} shortFilm={undefined} />
    )
    expect(withUndefined.innerHTML).toBe(plain.innerHTML)
    expect(plain.querySelector("a")).toBeNull()
    expect(screen.getAllByText("Test Venue")).toHaveLength(2)
  })

  it("frames the poster at 2:3 and shows the fallback node when there is no poster", () => {
    const { container } = render(
      <EventCard event={shortEvent} shortFilm={{ posterFallback: fallback }} />
    )

    expect(screen.getByTestId("reserved-artwork")).toBeInTheDocument()
    // No Next image and never the shared event placeholder.
    expect(container.querySelector("img")).toBeNull()
    expect(container.innerHTML).not.toContain("placeholder-poster")
    const frame = screen.getByTestId("reserved-artwork").parentElement
    expect(frame?.className).toContain("aspect-[2/3]")
    expect(frame?.className).not.toContain("h-40")
  })

  it("shows the poster when the record has one", () => {
    const { container } = render(
      <EventCard
        event={{ ...shortEvent, posterUrl: "https://example.com/p.jpg" }}
        shortFilm={{ posterFallback: fallback }}
      />
    )
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/p.jpg"
    )
    // Decorative: the title link right below already names the film.
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    expect(screen.queryByTestId("reserved-artwork")).toBeNull()
  })

  it("renders no venue and no date row, even when the event carries them", () => {
    const { container } = render(
      <EventCard
        event={{ ...shortEvent, venueName: "Salle X", date: "2026-02-01" }}
        shortFilm={{ posterFallback: fallback }}
      />
    )
    expect(screen.queryByText("Salle X")).toBeNull()
    expect(container.textContent).not.toContain("01/02/2026")
    expect(container.textContent).not.toContain("•")
    expect(container.textContent).not.toContain("—")
  })

  it("renders the meta line only when it is a non-empty string", () => {
    const { rerender } = render(
      <EventCard
        event={shortEvent}
        shortFilm={{ metaLine: "2012 · 30 min", posterFallback: fallback }}
      />
    )
    expect(screen.getByText("2012 · 30 min")).toBeInTheDocument()

    for (const metaLine of [null, undefined, ""]) {
      rerender(
        <EventCard
          event={shortEvent}
          shortFilm={{ metaLine, posterFallback: fallback }}
        />
      )
      expect(screen.queryByText("2012 · 30 min")).toBeNull()
      expect(document.querySelector("article p")).toBeNull()
    }
  })

  it("makes the title a locale-aware link named by the title and leaves the article inert", () => {
    const onClick = vi.fn()
    render(
      <EventCard
        event={shortEvent}
        onClick={onClick}
        shortFilm={{ href: "/shorts/les-souliers-de-laid" }}
      />
    )

    const link = screen.getByRole("link", { name: "Les Souliers de l'Aïd" })
    expect(link).toHaveAttribute("href", "/shorts/les-souliers-de-laid")
    // Stretched over the whole card.
    expect(link.className).toContain("after:absolute")
    expect(link.className).toContain("after:inset-0")

    const article = screen.getByRole("article")
    fireEvent.click(article)
    expect(onClick).not.toHaveBeenCalled()
    expect(article.className).not.toContain("cursor-pointer")
  })

  it("renders no link when there is no href", () => {
    const { container } = render(
      <EventCard event={shortEvent} shortFilm={{ posterFallback: fallback }} />
    )
    expect(container.querySelector("a")).toBeNull()
    expect(
      screen.getByRole("heading", { name: "Les Souliers de l'Aïd" })
    ).toBeInTheDocument()
  })

  it("keeps the heart an independent target above the stretched link", () => {
    const onWatchlist = vi.fn()
    const onClick = vi.fn()
    render(
      <EventCard
        event={shortEvent}
        isWatchlisted
        onWatchlist={onWatchlist}
        onClick={onClick}
        shortFilm={{ href: "/shorts/x" }}
      />
    )

    const heart = screen.getByRole("button", { name: /retirer/i })
    expect(heart.className).toContain("z-20")
    fireEvent.click(heart)
    expect(onWatchlist).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe("EventCardSkeleton", () => {
  it("renders with aria-busy attribute", () => {
    render(<EventCardSkeleton />)

    const skeleton = screen.getByRole("article")
    expect(skeleton).toHaveAttribute("aria-busy", "true")
  })

  it("renders with loading label", () => {
    render(<EventCardSkeleton />)

    const skeleton = screen.getByRole("article")
    expect(skeleton).toHaveAttribute("aria-label", "Loading event")
  })

  it("renders default variant", () => {
    const { container } = render(<EventCardSkeleton variant="default" />)
    expect(container.querySelector('[role="article"]')).toBeInTheDocument()
  })

  it("renders compact variant", () => {
    const { container } = render(<EventCardSkeleton variant="compact" />)
    expect(container.querySelector('[role="article"]')).toBeInTheDocument()
  })

  it("renders featured variant", () => {
    const { container } = render(<EventCardSkeleton variant="featured" />)
    expect(container.querySelector('[role="article"]')).toBeInTheDocument()
  })
})
