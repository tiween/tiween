const PLUGIN_ID = "payments"

export default {
  register() {
    // No admin UI for this plugin - it's a service-only ACL plugin.
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

export { PLUGIN_ID }
