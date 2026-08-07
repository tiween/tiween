import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { GroupedTicketListLabels } from "./GroupedTicketList"
import type { TicketView } from "@/features/tickets/types"

import { GroupedTicketList } from "./GroupedTicketList"

/**
 * Interaction ACs of Story 6.6: grouped sections in order, header content,
 * tap → dialog with exactly that ticket, pending previews, Historique
 * presence/absence. Partition boundaries live in `groupTickets.test.ts`; the
 * fixtures here just use far-future/far-past dates so the component's real
 * `new Date()` lands on the right side of them.
 */

const labels: GroupedTicketListLabels = {
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
  upcomingTitle: "À venir",
  historyTitle: "Historique",
  viewTicket: (ticketNumber) => `Voir le billet ${ticketNumber}`,
  dialogTitle: "Votre billet",
}

function ticket(overrides: Partial<TicketView> = {}): TicketView {
  return {
    ticketNumber: "TW-1-1",
    type: "standard",
    status: "valid",
    price: 10,
    qrCode: "TWQ1.payload.sig",
    scannedAt: null,
    orderNumber: "TW-1",
    eventTitle: "Inception",
    startDateTime: "2099-08-20T19:30:00.000Z",
    venueName: "Cinéma Le Palace",
    ...overrides,
  }
}

const PAST = ticket({
  ticketNumber: "TW-9-1",
  orderNumber: "TW-9",
  eventTitle: "Old Show",
  startDateTime: "2020-01-15T19:00:00.000Z",
  venueName: "Théâtre Municipal",
})

describe("GroupedTicketList", () => {
  it("renders one group per event+showtime with full header content", () => {
    render(
      <GroupedTicketList
        tickets={[
          ticket(),
          ticket({ ticketNumber: "TW-1-2" }),
          ticket({
            ticketNumber: "TW-2-1",
            orderNumber: "TW-2",
            eventTitle: "Inception",
            startDateTime: "2099-08-21T19:30:00.000Z",
          }),
        ]}
        locale="fr"
        labels={labels}
      />
    )

    // Same event on two dates = two groups.
    const headings = screen.getAllByRole("heading", { name: "Inception" })
    expect(headings).toHaveLength(2)

    const upcoming = screen.getByTestId("upcoming-groups")
    // Header: date, time (Africa/Tunis, DD/MM/YYYY, 24h), venue, count.
    expect(within(upcoming).getByText("20/08/2099")).toBeInTheDocument()
    expect(within(upcoming).getByText("21/08/2099")).toBeInTheDocument()
    expect(within(upcoming).getAllByText("20:30")).toHaveLength(2)
    expect(within(upcoming).getAllByText("Cinéma Le Palace")).toHaveLength(2)
    expect(within(upcoming).getByText("2 billet(s)")).toBeInTheDocument()
    expect(within(upcoming).getByText("1 billet(s)")).toBeInTheDocument()
  })

  it("orders sections upcoming-then-Historique and sorts groups", () => {
    render(
      <GroupedTicketList
        tickets={[PAST, ticket()]}
        locale="fr"
        labels={labels}
      />
    )

    const headings = screen.getAllByRole("heading", { level: 2 })
    expect(headings.map((h) => h.textContent)).toEqual([
      "À venir",
      "Historique",
    ])
    expect(
      within(screen.getByTestId("history-groups")).getByText("Old Show")
    ).toBeInTheDocument()
  })

  it("does not render a Historique section when nothing is past", () => {
    render(<GroupedTicketList tickets={[ticket()]} locale="fr" labels={labels} />)

    expect(screen.queryByText("Historique")).toBeNull()
  })

  it("opens the full TicketQR for exactly the tapped ticket and closes back to the list", () => {
    render(
      <GroupedTicketList
        tickets={[ticket(), ticket({ ticketNumber: "TW-1-2" })]}
        locale="fr"
        labels={labels}
      />
    )

    expect(screen.queryByRole("dialog")).toBeNull()

    // A real, accessibly named <button> — keyboard- and SR-reachable.
    fireEvent.click(
      screen.getByRole("button", { name: "Voir le billet TW-1-2" })
    )

    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Votre billet" })
    ).toBeInTheDocument()
    // The full large ticket for THAT ticket: its number, its QR, its details.
    expect(within(dialog).getByText("TW-1-2")).toBeInTheDocument()
    expect(within(dialog).queryByText("TW-1-1")).toBeNull()
    expect(
      within(dialog).getByRole("img", { name: "Code QR du billet" })
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Inception")).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: "Escape" })

    expect(screen.queryByRole("dialog")).toBeNull()
    // The list is intact after closing.
    expect(
      screen.getByRole("button", { name: "Voir le billet TW-1-1" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Voir le billet TW-1-2" })
    ).toBeInTheDocument()
  })

  it("renders a pending placeholder (no QR, no dialog) for a null-QR ticket", () => {
    render(
      <GroupedTicketList
        tickets={[ticket({ qrCode: null })]}
        locale="fr"
        labels={labels}
      />
    )

    expect(screen.getByText("QR en cours de génération")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Code QR du billet" })).toBeNull()

    const preview = screen.getByRole("button", {
      name: "Voir le billet TW-1-1",
    })
    expect(preview).toBeDisabled()
    fireEvent.click(preview)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("omits date and time from the header when the showtime is null", () => {
    render(
      <GroupedTicketList
        tickets={[ticket({ startDateTime: null })]}
        locale="fr"
        labels={labels}
      />
    )

    expect(screen.getByRole("heading", { name: "Inception" })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain("Invalid")
    expect(document.body.textContent).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it("shows the empty-state copy when there are no tickets at all", () => {
    render(<GroupedTicketList tickets={[]} locale="fr" labels={labels} />)

    expect(screen.getByText("Aucun billet")).toBeInTheDocument()
    expect(screen.queryByText("À venir")).toBeNull()
    expect(screen.queryByText("Historique")).toBeNull()
  })

  it("shows the empty-state copy above Historique when every ticket is past", () => {
    render(<GroupedTicketList tickets={[PAST]} locale="fr" labels={labels} />)

    expect(screen.getByText("Aucun billet")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Historique" })
    ).toBeInTheDocument()
    expect(screen.getByText("Old Show")).toBeInTheDocument()
  })

  it("formats with Western numerals in Arabic", () => {
    render(<GroupedTicketList tickets={[ticket()]} locale="ar" labels={labels} />)

    expect(screen.getByText("20/08/2099")).toBeInTheDocument()
    expect(screen.getByText("20:30")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/[٠-٩]/)
  })
})
