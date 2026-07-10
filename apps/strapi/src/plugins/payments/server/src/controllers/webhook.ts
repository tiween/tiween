import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "payments"

/** Event name ticketing subscribes to (decoupled webhook -> ticketing hop). */
export const PAYMENT_RESOLVED_EVENT = "payments.payment.resolved"

/**
 * Konnect webhook controller (Story 6.3).
 *
 * Konnect's webhook is an UNSIGNED notification (`?payment_ref=…`). "Signature
 * verification" is satisfied by re-querying Konnect server-to-server for the
 * authoritative status (plus an optional shared-secret token check). This
 * controller never imports or calls ticketing — it emits a generic
 * `payments.payment.resolved` event that ticketing's bootstrap subscribes to,
 * keeping `payments` dependency-free (R5) and the graph acyclic.
 */
const webhookController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async handle(ctx: any) {
    const paymentRef =
      (ctx.query?.payment_ref as string | undefined) ??
      (ctx.request?.body?.payment_ref as string | undefined)

    if (!paymentRef) {
      // Acknowledge with 200 so Konnect does not retry a malformed hit, but do
      // nothing (never trust the body; nothing to reconcile without a ref).
      ctx.status = 200
      ctx.body = { received: true }
      return
    }

    // Optional shared-secret gate. Only enforced when configured.
    const expectedSecret = strapi.config.get(
      `plugin::${PLUGIN_ID}.webhookSecret`,
      ""
    ) as string
    if (expectedSecret) {
      const provided =
        (ctx.query?.token as string | undefined) ??
        (ctx.request?.headers?.["x-webhook-secret"] as string | undefined)
      if (provided !== expectedSecret) {
        ctx.status = 401
        ctx.body = { error: { details: { code: "UNAUTHORIZED_WEBHOOK" } } }
        return
      }
    }

    try {
      const { status, orderId } = await strapi
        .plugin(PLUGIN_ID)
        .service("public-api")
        .getPaymentStatus(paymentRef)

      // Decouple to ticketing via the event hub. `orderId` is our order number.
      await strapi.eventHub.emit(PAYMENT_RESOLVED_EVENT, {
        orderId,
        status,
        paymentRef,
      })
    } catch (err) {
      strapi.log.error(
        `[payments] webhook reconcile failed for ${paymentRef}: ${(err as Error)?.message}`
      )
      // Still 200 the webhook: the client-triggered confirm is the backstop and
      // Konnect retries are not needed once we own idempotent reconciliation.
    }

    ctx.status = 200
    ctx.body = { received: true }
  },
})

export default webhookController
