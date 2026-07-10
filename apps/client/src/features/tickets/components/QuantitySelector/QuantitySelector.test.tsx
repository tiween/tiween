import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { QuantitySelector } from "./QuantitySelector"

/**
 * Tests for QuantitySelector (Story 6.2): the controlled +/- API, min/max
 * disabling, shared `formatPrice` output, and accessible labels.
 */

const labels = {
  decrease: "Diminuer",
  increase: "Augmenter",
  quantity: "Quantité",
}

describe("QuantitySelector", () => {
  it("formats the unit price through the shared formatter", () => {
    render(
      <QuantitySelector
        quantity={1}
        ticketType="Plein tarif"
        unitPrice={15}
        currency="TND"
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText("15,00 DT")).toBeInTheDocument()
  })

  it("increments via onChange when below max", () => {
    const onChange = vi.fn()
    render(
      <QuantitySelector
        quantity={2}
        min={0}
        max={10}
        ticketType="Plein tarif"
        unitPrice={15}
        onChange={onChange}
        labels={labels}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Augmenter" }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("decrements via onChange when above min", () => {
    const onChange = vi.fn()
    render(
      <QuantitySelector
        quantity={2}
        min={0}
        max={10}
        ticketType="Plein tarif"
        unitPrice={15}
        onChange={onChange}
        labels={labels}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Diminuer" }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it("disables and no-ops the minus button at min", () => {
    const onChange = vi.fn()
    render(
      <QuantitySelector
        quantity={0}
        min={0}
        max={10}
        ticketType="Plein tarif"
        unitPrice={15}
        onChange={onChange}
        labels={labels}
      />
    )
    const minus = screen.getByRole("button", { name: "Diminuer" })
    expect(minus).toBeDisabled()
    fireEvent.click(minus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("disables and no-ops the plus button at max", () => {
    const onChange = vi.fn()
    render(
      <QuantitySelector
        quantity={3}
        min={0}
        max={3}
        ticketType="Plein tarif"
        unitPrice={15}
        onChange={onChange}
        labels={labels}
      />
    )
    const plus = screen.getByRole("button", { name: "Augmenter" })
    expect(plus).toBeDisabled()
    fireEvent.click(plus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("exposes the current quantity via an aria-label", () => {
    render(
      <QuantitySelector
        quantity={4}
        ticketType="Plein tarif"
        unitPrice={15}
        onChange={vi.fn()}
        labels={labels}
      />
    )
    expect(screen.getByLabelText("Quantité: 4")).toHaveTextContent("4")
  })
})
