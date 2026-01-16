import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "ticketing"
const TICKET_UID = `plugin::${PLUGIN_ID}.ticket`

const ticketService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Validate a ticket by ticket number
   */
  async validate(ticketNumber: string) {
    const tickets = await strapi.documents(TICKET_UID).findMany({
      filters: { ticketNumber },
      populate: ["order"],
    })

    const ticket = tickets[0]

    if (!ticket) {
      return { valid: false, error: "Ticket not found" }
    }

    if (ticket.status === "scanned") {
      return { valid: false, error: "Ticket already scanned", ticket }
    }

    if (ticket.status === "cancelled") {
      return { valid: false, error: "Ticket cancelled", ticket }
    }

    if (ticket.status === "expired") {
      return { valid: false, error: "Ticket expired", ticket }
    }

    return { valid: true, ticket }
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

  /**
   * Generate QR code data for a ticket
   */
  generateQRData(ticket: any): string {
    return JSON.stringify({
      ticketNumber: ticket.ticketNumber,
      type: ticket.type,
    })
  },
})

export default ticketService
