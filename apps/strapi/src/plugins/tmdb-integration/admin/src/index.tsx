const PLUGIN_ID = "tmdb-integration"

export default {
  register() {
    // No admin UI for this plugin - it's a service-only plugin
  },

  bootstrap() {},

  async registerTrads({ locales }: { locales: string[] }) {
    return locales.map((locale) => ({ data: {}, locale }))
  },
}

export { PLUGIN_ID }
