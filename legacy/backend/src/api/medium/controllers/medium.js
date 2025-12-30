"use strict"

/**
 *  medium controller
 */

const { createCoreController } = require("@strapi/strapi").factories

module.exports = createCoreController("api::medium.medium", ({ strapi }) => ({
  async autocomplete(ctx, next) {
    try {
      const mediums = await strapi.service("api::medium.medium").find(ctx.query)
      return mediums.map((oneMedium) => {
        return {
          value: oneMedium._id,
          label: oneMedium.name,
        }
      })
    } catch (err) {
      ctx.body = err
    }
  },
}))
