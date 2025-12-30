/**
 * A set of functions called "actions" for `settings`
 */

module.exports = {
  get: async (ctx) => {
    try {
      const settings = await strapi
        .plugin("tmdb")
        .service("settings")
        .getSettings()

      ctx.body = settings
    } catch (err) {
      ctx.throw(500, err)
    }
  },
  set: async (ctx) => {
    const { body } = ctx.request
    try {
      await strapi.plugin("tmdb").service("settings").setSettings(body)
      ctx.body = await strapi.plugin("tmdb").service("settings").getSettings()
    } catch (err) {
      ctx.throw(500, err)
    }
  },
}
