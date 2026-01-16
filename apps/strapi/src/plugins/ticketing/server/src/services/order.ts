import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "ticketing"
const ORDER_UID = `plugin::${PLUGIN_ID}.ticket-order`
const TICKET_UID = `plugin::${PLUGIN_ID}.ticket`

const orderService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Generate a unique order number
   */
  generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `TW-${timestamp}-${random}`
  },

  /**
   * Create a new order with tickets
   */
  async createOrder(data: {
    userId?: string
    guestEmail?: string
    guestName?: string
    eventId: string
    showtimeId: string
    tickets: Array<{ type: string; price: number }>
  }) {
    const { userId, guestEmail, guestName, eventId, showtimeId, tickets } = data

    const orderNumber = this.generateOrderNumber()
    const totalAmount = tickets.reduce((sum, t) => sum + t.price, 0)

    // Create the order
    const order = await strapi.documents(ORDER_UID).create({
      data: {
        orderNumber,
        user: userId,
        guestEmail,
        guestName,
        event: eventId,
        showtime: showtimeId,
        totalAmount,
        currency: "TND",
        paymentStatus: "pending",
      },
    })

    // Create tickets for the order
    const createdTickets = []
    for (const ticketData of tickets) {
      const ticketNumber = `${orderNumber}-${createdTickets.length + 1}`
      const ticket = await strapi.documents(TICKET_UID).create({
        data: {
          ticketNumber,
          order: order.documentId,
          type: ticketData.type as "standard" | "reduced" | "vip",
          price: ticketData.price,
          status: "valid",
        },
      })
      createdTickets.push(ticket)
    }

    return { order, tickets: createdTickets }
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: string,
    status: "pending" | "paid" | "failed" | "refunded",
    paymentReference?: string
  ) {
    const updateData: Record<string, any> = { paymentStatus: status }

    if (paymentReference) {
      updateData.paymentReference = paymentReference
    }

    if (status === "paid") {
      updateData.purchasedAt = new Date().toISOString()
    }

    return strapi.documents(ORDER_UID).update({
      documentId: orderId,
      data: updateData,
    })
  },

  /**
   * Get order by order number
   */
  async findByOrderNumber(orderNumber: string) {
    const orders = await strapi.documents(ORDER_UID).findMany({
      filters: { orderNumber },
      populate: ["tickets", "event", "showtime", "user"],
    })

    return orders[0] || null
  },
})

export default orderService
