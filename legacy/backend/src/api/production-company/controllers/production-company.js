"use strict"

/**
 *  production-company controller
 */

const { createCoreController } = require("@strapi/strapi").factories

module.exports = createCoreController(
  "api::production-company.production-company"
)
