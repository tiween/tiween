import type { Core } from "@strapi/strapi"

const creativeWorkController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async findFeatured(ctx: any) {
    const limit = ctx.query.limit || 10
    const data = await strapi
      .plugin("creative-works")
      .service("creative-work")
      .findFeatured(limit)

    ctx.body = { data }
  },

  async findByType(ctx: any) {
    const { type } = ctx.params
    const limit = ctx.query.limit || 20

    if (!type) {
      return ctx.badRequest("Missing type parameter")
    }

    const data = await strapi
      .plugin("creative-works")
      .service("creative-work")
      .findByType(type, limit)

    ctx.body = { data }
  },

  async search(ctx: any) {
    const { q } = ctx.query
    const limit = ctx.query.limit || 20

    if (!q) {
      return ctx.badRequest("Missing search query")
    }

    const data = await strapi
      .plugin("creative-works")
      .service("creative-work")
      .search(q, limit)

    ctx.body = { data }
  },
})

export default creativeWorkController
