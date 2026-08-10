import { Store } from "@strapi/icons"

import { VENUES_MENU_PERMISSIONS } from "./permissions"
import { PLUGIN_ID } from "./pluginId"

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${PLUGIN_ID}`,
      icon: Store,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Venues",
      },
      // Only a role granted `plugin::venues.read` (the action registered in
      // `server/src/register.ts`) sees the menu entry at all. An empty array —
      // the placeholder this replaced — showed the link to every admin user and
      // then answered 403 on the first request, which reads as a broken plugin
      // rather than as a missing permission.
      permissions: [...VENUES_MENU_PERMISSIONS],
      Component: async () => {
        const component = await import(
          /* webpackChunkName: "venues" */ "./pages/App"
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
