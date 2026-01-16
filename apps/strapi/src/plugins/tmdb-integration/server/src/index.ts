import config from "./config"
import controllers from "./controllers"
import routes from "./routes"
import services from "./services"

export default {
  register({ strapi }) {
    strapi.log.info("[tmdb-integration] Plugin registered")
  },

  bootstrap({ strapi }) {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      strapi.log.warn(
        "[tmdb-integration] TMDB_API_KEY is not set. TMDB services will not work."
      )
    } else {
      strapi.log.info("[tmdb-integration] TMDB API configured")
    }
  },

  destroy() {},

  config,
  controllers,
  routes,
  services,
}
