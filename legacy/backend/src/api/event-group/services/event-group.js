"use strict"

/**
 * event-group service.
 */

const { createCoreService } = require("@strapi/strapi").factories

module.exports = createCoreService("api::event-group.event-group")
