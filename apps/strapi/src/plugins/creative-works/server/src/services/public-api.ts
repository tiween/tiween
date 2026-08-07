import type { Core } from "@strapi/strapi"
import type { CreateWorkInput } from "./creative-work"

const PLUGIN_ID = "creative-works"

/**
 * Public API facade — the ONLY sanctioned cross-plugin entry point for the
 * creative-works plugin (architecture amendment D8, rules R3/R4). Other
 * plugins call `strapi.plugin("creative-works").service("public-api")`;
 * internal services (`creative-work`, `person`) are private by convention.
 *
 * First consumer: events-manager's venue event-creation surface (Story 7.3),
 * which searches or creates the catalog entry an event's showtimes reference.
 */
const publicApiService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Search catalog entries by title. Passthrough to the internal service. */
  async searchWorks(query: string, limit = 20) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("creative-work")
      .search(query, limit)
  },

  /** Find one catalog entry with details, or null. */
  async findWork(documentId: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("creative-work")
      .findOneWithDetails(documentId)
  },

  /**
   * Create AND publish a catalog entry (localized fields replicated to every
   * configured locale). See `creative-work.createWork` for the rationale.
   */
  async createWork(input: CreateWorkInput, locale?: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("creative-work")
      .createWork(input, locale)
  },
})

export default publicApiService
