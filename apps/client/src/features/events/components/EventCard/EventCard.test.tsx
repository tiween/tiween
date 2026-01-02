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

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { EventCardEvent } from "../../types/event.types"

import { EventCard } from "./EventCard"
import { EventCardSkeleton } from "./EventCardSkeleton"

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
      expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it("does not render price when not provided", () => {
      const eventWithoutPrice = { ...mockEvent, price: undefined }
      render(<EventCard event={eventWithoutPrice} />)
      expect(screen.queryByText(/À partir de/)).not.toBeInTheDocument()
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
