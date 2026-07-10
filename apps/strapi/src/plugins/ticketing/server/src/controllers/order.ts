import type { Core } from "@strapi/strapi"

/** Map an error CODE to an HTTP status; unknown codes → 500. */
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  INVALID_ORDER: 400,
  TICKET_SOLD_OUT: 409,
  KONNECT_UNAVAILABLE: 502,
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

const orderController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * POST /orders — create an order + initialize a Konnect payment (Story 6.3).
   *
   * Guest-capable: `userId` is derived server-side from the authenticated JWT
   * (`ctx.state.user`) and never trusted from the body. Returns
   * `{ orderNumber, payUrl }` for the browser to redirect to.
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

    ctx.body = { data: order }
  },
})

export default orderController
