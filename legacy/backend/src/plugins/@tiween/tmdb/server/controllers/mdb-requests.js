"use strict"

module.exports = {
  async searchMovies(ctx) {
    const { q } = ctx.query
    if (q) {
      try {
        const results = await strapi
          .plugin("tmdb")
          .service("mdb-requests")
          .searchMovies(q)
        return results
      } catch (err) {
        ctx.throw(500, err)
      }
    }
  },
}
