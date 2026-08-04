import type { Core } from "@strapi/strapi"

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Decoupled webhook -> ticketing hop (Story 6.3). The `payments` plugin emits
  // `payments.payment.resolved` from its Konnect webhook (it never imports
  // ticketing); ticketing subscribes here and runs the idempotent reconcile.
  strapi.eventHub.on(
    "payments.payment.resolved",
    async (payload: {
      orderId?: string
      status?: string
      paymentRef?: string
    }) => {
      const orderNumber = payload?.orderId
      if (!orderNumber) return
      try {
        await strapi
          .plugin("ticketing")
          .service("order")
          .reconcileFromGateway(orderNumber)
      } catch (err) {
        strapi.log.error(
          `[ticketing] reconcile from webhook failed for ${orderNumber}: ${(err as Error)?.message}`
        )
      }
    }
  )

  // NOTE (Story 6.4): there is deliberately NO `ticket` afterCreate lifecycle
  // here. Tickets are created at order time — i.e. BEFORE payment — so issuing
  // a QR there would hand a valid-looking entry credential to abandoned and
  // failed orders. Issuance now hangs off the exactly-once `paid` transition in
  // `order.reconcileFromGateway` instead.
}
