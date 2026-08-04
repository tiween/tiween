import { randomBytes, timingSafeEqual } from "node:crypto"

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
/** Error code: the caller is not authenticated (no JWT). */
export const UNAUTHORIZED = "UNAUTHORIZED"
/** Error code: the caller may not read this order's tickets. */
export const FORBIDDEN = "FORBIDDEN"

/**
 * Populate needed to build a ticket view: the tickets themselves plus the event
 * (with its venue) and sub-event fields the card renders.
 */
const TICKET_VIEW_POPULATE = {
  tickets: true,
  event: { populate: { venue: true } },
  screening: true,
  performance: true,
  user: true,
}

/** Sanitized ticket row returned by the ticket-read endpoints. */
export interface TicketView {
  ticketNumber: string
  type: string
  status: string
  price: number
  /** The signed `TWQ1.` token — `null` until the order is paid. */
  qrCode: string | null
  scannedAt: string | null
  orderNumber: string
  eventTitle: string
  startDateTime: string | null
  venueName: string | null
}

/** Shape of a populated order as consumed by `toTicketView`. */
interface PopulatedOrder {
  documentId?: string
  orderNumber?: string
  paymentStatus?: string
  accessToken?: string | null
  user?: { documentId?: string } | null
  event?: {
    title?: string
    startDateTime?: string
    venue?: { name?: string } | null
  } | null
  screening?: { startDateTime?: string; documentId?: string } | null
  performance?: { startDateTime?: string; documentId?: string } | null
  tickets?: Array<{
    ticketNumber?: string
    type?: string
    status?: string
    price?: number
    qrCode?: string | null
    scannedAt?: string | null
  }> | null
}

/**
 * Constant-time string compare that never throws on a length mismatch. Used for
 * the guest order access token so a caller cannot binary-search it by timing.
 */
function timingSafeCompare(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

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
    // Per-order bearer credential for guest ticket retrieval (Story 6.4). The
    // order number is short and guessable; this 24-byte random token is what
    // actually authorizes a guest read. Kept in the buyer's own localStorage and
    // sent as the `x-order-access-token` REQUEST HEADER — never in a redirect
    // URL and never in a query string, so it stays out of every access log.
    const accessToken = this.generateAccessToken()

    const publicApi = strapi.plugin("events-manager").service("public-api")

    return strapi.db.transaction(async () => {
      // (b) Reserve capacity. Throws TICKET_SOLD_OUT (rolls back the whole tx)
      // when the request exceeds remaining seats. The facade performs a guarded
      // atomic increment via raw knex bound explicitly to this transaction.
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
          accessToken,
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

      // Return the token we generated rather than reading it back off the
      // document — the attribute is `private` and must not be relied on to
      // survive any future sanitization of the create result.
      return { order, tickets: createdTickets, accessToken }
    })
  },

  /** Fresh 24-byte per-order access token (base64url). */
  generateAccessToken(): string {
    return randomBytes(24).toString("base64url")
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
    accessToken: string
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
    const { order, accessToken } = await this.createOrder({
      userId: data.userId,
      guestEmail: data.userId ? undefined : data.email,
      guestName,
      eventId: data.eventId,
      screeningId: data.screeningId,
      performanceId: data.performanceId,
      tickets: data.tickets.map((t) => ({
        type: t.type as string,
        price: t.price as number,
      })),
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

      return { orderNumber: order.orderNumber, payUrl, accessToken }
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
   * Skips orders already in a terminal state (paid/failed/refunded). For a
   * still-`pending` order it re-queries the AUTHORITATIVE Konnect status via
   * `payments.public-api.getPaymentStatus` (never trusts a webhook body) OUTSIDE
   * any transaction, then claims the terminal transition with an ATOMIC
   * conditional UPDATE that only matches a still-`pending` row (compare-and-set).
   * Because a webhook and the client confirm can race — both reading `pending`
   * — the CAS is what makes the transition exactly-once: only the caller whose
   * `updateMany` reports `count === 1` "won"; a `count === 0` loser returns
   * `changed: false` and does NOT touch inventory. On:
   *  - `paid`   → CAS to `paid` + `purchasedAt` (winner only);
   *  - `failed` → CAS to `failed`, then the winner releases inventory once;
   *  - `pending`→ leaves the order untouched.
   *
   * Before a `paid` CAS the collected amount and order id reported by Konnect
   * are cross-checked (when present) against the order so a mismatched charge is
   * never settled as paid.
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
      // Self-heal (Story 6.4): if a previous issuance partially failed, a later
      // confirm/webhook fills in the tickets still missing a `qrCode`. Already
      // issued tickets are skipped inside `issueForOrder`, so this is a no-op
      // on the common path.
      if (order.paymentStatus === "paid") {
        await this.issueQrCodes(orderNumber)
      }
      return { orderNumber, status: order.paymentStatus, changed: false }
    }
    if (!order.paymentReference) {
      return { orderNumber, status: order.paymentStatus, changed: false }
    }

    // Authoritative re-query — a network call, kept OUTSIDE any transaction.
    const gw = await strapi
      .plugin("payments")
      .service("public-api")
      .getPaymentStatus(order.paymentReference)

    if (gw.status === "pending") {
      return { orderNumber, status: "pending", changed: false }
    }

    if (gw.status === "paid") {
      // Defense-in-depth: never settle `paid` when Konnect reports a different
      // collected amount or order id than we expect. Only enforced when the
      // gateway actually returns the value (a null field still settles).
      const expectedMillimes = Math.round(order.totalAmount * 1000)
      if (gw.amount != null && gw.amount !== expectedMillimes) {
        strapi.log.error(
          `[ticketing] amount mismatch for order ${orderNumber}: gateway=${gw.amount} expected=${expectedMillimes} millimes — NOT marking paid`
        )
        return { orderNumber, status: "pending", changed: false }
      }
      if (gw.orderId != null && gw.orderId !== order.orderNumber) {
        strapi.log.error(
          `[ticketing] orderId mismatch for order ${orderNumber}: gateway=${gw.orderId} — NOT marking paid`
        )
        return { orderNumber, status: "pending", changed: false }
      }

      // Atomically claim the transition: only a still-`pending` row matches.
      const res = await strapi.db.query(ORDER_UID).updateMany({
        where: { documentId: order.documentId, paymentStatus: "pending" },
        data: {
          paymentStatus: "paid",
          paymentReference: order.paymentReference,
          purchasedAt: new Date(),
        },
      })
      if (res.count !== 1) {
        // Lost the race — another reconcile already transitioned this order.
        return { orderNumber, status: gw.status, changed: false }
      }

      // QR issuance (Story 6.4). Only the CAS winner reaches this line, but the
      // already-`paid` early return above also issues, and any number of
      // confirms/webhooks can be in it concurrently — so exactly-once is NOT a
      // property of this call site. It is enforced inside `issueForOrder`, whose
      // per-ticket write is itself a compare-and-set on `qrCode IS NULL`.
      // Throw-safe — a failed issuance must never undo or hide a settled
      // payment; a later confirm/webhook self-heals via the already-`paid` path.
      await this.issueQrCodes(orderNumber)

      return { orderNumber, status: "paid", changed: true }
    }

    if (gw.status === "failed") {
      // Atomically claim the transition (compare-and-set on `pending`).
      const res = await strapi.db.query(ORDER_UID).updateMany({
        where: { documentId: order.documentId, paymentStatus: "pending" },
        data: { paymentStatus: "failed" },
      })
      if (res.count !== 1) {
        // Lost the race — do NOT release inventory a second time.
        return { orderNumber, status: gw.status, changed: false }
      }
      const subEvent = this.resolveSubEventFromOrder(order)
      if (subEvent) {
        const qty = Array.isArray(order.tickets) ? order.tickets.length : 0
        await this.releaseInventory(subEvent, qty)
      }
      return { orderNumber, status: "failed", changed: true }
    }

    return { orderNumber, status: gw.status, changed: false }
  },

  /**
   * Issue QR tokens for a settled order, never throwing.
   *
   * QR issuance is strictly downstream of the money: a signing or DB failure
   * here must not undo the `paid` transition or make `reconcileFromGateway`
   * report a non-terminal status. The error is logged and the next
   * confirm/webhook re-attempts through the already-`paid` self-heal path.
   */
  async issueQrCodes(orderNumber: string): Promise<void> {
    try {
      await strapi.plugin(PLUGIN_ID).service("qr").issueForOrder(orderNumber)
    } catch (err) {
      strapi.log.error(
        `[ticketing] QR issuance failed for order ${orderNumber}: ${(err as Error)?.message}`
      )
    }
  },

  /**
   * Explicit allow-list projection of one ticket. NEVER return a raw populated
   * document: `guestEmail`, `guestName`, `paymentReference`, `accessToken` and
   * `qrNonce` must not leave the server. `qrCode` is exposed only for a `paid`
   * order — an unpaid order's tickets read as `qrCode: null`.
   */
  toTicketView(
    order: PopulatedOrder,
    ticket: NonNullable<PopulatedOrder["tickets"]>[number]
  ): TicketView {
    const isPaid = order.paymentStatus === "paid"
    return {
      ticketNumber: ticket.ticketNumber ?? "",
      type: ticket.type ?? "standard",
      status: ticket.status ?? "valid",
      price: ticket.price ?? 0,
      qrCode: isPaid ? ticket.qrCode ?? null : null,
      scannedAt: ticket.scannedAt ?? null,
      orderNumber: order.orderNumber ?? "",
      eventTitle: order.event?.title ?? "",
      startDateTime:
        order.screening?.startDateTime ??
        order.performance?.startDateTime ??
        order.event?.startDateTime ??
        null,
      venueName: order.event?.venue?.name ?? null,
    }
  },

  /** Flatten one populated order into its sanitized ticket views. */
  toTicketViews(order: PopulatedOrder): TicketView[] {
    const tickets = Array.isArray(order.tickets) ? order.tickets : []
    return tickets.map((ticket) => this.toTicketView(order, ticket))
  },

  /**
   * All tickets of the caller's PAID orders (Story 6.4).
   *
   * Scoped by the JWT-derived `userId` only — never by an id from the request —
   * so a caller can only ever read their own tickets.
   *
   * Explicitly unbounded via a TOP-LEVEL `limit: -1`. This is the shape the
   * Document Service actually understands: `@strapi/utils`' query-param
   * transformer takes `limit`/`start` at the top level and has no `pagination`
   * key at all, so a nested `pagination: { limit: -1 }` is an unrecognized
   * property that is spread through to the db query untouched — it reads as an
   * intent that is never applied. `limit: -1` converts to "no limit", so a
   * frequent buyer cannot silently lose older orders from "Mes Billets".
   * Sorted by `purchasedAt` with
   * `createdAt` as the tie-break, because a paid order whose `purchasedAt` was
   * never written (legacy/self-healed row) sorts arbitrarily on its own.
   */
  async findTicketsForUser(userId: string): Promise<TicketView[]> {
    if (!userId) return []

    const orders = (await strapi.documents(ORDER_UID).findMany({
      filters: { user: { documentId: userId }, paymentStatus: "paid" },
      populate: TICKET_VIEW_POPULATE,
      sort: ["purchasedAt:desc", "createdAt:desc"],
      limit: -1,
    })) as unknown as PopulatedOrder[]

    return (orders ?? []).flatMap((order) => this.toTicketViews(order))
  },

  /**
   * One order's tickets, authorized by owner-JWT or the guest access token.
   *
   * An unknown order number and a wrong token both raise the SAME `FORBIDDEN`,
   * so the endpoint is not an order-number enumeration oracle. The token
   * compare is constant-time.
   */
  async findTicketsForOrder(
    orderNumber: string,
    auth: { userId?: string; accessToken?: string }
  ): Promise<TicketView[]> {
    const orders = (await strapi.documents(ORDER_UID).findMany({
      filters: { orderNumber },
      populate: TICKET_VIEW_POPULATE,
    })) as unknown as PopulatedOrder[]

    const order = orders?.[0]
    if (!order) {
      // Indistinguishable from a wrong token — no enumeration oracle.
      throw codedError("Not allowed to read these tickets", FORBIDDEN)
    }

    const isOwner =
      !!auth.userId && !!order.user?.documentId
        ? order.user.documentId === auth.userId
        : false
    const hasToken = timingSafeCompare(auth.accessToken, order.accessToken)

    if (!isOwner && !hasToken) {
      throw codedError("Not allowed to read these tickets", FORBIDDEN)
    }

    return this.toTicketViews(order)
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
