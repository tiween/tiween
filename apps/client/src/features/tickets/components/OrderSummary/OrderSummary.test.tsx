import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { OrderSummary, type OrderLineItem } from "./OrderSummary"

/**
 * Tests for OrderSummary (Story 6.2): subtotal/total computation, the
 * zero-item null render, the optional service-fee row, and shared `formatPrice`
 * output.
 */

const items: OrderLineItem[] = [
  { ticketType: "Plein tarif", quantity: 2, unitPrice: 15 },
  { ticketType: "VIP", quantity: 1, unitPrice: 40 },
]

describe("OrderSummary", () => {
  it("computes the golden multi-type subtotal/total (2x15 + 1x40 = 70)", () => {
    render(
      <OrderSummary
        eventTitle="Inception"
        showtime="20:30"
        items={items}
        currency="TND"
      />
    )
    // Both subtotal and total equal 70,00 DT with no service fee.
    expect(screen.getAllByText("70,00 DT").length).toBeGreaterThanOrEqual(2)
  })

  it("renders line totals through the shared formatter", () => {
    render(
      <OrderSummary
        eventTitle="Inception"
        showtime="20:30"
        items={items}
        currency="TND"
      />
    )
    expect(screen.getByText("30,00 DT")).toBeInTheDocument() // 2 x 15
    expect(screen.getByText("40,00 DT")).toBeInTheDocument() // 1 x 40
  })

  it("renders nothing when there are no active items", () => {
    const { container } = render(
      <OrderSummary
        eventTitle="Inception"
        showtime="20:30"
        items={[{ ticketType: "Plein tarif", quantity: 0, unitPrice: 15 }]}
        currency="TND"
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("adds the service fee into the total when provided", () => {
    render(
      <OrderSummary
        eventTitle="Inception"
        showtime="20:30"
        items={[{ ticketType: "Plein tarif", quantity: 2, unitPrice: 15 }]}
        serviceFee={2}
        currency="TND"
        labels={{ subtotal: "Sous-total", serviceFee: "Frais", total: "Total" }}
      />
    )
    expect(screen.getByText("Frais")).toBeInTheDocument()
    expect(screen.getByText("2,00 DT")).toBeInTheDocument() // fee row
    expect(screen.getByText("32,00 DT")).toBeInTheDocument() // 30 + 2 total
  })
})
