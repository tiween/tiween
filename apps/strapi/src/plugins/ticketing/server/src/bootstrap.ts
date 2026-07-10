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

  // Generate QR codes for tickets on creation
  strapi.db.lifecycles.subscribe({
    models: ["plugin::ticketing.ticket"],
    async afterCreate(event) {
      const { result } = event

      // Generate QR code data
      const qrData = strapi
        .plugin("ticketing")
        .service("ticket")
        .generateQRData(result)

      // Update the ticket with QR code
      await strapi.documents("plugin::ticketing.ticket").update({
        documentId: result.documentId,
        data: { qrCode: qrData },
      })
    },
  })
}
