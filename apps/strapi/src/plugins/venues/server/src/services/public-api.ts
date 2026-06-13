import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const

/**
 * Public API facade — the ONLY sanctioned cross-plugin entry point for the
 * venues plugin (architecture amendment D8, rules R3/R4). Other plugins call
 * `strapi.plugin("venues").service("public-api")`; internal services
 * (`venue`, `seed`) are private by convention.
 */
const publicApiService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find a single venue by documentId. Typed passthrough to the internal
   * venue service.
   */
  async findVenue(documentId: string, locale?: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenue(documentId, locale)
  },
})

export default publicApiService
