'use strict';

/**
 * event-group router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::event-group.event-group');
