import type { Core } from "@strapi/strapi"

const geographyController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /geography/regions
   * Returns all regions with their cities
   */
  async findRegions(ctx) {
    const { locale } = ctx.query
    const regions = await strapi
      .plugin("geography")
      .service("geography")
      .findRegions(locale)

    ctx.body = {
      data: regions,
      meta: {
        pagination: {
          total: regions.length,
        },
      },
    }
  },

  /**
   * GET /geography/regions/:documentId
   * Returns a single region by documentId
   */
  async findRegion(ctx) {
    const { documentId } = ctx.params
    const { locale } = ctx.query

    const region = await strapi
      .plugin("geography")
      .service("geography")
      .findRegion(documentId, locale)

    if (!region) {
      return ctx.notFound("Region not found")
    }

    ctx.body = {
      data: region,
      meta: {},
    }
  },

  /**
   * GET /geography/cities
   * Returns all cities with optional region filter
   */
  async findCities(ctx) {
    const { locale, region: regionDocumentId } = ctx.query
    const cities = await strapi
      .plugin("geography")
      .service("geography")
      .findCities(regionDocumentId, locale)

    ctx.body = {
      data: cities,
      meta: {
        pagination: {
          total: cities.length,
        },
      },
    }
  },

  /**
   * GET /geography/cities/:documentId
   * Returns a single city by documentId
   */
  async findCity(ctx) {
    const { documentId } = ctx.params
    const { locale } = ctx.query

    const city = await strapi
      .plugin("geography")
      .service("geography")
      .findCity(documentId, locale)

    if (!city) {
      return ctx.notFound("City not found")
    }

    ctx.body = {
      data: city,
      meta: {},
    }
  },
})

export default {
  geography: geographyController,
}
