import type { Core } from "@strapi/strapi"

export default async ({ strapi }: { strapi: Core.Strapi }) => {
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
