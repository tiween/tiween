import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"

const venueController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /venues
   * Returns all venues
   */
  async findVenues(ctx) {
    const { locale } = ctx.query
    const venues = await strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenues(locale)

    ctx.body = {
      data: venues,
      meta: {
        pagination: {
          total: venues.length,
        },
      },
    }
  },

  /**
   * GET /venues/:documentId
   * Returns a single venue by documentId
   */
  async findVenue(ctx) {
    const { documentId } = ctx.params
    const { locale } = ctx.query

    const venue = await strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenue(documentId, locale)

    if (!venue) {
      return ctx.notFound("Venue not found")
    }

    ctx.body = {
      data: venue,
      meta: {},
    }
  },
})

const seedController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async seedVenues(ctx) {
    try {
      const results = await strapi
        .plugin(PLUGIN_ID)
        .service("seed")
        .seedVenues()

      ctx.body = {
        success: true,
        message: "Venues seeded successfully",
        data: results,
      }
    } catch (error) {
      strapi.log.error("[venues:seed] Error seeding venues:", error)
      ctx.throw(500, "Failed to seed venues")
    }
  },
})

export default {
  venue: venueController,
  seed: seedController,
}
