import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TicketView } from "@/features/tickets/types"
import type { TicketListLabels } from "./TicketList"

import { TicketList } from "./TicketList"

const labels: TicketListLabels = {
  tickets: (count) => `${count} billet(s)`,
  addToWallet: "Ajouter au wallet",
  share: "Partager",
  scanned: "Scanné",
  scannedAt: "Scanné à",
  expired: "Événement passé",
  offlineAvailable: "Disponible hors ligne",
  qrAlt: "Code QR du billet",
  qrPending: "QR en cours de génération",
  emptyTitle: "Aucun billet",
  emptyDescription: "Vos billets apparaîtront ici.",
}

function view(overrides: Partial<TicketView> = {}): TicketView {
  return {
    ticketNumber: "TW-1-1",
    type: "standard",
    status: "valid",
    price: 10,
    qrCode: "TWQ1.payload.sig",
    scannedAt: null,
    orderNumber: "TW-1",
    eventTitle: "Inception",
    startDateTime: "2026-08-20T19:30:00.000Z",
    venueName: "Cinéma Le Palace",
    ...overrides,
  }
}

describe("TicketList", () => {
  it("renders one QR card per ticket", () => {
    render(
      <TicketList
        tickets={[view(), view({ ticketNumber: "TW-1-2", type: "vip" })]}
        locale="fr"
        labels={labels}
      />
    )

    expect(screen.getAllByRole("img", { name: labels.qrAlt })).toHaveLength(2)
    expect(screen.getByText("TW-1-1")).toBeInTheDocument()
    expect(screen.getByText("TW-1-2")).toBeInTheDocument()
  })

  it("formats the showtime with Western numerals in Arabic", () => {
    render(<TicketList tickets={[view()]} locale="ar" labels={labels} />)

    // Africa/Tunis is UTC+1 → 20:30 local, DD/MM/YYYY, Latin digits only.
    expect(screen.getByText("20/08/2026")).toBeInTheDocument()
    expect(screen.getByText("20:30")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/[٠-٩]/)
  })

  it("shows a pending placeholder instead of an empty QR when none is issued", () => {
    render(
      <TicketList
        tickets={[view({ qrCode: null })]}
        locale="fr"
        labels={labels}
      />
    )

    expect(screen.getByText("QR en cours de génération")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: /QR code/i })).toBeNull()
  })

  it("renders the empty state when there are no tickets", () => {
    render(<TicketList tickets={[]} locale="fr" labels={labels} />)

    expect(screen.getByText("Aucun billet")).toBeInTheDocument()
    expect(screen.queryByTestId("ticket-list")).toBeNull()
  })

  it("maps a cancelled ticket onto the expired visual state", () => {
    render(
      <TicketList
        tickets={[view({ status: "cancelled" })]}
        locale="fr"
        labels={labels}
      />
    )

    expect(screen.getByText("Événement passé")).toBeInTheDocument()
  })
})
