import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TicketQRTicket } from "./TicketQR"

import { TicketQR } from "./TicketQR"

/**
 * Story 6.4: the QR must render INLINE (SVG) — never as an `<img>` pointing at
 * a third-party host. `qrData` is a signed entry credential, so shipping it off
 * origin on every render would leak it (and break offline use on event night).
 */

const ticket: TicketQRTicket = {
  id: "TW-1-1",
  qrData: "TWQ1.eyJ2IjoxfQ.signature",
  eventTitle: "Inception",
  date: "20/08/2026",
  time: "19:30",
  venueName: "Cinéma Le Palace",
  quantity: 1,
  status: "valid",
}

/** The full label set, so a new required label surfaces here as a type error. */
const labels = {
  tickets: (count: number) => `${count} ticket(s)`,
  addToWallet: "Add to Wallet",
  share: "Share",
  scanned: "Scanned",
  scannedAt: "Scanned at",
  expired: "Event passed",
  offlineAvailable: "Available offline",
  qrAlt: "Ticket QR code",
}

/** The rendered QR module geometry — what actually encodes the value. */
function qrGeometry(container: HTMLElement): string {
  const qr = container.querySelector("svg[role='img']")
  expect(qr).not.toBeNull()
  return Array.from((qr as Element).querySelectorAll("path"))
    .map((p) => p.getAttribute("d") ?? "")
    .join("|")
}

describe("TicketQR", () => {
  it("renders the QR inline as an SVG with no third-party request", () => {
    const { container } = render(<TicketQR ticket={ticket} labels={labels} />)

    const qr = screen.getByRole("img", { name: labels.qrAlt })
    expect(qr.tagName.toLowerCase()).toBe("svg")

    // No <img> at all, and nothing pointing at the old QR image host.
    expect(container.querySelector("img")).toBeNull()
    expect(container.innerHTML).not.toContain("api.qrserver.com")
  })

  it("encodes the opaque qrData token, not the ticket id", () => {
    // Asserting merely that SOME <path> exists would hold for any encoded
    // value — including a regression to `value={ticket.id}`, which would put
    // the guessable ticket number on the wire in place of the signed token.
    // So compare the actual module geometry across three distinct values.
    const signed = render(<TicketQR ticket={ticket} labels={labels} />)
    const signedGeometry = qrGeometry(signed.container)
    signed.unmount()

    const other = render(
      <TicketQR
        ticket={{ ...ticket, qrData: "TWQ1.eyJ2IjoxfQ.different" }}
        labels={labels}
      />
    )
    const otherGeometry = qrGeometry(other.container)
    other.unmount()

    const idOnly = render(
      <TicketQR ticket={{ ...ticket, qrData: ticket.id }} labels={labels} />
    )
    const idGeometry = qrGeometry(idOnly.container)

    expect(signedGeometry).not.toBe("")
    expect(signedGeometry).not.toBe(otherGeometry)
    expect(signedGeometry).not.toBe(idGeometry)
  })

  it("names the QR from the localized labels, not a hardcoded string", () => {
    render(
      <TicketQR
        ticket={ticket}
        labels={{ ...labels, qrAlt: "رمز QR للتذكرة" }}
      />
    )

    expect(
      screen.getByRole("img", { name: "رمز QR للتذكرة" })
    ).toBeInTheDocument()
    // The previous hardcoded English name must not survive a supplied locale.
    expect(
      screen.queryByRole("img", { name: /QR code for ticket/i })
    ).toBeNull()
  })

  it("keeps rendering event details and localized labels", () => {
    render(<TicketQR ticket={ticket} labels={labels} />)

    expect(screen.getByText("Inception")).toBeInTheDocument()
    expect(screen.getByText("Cinéma Le Palace")).toBeInTheDocument()
    expect(screen.getByText("1 ticket(s)")).toBeInTheDocument()
  })
})
