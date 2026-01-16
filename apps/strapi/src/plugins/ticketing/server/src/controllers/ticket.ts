import type { Core } from "@strapi/strapi"

const ticketController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async validate(ctx: any) {
    const { ticketNumber } = ctx.params

    if (!ticketNumber) {
      return ctx.badRequest("Missing ticket number")
    }

    const result = await strapi
      .plugin("ticketing")
      .service("ticket")
      .validate(ticketNumber)

    ctx.body = result
  },

  async scan(ctx: any) {
    const { ticketId } = ctx.params

    if (!ticketId) {
      return ctx.badRequest("Missing ticket ID")
    }

    // First validate
    const validation = await strapi
      .plugin("ticketing")
      .service("ticket")
      .validate(ctx.params.ticketNumber || ticketId)

    if (!validation.valid) {
      return ctx.badRequest(validation.error)
    }

    // Then scan
    const ticket = await strapi
      .plugin("ticketing")
      .service("ticket")
      .scan(ticketId)

    ctx.body = { message: "Ticket scanned successfully", ticket }
  },
})

export default ticketController
