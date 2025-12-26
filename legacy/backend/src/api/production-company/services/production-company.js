'use strict';

/**
 * production-company service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::production-company.production-company');
