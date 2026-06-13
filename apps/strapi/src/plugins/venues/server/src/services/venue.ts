import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const

const venueService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find all venues with optional locale
   */
  async findVenues(locale?: string) {
    return strapi.documents(VENUE_UID).findMany({
      locale,
      sort: [{ name: "asc" }],
      populate: {
        geo: true,
      },
    })
  },

  /**
   * Find a single venue by documentId
   */
  async findVenue(documentId: string, locale?: string) {
    return strapi.documents(VENUE_UID).findOne({
      documentId,
      locale,
      populate: {
        geo: true,
        events: true,
      },
    })
  },
})

export default venueService
