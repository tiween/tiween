import type { Core } from "@strapi/strapi"

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  // Bootstrap phase - runs after register
  strapi.log.info("Events Manager plugin bootstrapped")
}

export default bootstrap
