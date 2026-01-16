import type { Core } from "@strapi/strapi"

const watchlistController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    const { user } = ctx.state

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    const items = await strapi
      .plugin("user-engagement")
      .service("watchlist")
      .getUserWatchlist(user.documentId)

    ctx.body = { data: items }
  },

  async add(ctx: any) {
    const { user } = ctx.state
    const { creativeWorkId } = ctx.request.body

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    if (!creativeWorkId) {
      return ctx.badRequest("Missing creativeWorkId")
    }

    const item = await strapi
      .plugin("user-engagement")
      .service("watchlist")
      .add(user.documentId, creativeWorkId)

    ctx.body = { data: item }
  },

  async remove(ctx: any) {
    const { user } = ctx.state
    const { creativeWorkId } = ctx.params

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    const removed = await strapi
      .plugin("user-engagement")
      .service("watchlist")
      .remove(user.documentId, creativeWorkId)

    ctx.body = { removed }
  },

  async toggle(ctx: any) {
    const { user } = ctx.state
    const { creativeWorkId } = ctx.request.body

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    if (!creativeWorkId) {
      return ctx.badRequest("Missing creativeWorkId")
    }

    const result = await strapi
      .plugin("user-engagement")
      .service("watchlist")
      .toggle(user.documentId, creativeWorkId)

    ctx.body = result
  },

  async check(ctx: any) {
    const { user } = ctx.state
    const { creativeWorkId } = ctx.params

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    const isInWatchlist = await strapi
      .plugin("user-engagement")
      .service("watchlist")
      .isInWatchlist(user.documentId, creativeWorkId)

    ctx.body = { isInWatchlist }
  },
})

export default watchlistController
