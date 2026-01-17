import type { Core } from "@strapi/strapi"

const geographyService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find all regions with optional locale
   */
  async findRegions(locale?: string) {
    return strapi.documents("plugin::geography.region").findMany({
      locale,
      sort: [{ name: "asc" }],
      populate: {
        cities: {
          sort: [{ name: "asc" }],
        },
      },
    })
  },

  /**
   * Find a single region by documentId
   */
  async findRegion(documentId: string, locale?: string) {
    return strapi.documents("plugin::geography.region").findOne({
      documentId,
      locale,
      populate: {
        cities: {
          sort: [{ name: "asc" }],
        },
      },
    })
  },

  /**
   * Find all cities with optional region filter
   */
  async findCities(regionDocumentId?: string, locale?: string) {
    const filters = regionDocumentId
      ? { region: { documentId: { $eq: regionDocumentId } } }
      : {}

    return strapi.documents("plugin::geography.city").findMany({
      locale,
      filters,
      sort: [{ name: "asc" }],
      populate: {
        region: true,
      },
    })
  },

  /**
   * Find a single city by documentId
   */
  async findCity(documentId: string, locale?: string) {
    return strapi.documents("plugin::geography.city").findOne({
      documentId,
      locale,
      populate: {
        region: true,
      },
    })
  },
})

export default {
  geography: geographyService,
}
