import type { Core } from "@strapi/strapi"

import { registerCreditSubscriber } from "./lifecycles/credit"

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  // Bootstrap phase - runs after register
  registerCreditSubscriber({ strapi })

  strapi.log.info("Events Manager plugin bootstrapped")
}

export default bootstrap
