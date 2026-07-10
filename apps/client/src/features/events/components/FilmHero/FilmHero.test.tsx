/**
 * Tests for the FilmHero watchlist control (Story 5.1):
 *  - `watchlistDisabled` renders a non-interactive button (click is a no-op).
 *  - the `animate-watchlist-pulse` fires ONLY after a user click drives the
 *    false→true transition, NOT when `isWatchlisted` hydrates true on load.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FilmHero, type FilmHeroEvent, type FilmHeroLabels } from "./FilmHero"

const event: FilmHeroEvent = {
  id: "evt-1",
  title: "Le Voyage",
  category: "Cinéma",
}

const labels: FilmHeroLabels = {
  addToWatchlist: "add-wl",
  removeFromWatchlist: "remove-wl",
  share: "share-btn",
  inVenues: (count) => String(count),
  minutes: "min",
}

afterEach(() => cleanup())

describe("FilmHero — watchlistDisabled", () => {
  it("renders a disabled button that does not call onWatchlist on click", () => {
    const onWatchlist = vi.fn()
    const { container } = render(
      <FilmHero
        event={event}
        isWatchlisted={false}
        onWatchlist={onWatchlist}
        watchlistDisabled
        labels={labels}
      />
    )

    const disabledBtn = container.querySelector<HTMLButtonElement>(
      "button[disabled]"
    )
    expect(disabledBtn).not.toBeNull()
    expect(disabledBtn?.getAttribute("aria-disabled")).toBe("true")

    fireEvent.click(disabledBtn!)
    expect(onWatchlist).not.toHaveBeenCalled()
  })
})

describe("FilmHero — pulse", () => {
  it("does NOT pulse when isWatchlisted hydrates true without a click", () => {
    const { rerender } = render(
      <FilmHero event={event} isWatchlisted={false} labels={labels} />
    )

    // Async check hydration flips false→true with no user interaction.
    rerender(<FilmHero event={event} isWatchlisted={true} labels={labels} />)

    expect(screen.getByLabelText("remove-wl").className).not.toContain(
      "animate-watchlist-pulse"
    )
  })

  it("pulses after a user click drives false→true", async () => {
    const onWatchlist = vi.fn()
    const { rerender } = render(
      <FilmHero
        event={event}
        isWatchlisted={false}
        onWatchlist={onWatchlist}
        labels={labels}
      />
    )

    fireEvent.click(screen.getByLabelText("add-wl"))
    expect(onWatchlist).toHaveBeenCalledTimes(1)

    // Parent re-renders watchlisted after the add resolves.
    rerender(
      <FilmHero
        event={event}
        isWatchlisted={true}
        onWatchlist={onWatchlist}
        labels={labels}
      />
    )

    await waitFor(() =>
      expect(screen.getByLabelText("remove-wl").className).toContain(
        "animate-watchlist-pulse"
      )
    )
  })
})
