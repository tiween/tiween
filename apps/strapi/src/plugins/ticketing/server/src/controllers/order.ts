import type { Core } from "@strapi/strapi"

/** Map an error CODE to an HTTP status; unknown codes → 500. */
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  INVALID_ORDER: 400,
  TICKET_SOLD_OUT: 409,
  INVENTORY_UNDERFLOW: 409,
  KONNECT_UNAVAILABLE: 502,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  QR_SIGNING_UNAVAILABLE: 500,
}

/**
 * Emit a uniform Strapi error envelope carrying the SCREAMING_SNAKE code in
 * `error.details.code` (error CODES, not prose — the client translates it).
 */
function respondError(ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "CheckoutError",
      // Never echo an internal exception message — it can leak stack/DB/query
      // detail. The client translates `error.details.code`, not this prose, so
      // a static message is safe for both mapped and unmapped errors.
      message: "Checkout failed",
      // Only surface a recognized code; anything unmapped is an internal 500.
      details: { code: mappedStatus ? code : "INTERNAL_ERROR" },
    },
  }
}

/**
 * Mark a ticket-read response as uncacheable.
 *
 * These bodies carry signed entry credentials (`qrCode`) and are authorized by
 * a request HEADER — the JWT for `my-tickets`, `x-order-access-token` for
 * `order-tickets`. Every hop in front of Strapi (the Next proxy, any CDN) keys
 * its cache on the URL, not on those headers, so without this a shared
 * `/order-tickets/TW-…` URL could hand one buyer's QR to the next requester.
 * `Vary` alone would be too fragile to rely on for a credential.
 */
function noStore(ctx: any): void {
  ctx.set("Cache-Control", "private, no-store")
  ctx.set("Vary", "Authorization, x-order-access-token")
}

const orderController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * POST /orders — create an order + initialize a Konnect payment (Story 6.3).
   *
   * Guest-capable: `userId` is derived server-side from the authenticated JWT
   * (`ctx.state.user`) and never trusted from the body. Returns
   * `{ orderNumber, payUrl, accessToken }`: `payUrl` is where the browser
   * redirects, and `accessToken` is the guest's ONLY future authorization to
   * read this order's tickets (Story 6.4) — the client stores it locally before
   * leaving, and it is never put in the redirect URL.
   */
  async create(ctx: any) {
    const body = { ...(ctx.request?.body ?? {}) }
    // Never trust a client-sent userId; derive from the validated JWT if present.
    delete body.userId
    const userId = ctx.state?.user?.documentId
    if (userId) {
      body.userId = userId
    }

    try {
      const result = await strapi
        .plugin("ticketing")
        .service("order")
        .initCheckout(body)
      ctx.body = { data: result }
    } catch (err) {
      respondError(ctx, err)
    }
  },

  /**
   * POST /orders/:orderNumber/confirm — client-triggered reconciliation
   * (Story 6.3). Idempotent; covers webhook lag/loss.
   */
  async confirm(ctx: any) {
    const { orderNumber } = ctx.params

    if (!orderNumber) {
      return ctx.badRequest("Missing order number")
    }

    try {
      const result = await strapi
        .plugin("ticketing")
        .service("order")
        .reconcileFromGateway(orderNumber)
      ctx.body = { data: result }
    } catch (err) {
      respondError(ctx, err)
    }
  },

  /**
   * GET /my-tickets — the caller's own tickets (Story 6.4).
   *
   * Self-scoped: the user is taken from the validated JWT (`ctx.state.user`),
   * never from the request, so there is no id a caller could forge. Returns
   * sanitized ticket views only.
   */
  async myTickets(ctx: any) {
    const userId = ctx.state?.user?.documentId
    if (!userId) {
      return respondError(ctx, { code: "UNAUTHORIZED" })
    }

    try {
      const data = await strapi
        .plugin("ticketing")
        .service("order")
        .findTicketsForUser(userId)
      noStore(ctx)
      ctx.body = { data }
    } catch (err) {
      respondError(ctx, err)
    }
  },

  /**
   * GET /order-tickets/:orderNumber — a single order's tickets
   * (Story 6.4). Guest-capable: authorized either by the owner's JWT or by the
   * per-order access token issued at checkout. A wrong token and an unknown
   * order number both answer 403 `FORBIDDEN` (no enumeration oracle).
   *
   * Deliberately NOT mounted under `/orders` — the Next proxy allow-list
   * matches by prefix, and `GET api/ticketing/orders/:orderNumber` was dropped
   * from that allow-list in Story 6.3 for leaking guest PII (the Strapi route
   * itself still exists, see `findByOrderNumber` below).
   *
   * The access token travels in the `x-order-access-token` HEADER, never in the
   * query string: a URL is written verbatim into Next, Strapi and CDN access
   * logs, and this token is a never-expiring bearer credential.
   */
  async orderTickets(ctx: any) {
    const { orderNumber } = ctx.params

    if (!orderNumber) {
      return ctx.badRequest("Missing order number")
    }

    // A repeated header arrives as an array; only a single string can ever be a
    // token.
    const rawToken = ctx.request?.header?.["x-order-access-token"]
    const accessToken = typeof rawToken === "string" ? rawToken : undefined

    try {
      const data = await strapi
        .plugin("ticketing")
        .service("order")
        .findTicketsForOrder(orderNumber, {
          userId: ctx.state?.user?.documentId,
          accessToken,
        })
      noStore(ctx)
      ctx.body = { data }
    } catch (err) {
      respondError(ctx, err)
    }
  },

  /**
   * GET /orders/:orderNumber — minimal public order status.
   *
   * This route is PUBLIC (`policies: []`) and keyed by a short, guessable order
   * number, so the response is an explicit ALLOW-LIST projection. A custom
   * controller does NOT run `sanitize.contentAPI.output`, so `private: true` on
   * `accessToken` / `qrCode` / `qrNonce` strips nothing here — returning the
   * populated document would hand out the order access token, every ticket's
   * signed QR + nonce, and the buyer's PII. Never add a field to this object
   * without checking it is safe for an anonymous caller.
   *
   * Not reachable through the Next public proxy either: Story 6.3's review
   * dropped `GET api/ticketing/orders` from `ALLOWED_STRAPI_ENDPOINTS`.
   */
  async findByOrderNumber(ctx: any) {
    const { orderNumber } = ctx.params

    if (!orderNumber) {
      return ctx.badRequest("Missing order number")
    }

    const order = await strapi
      .plugin("ticketing")
      .service("order")
      .findByOrderNumber(orderNumber)

    if (!order) {
      return ctx.notFound("Order not found")
    }

    ctx.body = {
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        currency: order.currency,
        totalAmount: order.totalAmount,
        purchasedAt: order.purchasedAt ?? null,
        // A count only — ticket rows carry the signed QR credential.
        ticketCount: Array.isArray(order.tickets) ? order.tickets.length : 0,
      },
    }
  },
})

export default orderController
