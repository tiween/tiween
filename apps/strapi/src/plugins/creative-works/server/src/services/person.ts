import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "creative-works"
const PERSON_UID = `plugin::${PLUGIN_ID}.person`

const personService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Search persons by name
   */
  async search(query: string, limit = 20) {
    return strapi.documents(PERSON_UID).findMany({
      filters: {
        name: { $containsi: query },
      },
      limit,
      populate: ["photo"],
    })
  },

  /**
   * Get person with full details
   */
  async findOneWithDetails(documentId: string) {
    return strapi.documents(PERSON_UID).findOne({
      documentId,
      populate: ["photo"],
    })
  },
})

export default personService
