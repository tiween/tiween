import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TicketTier } from "@/features/tickets/types"

import { TicketTypeList, type TicketTypeListLabels } from "./TicketTypeList"

const labels: TicketTypeListLabels = {
  types: {
    standard: "Plein tarif",
    reduced: "Tarif réduit",
    vip: "VIP",
  },
  remaining: (count: number) => `${count} restants`,
  soldOut: "Complet",
  restrictionPrefix: "Restriction :",
}

const tiers: TicketTier[] = [
  {
    type: "standard",
    price: 15,
    remaining: 12,
    soldOut: false,
    restrictionNote: null,
  },
  {
    type: "reduced",
    price: 10,
    remaining: 45,
    soldOut: false,
    restrictionNote: "sur justificatif",
  },
  {
    type: "vip",
    price: 40,
    remaining: 0,
    soldOut: true,
    restrictionNote: null,
  },
]

describe("TicketTypeList (Story 6.1)", () => {
  it("renders every tier with its translated label", () => {
    render(<TicketTypeList tiers={tiers} currency="TND" labels={labels} />)
    expect(screen.getByText("Plein tarif")).toBeInTheDocument()
    expect(screen.getByText("Tarif réduit")).toBeInTheDocument()
    expect(screen.getByText("VIP")).toBeInTheDocument()
  })

  it("formats prices as '15,00 DT'", () => {
    render(<TicketTypeList tiers={tiers} currency="TND" labels={labels} />)
    expect(screen.getByText("15,00 DT")).toBeInTheDocument()
    expect(screen.getByText("10,00 DT")).toBeInTheDocument()
    expect(screen.getByText("40,00 DT")).toBeInTheDocument()
  })

  it("shows remaining availability as 'X restants' for available tiers", () => {
    render(<TicketTypeList tiers={tiers} currency="TND" labels={labels} />)
    expect(screen.getByText("12 restants")).toBeInTheDocument()
    expect(screen.getByText("45 restants")).toBeInTheDocument()
  })

  it("renders a sold-out tier with a 'Complet' badge and aria-disabled, not selectable", () => {
    render(<TicketTypeList tiers={tiers} currency="TND" labels={labels} />)
    expect(screen.getByText("Complet")).toBeInTheDocument()

    // The sold-out VIP row is marked aria-disabled.
    const vipRow = screen.getByText("VIP").closest("[aria-disabled]")
    expect(vipRow).toHaveAttribute("aria-disabled", "true")

    // Available rows are NOT marked disabled.
    expect(
      screen.getByText("Plein tarif").closest("[aria-disabled]")
    ).toBeNull()

    // No interactive control (button/link) is rendered — nothing selectable.
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("does not show a remaining count for a sold-out tier", () => {
    render(<TicketTypeList tiers={tiers} currency="TND" labels={labels} />)
    expect(screen.queryByText("0 restants")).not.toBeInTheDocument()
  })

  it("displays a restriction note with its prefix when present", () => {
    render(<TicketTypeList tiers={tiers} currency="TND" labels={labels} />)
    expect(
      screen.getByText("Restriction : sur justificatif")
    ).toBeInTheDocument()
  })

  it("renders the restriction note verbatim when no prefix is provided", () => {
    render(
      <TicketTypeList
        tiers={tiers}
        currency="TND"
        labels={{ ...labels, restrictionPrefix: undefined }}
      />
    )
    expect(screen.getByText("sur justificatif")).toBeInTheDocument()
  })
})
