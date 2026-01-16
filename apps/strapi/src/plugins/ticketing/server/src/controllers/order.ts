import type { Core } from "@strapi/strapi"

const orderController = ({ strapi }: { strapi: Core.Strapi }) => ({
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
