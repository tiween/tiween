"use strict"

module.exports = {
  async syncWithTMDB(ctx) {
    const { tmdbid, moviemetaId } = ctx.request.body

    if (tmdbid) {
      try {
        const results = await strapi
          .plugin("tmdb")
          .service("mdb-requests")
          .fetchMovie(tmdbid)

        if (results) {
          return strapi.entityService.update(
            "api::moviemeta.moviemeta",
            moviemetaId,
            {
              data: {
                remote: JSON.stringify(results),
              },
            }
          )
        }
      } catch (err) {
        ctx.throw(500, err)
      }
    }
  },
}
