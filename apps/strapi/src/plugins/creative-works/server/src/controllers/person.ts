import type { Core } from "@strapi/strapi"

const personController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async search(ctx: any) {
    const { q } = ctx.query
    const limit = ctx.query.limit || 20

    if (!q) {
      return ctx.badRequest("Missing search query")
    }

    const data = await strapi
      .plugin("creative-works")
      .service("person")
      .search(q, limit)

    ctx.body = { data }
  },
})

export default personController
