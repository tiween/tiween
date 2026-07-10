import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation"
import { checkoutSchema, createOrderSchema } from "../validation/order"

const PLUGIN_ID = "ticketing"
const ORDER_UID = `plugin::${PLUGIN_ID}.ticket-order`
const TICKET_UID = `plugin::${PLUGIN_ID}.ticket`

/** Error code: sub-event does not belong to the event, or price/type mismatch. */
export const INVALID_ORDER = "INVALID_ORDER"
/** Error code: Konnect init failed / timed out (order rolled back to failed). */
export const KONNECT_UNAVAILABLE = "KONNECT_UNAVAILABLE"

/** Terminal payment states reconciliation must not re-apply. */
const TERMINAL_STATUSES = new Set(["paid", "failed", "refunded"])

/** Client app base URL for building same-origin redirect result URLs. */
const CLIENT_BASE_URL = (
  process.env.KONNECT_CLIENT_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:3000"
).replace(/\/$/, "")

/** Attach a stable error CODE to a thrown Error (mirrors adjustInventory). */
function codedError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code })
}

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
   * Full checkout Unit of Work (Story 6.3).
   *
   * 1. Validate + server-trust pricing: re-derive each ticket's price/type
   *    against the authoritative events-manager tiers and enforce the
   *    sub-event↔event ownership guard (`INVALID_ORDER`).
   * 2. `createOrder` (reserves inventory atomically, writes a `pending` order).
   * 3. `payments.public-api.initPayment` (R3 — the only ticketing→payments
   *    edge) → `{ payUrl, paymentRef }`; persist `paymentReference` +
   *    `paymentMethod`.
   * 4. On init failure/timeout: release the reserved inventory exactly once and
   *    mark the order `failed`, then rethrow `KONNECT_UNAVAILABLE`.
   *
   * `userId` is taken only from the (already server-validated) `input.userId`
   * the controller derived from the JWT — never trusted from the raw body.
   */
  async initCheckout(input: unknown): Promise<{
    orderNumber: string
    payUrl: string
  }> {
    const data = validate(checkoutSchema, input)

    const subEvent: SubEvent = data.screeningId
      ? { kind: "screening", documentId: data.screeningId }
      : { kind: "performance", documentId: data.performanceId as string }

    const eventsApi = strapi.plugin("events-manager").service("public-api")

    // (1) Ownership guard + server-trusted pricing.
    const context = await eventsApi.getSubEventContext(
      subEvent.documentId,
      subEvent.kind
    )
    if (!context || context.eventId !== data.eventId) {
      throw codedError(
        "Sub-event does not belong to the given event",
        INVALID_ORDER
      )
    }
    for (const ticket of data.tickets) {
      const tier = context.tiers.find(
        (t: { type: string; price: number }) => t.type === ticket.type
      )
      if (!tier || tier.price !== ticket.price) {
        throw codedError(
          `Ticket price/type mismatch for "${ticket.type}"`,
          INVALID_ORDER
        )
      }
    }

    // (2) Reserve inventory + write the pending order (existing Unit of Work).
    const guestName = data.userId
      ? undefined
      : `${data.firstName} ${data.lastName}`.trim()
    const { order } = await this.createOrder({
      userId: data.userId,
      guestEmail: data.userId ? undefined : data.email,
      guestName,
      eventId: data.eventId,
      screeningId: data.screeningId,
      performanceId: data.performanceId,
      tickets: data.tickets,
    })

    // (3) Initialize the hosted Konnect payment (only ticketing→payments edge).
    const locale = data.locale ?? "fr"
    const resultPath = `${CLIENT_BASE_URL}/${locale}/tickets/${data.eventId}/${subEvent.documentId}/payment/result`
    const orderRef = encodeURIComponent(order.orderNumber)

    try {
      const { payUrl, paymentRef } = await strapi
        .plugin("payments")
        .service("public-api")
        .initPayment({
          orderNumber: order.orderNumber,
          amountTND: order.totalAmount,
          currency: order.currency,
          methods: [data.paymentMethod],
          customer: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
          },
          successUrl: `${resultPath}?order=${orderRef}&status=success`,
          failUrl: `${resultPath}?order=${orderRef}&status=fail`,
        })

      // Persist the Konnect reference + chosen method (order stays `pending`).
      await strapi.documents(ORDER_UID).update({
        documentId: order.documentId,
        data: {
          paymentReference: paymentRef,
          paymentMethod: data.paymentMethod,
        },
      })

      return { orderNumber: order.orderNumber, payUrl }
    } catch (err) {
      // (4) Compensate: release the reservation once, mark the order failed.
      await this.releaseInventory(subEvent, data.tickets.length)
      try {
        await this.updatePaymentStatus(order.documentId, "failed")
      } catch (markErr) {
        strapi.log.error(
          `[ticketing] failed to mark order ${order.orderNumber} failed: ${(markErr as Error)?.message}`
        )
      }
      strapi.log.error(
        `[ticketing] Konnect init failed for order ${order.orderNumber}: ${(err as Error)?.message}`
      )
      throw codedError("Payment gateway is unavailable", KONNECT_UNAVAILABLE)
    }
  },

  /**
   * Idempotent gateway reconciliation (Story 6.3), shared by the webhook
   * backstop and the client-triggered confirm.
   *
   * Skips orders already in a terminal state (paid/failed/refunded) so a
   * repeated webhook + confirm never double-applies. Otherwise re-queries the
   * AUTHORITATIVE Konnect status via `payments.public-api.getPaymentStatus`
   * (never trusts a webhook body) and, on:
   *  - `paid`   → sets `paid` + `purchasedAt`;
   *  - `failed` → sets `failed` and releases the reserved inventory exactly once;
   *  - `pending`→ leaves the order untouched.
   */
  async reconcileFromGateway(orderNumber: string): Promise<{
    orderNumber: string
    status: string
    changed: boolean
  }> {
    const order = await this.findByOrderNumber(orderNumber)
    if (!order) {
      return { orderNumber, status: "not_found", changed: false }
    }

    // Idempotency: never re-apply a terminal state.
    if (TERMINAL_STATUSES.has(order.paymentStatus)) {
      return { orderNumber, status: order.paymentStatus, changed: false }
    }
    if (!order.paymentReference) {
      return { orderNumber, status: order.paymentStatus, changed: false }
    }

    const { status } = await strapi
      .plugin("payments")
      .service("public-api")
      .getPaymentStatus(order.paymentReference)

    if (status === "paid") {
      await this.updatePaymentStatus(
        order.documentId,
        "paid",
        order.paymentReference
      )
      return { orderNumber, status: "paid", changed: true }
    }

    if (status === "failed") {
      await this.updatePaymentStatus(order.documentId, "failed")
      const subEvent = this.resolveSubEventFromOrder(order)
      if (subEvent) {
        const qty = Array.isArray(order.tickets) ? order.tickets.length : 0
        await this.releaseInventory(subEvent, qty)
      }
      return { orderNumber, status: "failed", changed: true }
    }

    return { orderNumber, status: "pending", changed: false }
  },

  /**
   * Release reserved inventory for a sub-event by `qty` (negative delta).
   * A no-op when `qty <= 0`. Failures are logged, not thrown, so a compensation
   * path can still mark the order failed.
   */
  async releaseInventory(subEvent: SubEvent, qty: number): Promise<void> {
    if (!qty || qty <= 0) return
    try {
      await strapi
        .plugin("events-manager")
        .service("public-api")
        .adjustInventory(subEvent.documentId, subEvent.kind, -qty)
    } catch (err) {
      strapi.log.error(
        `[ticketing] failed to release inventory for ${subEvent.kind} ${subEvent.documentId}: ${(err as Error)?.message}`
      )
    }
  },

  /** Resolve the sub-event a (populated) order targets, or null. */
  resolveSubEventFromOrder(order: {
    screening?: { documentId?: string } | null
    performance?: { documentId?: string } | null
  }): SubEvent | null {
    if (order.screening?.documentId) {
      return { kind: "screening", documentId: order.screening.documentId }
    }
    if (order.performance?.documentId) {
      return { kind: "performance", documentId: order.performance.documentId }
    }
    return null
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
