import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation"
import { createOrderSchema } from "../validation/order"

const PLUGIN_ID = "ticketing"
const ORDER_UID = `plugin::${PLUGIN_ID}.ticket-order`
const TICKET_UID = `plugin::${PLUGIN_ID}.ticket`

/** Sub-event kind accepted by the events-manager public-api facade. */
type SubEventKind = "screening" | "performance"

/** Sub-event a sale targets, resolved from the validated XOR input. */
interface SubEvent {
  kind: SubEventKind
  documentId: string
}

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
   * Create a new order with tickets as a single unit of work.
   *
   * Wrapped in `strapi.db.transaction` so the four steps — validate, reserve
   * inventory, create order, create N tickets — succeed or roll back together.
   * Any throw (oversell, mid-loop failure) leaves no orphan order and no
   * inventory drift. Inventory is reserved via the events-manager `public-api`
   * facade (the sanctioned ticketing -> events-manager edge), which performs an
   * atomic capacity-guarded UPDATE inside this same transaction.
   */
  async createOrder(input: {
    userId?: string
    guestEmail?: string
    guestName?: string
    eventId: string
    screeningId?: string
    performanceId?: string
    tickets: Array<{ type: string; price: number }>
  }) {
    // (a) Validate at the boundary (Zod via shared helper, screening XOR
    // performance). Throws a Strapi ValidationError with an error CODE.
    const data = validate(createOrderSchema, input)

    const subEvent: SubEvent = data.screeningId
      ? { kind: "screening", documentId: data.screeningId }
      : { kind: "performance", documentId: data.performanceId as string }

    const orderNumber = this.generateOrderNumber()
    const totalAmount = data.tickets.reduce((sum, t) => sum + t.price, 0)

    const publicApi = strapi.plugin("events-manager").service("public-api")

    return strapi.db.transaction(async () => {
      // (b) Reserve capacity. Throws TICKET_SOLD_OUT (rolls back the whole tx)
      // when the request exceeds remaining seats. The facade's Document Service
      // write auto-enlists in this transaction via AsyncLocalStorage.
      await publicApi.adjustInventory(
        subEvent.documentId,
        subEvent.kind,
        data.tickets.length
      )

      // (c) Create the order (auto-joins this tx via AsyncLocalStorage).
      const order = await strapi.documents(ORDER_UID).create({
        data: {
          orderNumber,
          user: data.userId,
          guestEmail: data.guestEmail,
          guestName: data.guestName,
          event: data.eventId,
          [subEvent.kind]: subEvent.documentId,
          totalAmount,
          currency: strapi.config.get(
            "plugin::ticketing.defaultCurrency",
            "TND"
          ),
          paymentStatus: "pending",
        },
      })

      // (d) Create N tickets. A failure here rolls back the order + inventory.
      const createdTickets = []
      for (const ticketData of data.tickets) {
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
    })
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
      populate: ["tickets", "event", "screening", "performance", "user"],
    })

    return orders[0] || null
  },

  /**
   * Back-fill the `user` relation on guest orders when an account is created
   * with the same email, so prior guest purchases become that user's history.
   *
   * Matches `guestEmail` case-insensitively (Document Service `$eqi`) and then
   * re-checks exact case-insensitive equality in memory to defuse `$eqi`'s
   * underlying `LIKE` wildcard semantics. Idempotent: only orders with no `user`
   * are linked; already-linked orders are skipped and not re-counted.
   * `guestEmail` is retained as an audit trail. Returns the number linked.
   */
  async linkGuestOrders(
    email: string,
    userDocumentId: string
  ): Promise<number> {
    if (!email || !userDocumentId) return 0

    const normalized = email.trim().toLowerCase()
    if (!normalized) return 0

    const orders = await strapi.documents(ORDER_UID).findMany({
      filters: { guestEmail: { $eqi: normalized } },
      populate: ["user"],
    })

    let linked = 0
    for (const order of orders as Array<{
      documentId: string
      user?: unknown
      guestEmail?: unknown
    }>) {
      if (order.user) continue // idempotent: skip already-linked

      // `$eqi` compiles to `LOWER(col) LIKE LOWER(?)` with no wildcard escaping,
      // so `_`/`%` in an email (both valid in a local part) act as SQL
      // wildcards. Enforce exact case-insensitive equality so we never link a
      // different guest's orders (e.g. `john_doe@x` must not match `johnXdoe@x`).
      if (
        typeof order.guestEmail !== "string" ||
        order.guestEmail.trim().toLowerCase() !== normalized
      ) {
        continue
      }

      await strapi.documents(ORDER_UID).update({
        documentId: order.documentId,
        data: { user: userDocumentId },
      })
      linked++
    }

    return linked
  },
})

export default orderService
