import type { Core } from "@strapi/strapi"

/**
 * Schedule-notification HTTP surface (Story 5.6). Every handler is JWT-self-
 * scoped: it guards `ctx.state.user` and delegates to the service with the
 * caller's `documentId`, mirroring the `watchlist` controller shape. The
 * `is-owner` policy also gates each route.
 */
const notificationController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    const { user } = ctx.state

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    const data = await strapi
      .plugin("user-engagement")
      .service("notification")
      .listForUser(user.documentId)

    ctx.body = { data }
  },

  async unreadCount(ctx: any) {
    const { user } = ctx.state

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    const count = await strapi
      .plugin("user-engagement")
      .service("notification")
      .unreadCount(user.documentId)

    ctx.body = { count }
  },

  async markAllRead(ctx: any) {
    const { user } = ctx.state

    if (!user) {
      return ctx.unauthorized("Must be logged in")
    }

    const result = await strapi
      .plugin("user-engagement")
      .service("notification")
      .markAllRead(user.documentId)

    ctx.body = result
  },
})

export default notificationController
