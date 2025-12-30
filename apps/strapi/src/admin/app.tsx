import type { StrapiApp } from "@strapi/strapi/admin"

import { cs } from "./cs"

import "@tiween/design-system/styles.css"

import InternalJobs from "./extensions/InternalJobs"

export default {
  config: {
    locales: ["en", "fr", "ar"],
    translations: {
      cs,
    },
  },
  bootstrap(app: StrapiApp) {
    app.getPlugin("content-manager").injectComponent("listView", "actions", {
      name: "InternalJobs",
      Component: InternalJobs,
    })
  },
}
