import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "creative-works"
const CREATIVE_WORK_UID = `plugin::${PLUGIN_ID}.creative-work`

const creativeWorkService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find featured creative works
   */
  async findFeatured(limit = 10) {
    return strapi.documents(CREATIVE_WORK_UID).findMany({
      limit,
      populate: ["poster", "genres", "directors"],
    })
  },

  /**
   * Find creative works by type
   */
  async findByType(
    type: "film" | "play" | "short-film" | "concert" | "exhibition",
    limit = 20
  ) {
    return strapi.documents(CREATIVE_WORK_UID).findMany({
      filters: { type },
      limit,
      populate: ["poster", "genres"],
    })
  },

  /**
   * Search creative works by title
   */
  async search(query: string, limit = 20) {
    return strapi.documents(CREATIVE_WORK_UID).findMany({
      filters: {
        $or: [
          { title: { $containsi: query } },
          { originalTitle: { $containsi: query } },
        ],
      },
      limit,
      populate: ["poster", "genres"],
    })
  },

  /**
   * Get creative work with full details
   */
  async findOneWithDetails(documentId: string) {
    return strapi.documents(CREATIVE_WORK_UID).findOne({
      documentId,
      populate: [
        "poster",
        "backdrop",
        "photos",
        "genres",
        "directors",
        "cast",
        "crew",
        "videos",
        "facts",
        "links",
      ],
    })
  },
})

export default creativeWorkService
