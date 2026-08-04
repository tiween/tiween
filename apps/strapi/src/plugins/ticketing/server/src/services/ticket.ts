import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "ticketing"
const TICKET_UID = `plugin::${PLUGIN_ID}.ticket`

/** Error code: no ticket carries this ticket number. */
export const TICKET_NOT_FOUND = "TICKET_NOT_FOUND"
/** Error code: the ticket was already scanned at the door. */
export const TICKET_ALREADY_SCANNED = "TICKET_ALREADY_SCANNED"
/** Error code: the ticket was cancelled. */
export const TICKET_CANCELLED = "TICKET_CANCELLED"
/** Error code: the ticket has expired. */
export const TICKET_EXPIRED = "TICKET_EXPIRED"

/** Non-secret projection of a ticket, safe for the PUBLIC validate route. */
export interface PublicTicketView {
  ticketNumber: string
  type: string
  status: string
  scannedAt: string | null
}

/** Error CODE per non-`valid` ticket status. */
const CODE_BY_STATUS: Record<string, string> = {
  scanned: TICKET_ALREADY_SCANNED,
  cancelled: TICKET_CANCELLED,
  expired: TICKET_EXPIRED,
}

const ticketService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Validate a ticket by ticket number.
   *
   * Returns an error CODE (never prose) and only a MINIMAL projection: this
   * backs the PUBLIC `GET /tickets/validate/:ticketNumber` route, so it must
   * never leak `qrCode`/`qrNonce` (the signing material an attacker would need
   * to forge an entry credential) or the order's guest PII.
   */
  async validate(ticketNumber: string): Promise<{
    valid: boolean
    code?: string
    ticket?: PublicTicketView
  }> {
    const tickets = await strapi.documents(TICKET_UID).findMany({
      filters: { ticketNumber },
    })

    const ticket = tickets[0]

    if (!ticket) {
      return { valid: false, code: TICKET_NOT_FOUND }
    }

    const view: PublicTicketView = {
      ticketNumber: ticket.ticketNumber as string,
      type: ticket.type as string,
      status: ticket.status as string,
      scannedAt: (ticket.scannedAt as string | undefined) ?? null,
    }

    const code = CODE_BY_STATUS[view.status]
    if (code) {
      return { valid: false, code, ticket: view }
    }

    return { valid: true, ticket: view }
  },

  /**
   * Mark ticket as scanned
   */
  async scan(ticketId: string) {
    return strapi.documents(TICKET_UID).update({
      documentId: ticketId,
      data: {
        status: "scanned",
        scannedAt: new Date().toISOString(),
      },
    })
  },

  /**
   * Cancel a ticket
   */
  async cancel(ticketId: string) {
    return strapi.documents(TICKET_UID).update({
      documentId: ticketId,
      data: {
        status: "cancelled",
      },
    })
  },
})

export default ticketService
