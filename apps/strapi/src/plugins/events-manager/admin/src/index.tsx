import { Calendar } from "@strapi/icons"

import { PLUGIN_ID } from "./pluginId"

export default {
  register(app: any) {
    // Main plugin menu link
    app.addMenuLink({
      to: `/plugins/${PLUGIN_ID}`,
      icon: Calendar,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Events Manager",
      },
      permissions: [],
      Component: async () => {
        const component = await import(
          /* webpackChunkName: "events-manager" */ "./pages/App"
        )
        return component
      },
    })

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    })
  },

  bootstrap(app: any) {
    // Add sub-navigation links in the plugin settings
    app.addSettingsLink("global", {
      intlLabel: {
        id: `${PLUGIN_ID}.settings.link`,
        defaultMessage: "Events Manager",
      },
      id: PLUGIN_ID,
      to: `/plugins/${PLUGIN_ID}`,
      Component: async () => {
        const component = await import("./pages/App")
        return component
      },
    })
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          )
          return { data, locale }
        } catch {
          return { data: {}, locale }
        }
      })
    )
  },
}
