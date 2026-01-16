import { Play } from "@strapi/icons"

import { PLUGIN_ID } from "./pluginId"

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${PLUGIN_ID}`,
      icon: Play,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Creative Works",
      },
      permissions: [],
      Component: async () => {
        const component = await import(
          /* webpackChunkName: "creative-works" */ "./pages/App"
        )
        return component
      },
    })

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    })
  },

  bootstrap() {},

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
