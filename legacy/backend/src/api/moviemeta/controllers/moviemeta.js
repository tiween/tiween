'use strict';

/**
 *  moviemeta controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::moviemeta.moviemeta', ({ strapi }) => ({
  findByTMDBID: async ctx => {
    const { tmdbid } = ctx.params;
    console.log('tmdbid', tmdbid)
    const results = await strapi.entityService.findMany(
      'api::moviemeta.moviemeta',
      {
        filters: {
          tmdbid
        }
        
      })
    console.log('results', results)
    return results[0];
  }
})
);
