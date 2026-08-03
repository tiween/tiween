/**
 * MovieCard admin component tests.
 *
 * Runs in the jsdom test project (see jest.config.cjs → "admin" project).
 * Uses @strapi/design-system real components wrapped in DesignSystemProvider
 * so styled-components can access the theme. No fetch mocks needed — this
 * component is purely presentational.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { fireEvent, render, screen } from "@testing-library/react"

import type { MovieCardData } from "../MovieCard"

import { MovieCard } from "../MovieCard"

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <DesignSystemProvider theme={lightTheme}>{ui}</DesignSystemProvider>
  )
}

const baseMovie: MovieCardData = {
  id: 42,
  title: "Inception",
  originalTitle: "Inception",
  posterUrl: "https://example.com/inception.jpg",
  releaseDate: "2010-07-16",
  runtime: 148,
  overview:
    "A thief who steals corporate secrets through dream-sharing technology.",
  voteAverage: 8.4,
}

describe("MovieCard", () => {
  it("renders the movie title", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    expect(screen.getByText("Inception")).toBeInTheDocument()
  })

  it("renders release year computed from releaseDate", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    expect(screen.getByText("2010")).toBeInTheDocument()
  })

  it("renders the formatted runtime (2h 28m)", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    expect(screen.getByText(/2h 28m/)).toBeInTheDocument()
  })

  it("renders the vote average with one decimal", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    expect(screen.getByText(/★ 8\.4/)).toBeInTheDocument()
  })

  it("renders the overview text", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    expect(screen.getByText(/dream-sharing technology/i)).toBeInTheDocument()
  })

  it("renders the poster image with alt=title when posterUrl is set", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    const img = screen.getByAltText("Inception") as HTMLImageElement
    expect(img.src).toBe("https://example.com/inception.jpg")
  })

  it("renders 'No poster' placeholder when posterUrl is null", () => {
    renderWithProvider(<MovieCard movie={{ ...baseMovie, posterUrl: null }} />)
    expect(screen.getByText(/no poster/i)).toBeInTheDocument()
  })

  it("hides originalTitle when it equals title", () => {
    renderWithProvider(<MovieCard movie={baseMovie} />)
    // Title appears once (as the bold heading), originalTitle row is suppressed
    expect(screen.getAllByText("Inception")).toHaveLength(1)
  })

  it("renders originalTitle when it differs from title", () => {
    renderWithProvider(
      <MovieCard
        movie={{ ...baseMovie, originalTitle: "Le Voyage Onirique" }}
      />
    )
    expect(screen.getByText("Le Voyage Onirique")).toBeInTheDocument()
  })

  it("does not render runtime when value is null", () => {
    renderWithProvider(<MovieCard movie={{ ...baseMovie, runtime: null }} />)
    expect(screen.queryByText(/h \d+m/)).not.toBeInTheDocument()
  })

  it("calls onSelect when card body is clicked", () => {
    const onSelect = jest.fn()
    renderWithProvider(<MovieCard movie={baseMovie} onSelect={onSelect} />)
    fireEvent.click(screen.getByText("Inception"))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(baseMovie)
  })

  it("calls onFavoriteToggle (and NOT onSelect) when favorite button is clicked", () => {
    const onSelect = jest.fn()
    const onFavoriteToggle = jest.fn()
    renderWithProvider(
      <MovieCard
        movie={baseMovie}
        onSelect={onSelect}
        onFavoriteToggle={onFavoriteToggle}
      />
    )

    const favBtn = screen.getByRole("button", { name: /add to favorites/i })
    fireEvent.click(favBtn)

    expect(onFavoriteToggle).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("uses 'Remove from favorites' label when isFavorite=true", () => {
    renderWithProvider(<MovieCard movie={baseMovie} isFavorite />)
    expect(
      screen.getByRole("button", { name: /remove from favorites/i })
    ).toBeInTheDocument()
  })

  it("shows '✓ Selected' indicator when isSelected=true", () => {
    renderWithProvider(<MovieCard movie={baseMovie} isSelected />)
    expect(screen.getByText(/✓ Selected/)).toBeInTheDocument()
  })
})
