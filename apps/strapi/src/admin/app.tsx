import type { StrapiApp } from "@strapi/strapi/admin"

import { cs } from "./cs"

export default {
  config: {
    locales: ["en", "fr", "ar"],
    translations: {
      cs,
    },
  },
  bootstrap(_app: StrapiApp) {},
}
