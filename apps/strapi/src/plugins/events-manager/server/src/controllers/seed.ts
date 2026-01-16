import type { Core } from "@strapi/strapi"

const seedController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async seed(ctx) {
    try {
      const seedService = strapi.plugin("events-manager").service("seed")
      const results = await seedService.seedAll()

      ctx.body = {
        success: true,
        message: "Seed completed successfully",
        data: results,
      }
    } catch (error) {
      strapi.log.error("[seed] Error during seeding:", error)
      ctx.throw(500, "Failed to seed data")
    }
  },

  async seedVenues(ctx) {
    try {
      const seedService = strapi.plugin("events-manager").service("seed")
      const results = await seedService.seedVenues()

      ctx.body = {
        success: true,
        message: "Venues seeded successfully",
        data: results,
      }
    } catch (error) {
      strapi.log.error("[seed] Error seeding venues:", error)
      ctx.throw(500, "Failed to seed venues")
    }
  },

  async seedEventGroups(ctx) {
    try {
      const seedService = strapi.plugin("events-manager").service("seed")
      const results = await seedService.seedEventGroups()

      ctx.body = {
        success: true,
        message: "Event groups seeded successfully",
        data: results,
      }
    } catch (error) {
      strapi.log.error("[seed] Error seeding event groups:", error)
      ctx.throw(500, "Failed to seed event groups")
    }
  },
})

export default seedController
