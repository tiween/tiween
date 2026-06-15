/**
 * VenueCard admin component tests.
 *
 * Exercises a styled-components-using component that depends on the
 * Strapi design system theme. We mount via DesignSystemProvider so the
 * styled-components `${({ theme }) => theme...}` interpolations resolve.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { fireEvent, render, screen } from "@testing-library/react"

import type { Venue } from "../../hooks/useVenuesEnhanced"

import { VenueCard } from "../VenueCard"

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <DesignSystemProvider theme={lightTheme}>{ui}</DesignSystemProvider>
  )
}

const baseVenue: Venue = {
  id: 1,
  documentId: "venue-1",
  name: "Cinéma Le Colisée",
  slug: "cinema-le-colisee",
  type: "cinema",
  status: "approved",
  capacity: 250,
  city: "Tunis",
  region: "Tunis",
}

describe("VenueCard", () => {
  it("renders the venue name", () => {
    renderWithProvider(<VenueCard venue={baseVenue} />)
    expect(screen.getByText("Cinéma Le Colisée")).toBeInTheDocument()
  })

  it("renders the type label badge from TYPE_CONFIG (cinema → 'Cinéma')", () => {
    renderWithProvider(<VenueCard venue={baseVenue} />)
    expect(screen.getByText("Cinéma")).toBeInTheDocument()
  })

  it("renders 'city, region' when both are set", () => {
    renderWithProvider(<VenueCard venue={baseVenue} />)
    expect(screen.getByText("Tunis, Tunis")).toBeInTheDocument()
  })

  it("renders just the city when region is omitted", () => {
    renderWithProvider(
      <VenueCard venue={{ ...baseVenue, region: undefined }} />
    )
    expect(screen.getByText("Tunis")).toBeInTheDocument()
  })

  it("renders 'Emplacement non défini' when neither city nor cityRef is set", () => {
    renderWithProvider(
      <VenueCard venue={{ ...baseVenue, city: undefined, region: undefined }} />
    )
    expect(screen.getByText(/emplacement non défini/i)).toBeInTheDocument()
  })

  it("renders capacity with '• 250 places' when capacity is set and not compact", () => {
    renderWithProvider(<VenueCard venue={baseVenue} />)
    expect(screen.getByText(/• 250 places/)).toBeInTheDocument()
  })

  it("hides capacity in compact mode", () => {
    renderWithProvider(<VenueCard venue={baseVenue} compact />)
    expect(screen.queryByText(/• 250 places/)).not.toBeInTheDocument()
  })

  it("renders status badge when showStatus=true", () => {
    renderWithProvider(<VenueCard venue={baseVenue} showStatus />)
    // 'approved' → 'Approuvé'
    expect(screen.getByText(/approuvé/i)).toBeInTheDocument()
  })

  it("does NOT render status badge when showStatus=false (default)", () => {
    renderWithProvider(<VenueCard venue={baseVenue} />)
    expect(screen.queryByText(/approuvé/i)).not.toBeInTheDocument()
  })

  it("renders logo image when venue.logo.url is set", () => {
    const venueWithLogo: Venue = {
      ...baseVenue,
      logo: {
        url: "https://example.com/logo.png",
        formats: {},
      } as Venue["logo"],
    }
    renderWithProvider(<VenueCard venue={venueWithLogo} />)
    const img = screen.getByAltText("Cinéma Le Colisée") as HTMLImageElement
    expect(img.src).toBe("https://example.com/logo.png")
  })

  it("calls onClick when card is clicked", () => {
    const onClick = jest.fn()
    renderWithProvider(<VenueCard venue={baseVenue} onClick={onClick} />)
    fireEvent.click(screen.getByText("Cinéma Le Colisée"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders the theater type label", () => {
    renderWithProvider(<VenueCard venue={{ ...baseVenue, type: "theater" }} />)
    expect(screen.getByText("Théâtre")).toBeInTheDocument()
  })

  it("renders the cultural-center type label", () => {
    renderWithProvider(
      <VenueCard venue={{ ...baseVenue, type: "cultural-center" }} />
    )
    expect(screen.getByText("Centre culturel")).toBeInTheDocument()
  })
})
