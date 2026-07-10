import type { Core } from "@strapi/strapi"

import config from "./config"
import controllers from "./controllers"
import routes from "./routes"
import services from "./services"

/**
 * Payments plugin (Story 6.3) — an Anti-Corruption Layer around the Konnect
 * Network API. Owns NO content types; exposes a `public-api` facade plus a
 * public webhook route. Depends on nothing (R5).
 */
export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.log.info("[payments] Plugin registered")
  },

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    if (!process.env.KONNECT_API_KEY || !process.env.KONNECT_WALLET_ID) {
      strapi.log.warn(
        "[payments] KONNECT_API_KEY / KONNECT_WALLET_ID not set. Konnect payments will not work until configured."
      )
    } else {
      strapi.log.info("[payments] Konnect API configured")
    }
  },

  destroy() {},

  config,
  controllers,
  routes,
  services,
}
